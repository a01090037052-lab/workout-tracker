import { db } from '../db';
import { storage } from './storage';
import { calcMacros } from './nutrition';
import type { WorkoutSession } from '../types';

export interface Insight {
  id: string;
  icon: string;
  title: string;
  text: string;
  tone: 'success' | 'warning' | 'info';
  priority: number; // 큰 값이 우선
}

function calcSessionVolume(s: WorkoutSession): number {
  return s.exercises.reduce(
    (a, ex) =>
      a + ex.sets
        .filter((set) => set.isCompleted && set.setType !== 'warmup')
        .reduce((sum, set) => sum + set.weight * set.reps, 0),
    0
  );
}

function daysAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date + 'T12:00:00').getTime()) / 86400000);
}

function inLastNDays(date: string, n: number): boolean {
  return daysAgo(date) <= n - 1;
}

/**
 * 운동/영양/체중/PR을 교차 분석해 인사이트 카드 목록 생성.
 * 모두 로컬 DB 데이터로만 (서버·AI 불필요).
 */
export async function generateInsights(): Promise<Insight[]> {
  const insights: Insight[] = [];

  // 데이터 수집 (최근 60일)
  const sessions = await db.sessions.orderBy('date').reverse().limit(60).toArray();
  const macroLogs = await db.dailyMacroLogs.orderBy('date').reverse().limit(60).toArray();
  const weightLogs = await db.bodyWeightLogs.orderBy('date').reverse().limit(60).toArray();
  const prs = await db.personalRecords.orderBy('date').reverse().limit(20).toArray();
  const conditionLogs = await db.conditionLogs.orderBy('date').reverse().limit(14).toArray();
  const profile = storage.nutritionProfile.get();

  // 이번 주 (최근 7일) / 지난 주 (8~14일 전)
  const thisWeek = sessions.filter((s) => inLastNDays(s.date, 7));
  const lastWeek = sessions.filter((s) => !inLastNDays(s.date, 7) && inLastNDays(s.date, 14));
  const thisVolume = thisWeek.reduce((a, s) => a + calcSessionVolume(s), 0);
  const lastVolume = lastWeek.reduce((a, s) => a + calcSessionVolume(s), 0);

  const thisMacroLogs = macroLogs.filter((l) => inLastNDays(l.date, 7));
  const target = profile ? calcMacros(profile, profile.goal) : null;

  // === 단백질 평균 (이번 주) ===
  let avgProteinRatio = 0; // 0이면 데이터 없음
  if (target && thisMacroLogs.length >= 3) {
    const totalProtein = thisMacroLogs.reduce((a, l) =>
      a + l.entries.reduce((s, e) => s + e.protein, 0), 0);
    const avgP = totalProtein / thisMacroLogs.length;
    avgProteinRatio = avgP / target.protein;

    if (avgProteinRatio < 0.8) {
      const gap = Math.round(target.protein - avgP);
      insights.push({
        id: 'protein_low',
        icon: '⚠',
        title: '단백질 부족',
        text: `이번 주 평균 ${Math.round(avgP)}g (목표 ${target.protein}g, ${Math.round(avgProteinRatio * 100)}%) · ${gap}g 부족`,
        tone: 'warning', priority: 9,
      });
    } else if (avgProteinRatio >= 0.95 && avgProteinRatio <= 1.15) {
      insights.push({
        id: 'protein_ok',
        icon: '✅',
        title: '단백질 잘 챙김',
        text: `이번 주 평균 ${Math.round(avgP)}g (${Math.round(avgProteinRatio * 100)}%)`,
        tone: 'success', priority: 3,
      });
    }
  }

  // === 운동 강도 변화 ===
  if (thisVolume > 0 && lastVolume > 0) {
    const diff = ((thisVolume - lastVolume) / lastVolume) * 100;
    if (diff > 8) {
      insights.push({
        id: 'volume_up',
        icon: '📈',
        title: '운동 볼륨 증가',
        text: `이번 주 ${Math.round(thisVolume).toLocaleString()}kg (+${Math.round(diff)}%)`,
        tone: 'success', priority: 5,
      });
    } else if (diff < -15) {
      insights.push({
        id: 'volume_down',
        icon: '↓',
        title: '운동 볼륨 감소',
        text: `이번 주 ${Math.round(thisVolume).toLocaleString()}kg (${Math.round(diff)}%) — 회복 필요?`,
        tone: 'info', priority: 4,
      });
    }
  }

  // === 교차: 강도 ↑ + 단백질 부족 → 회복 부족 (최고 우선순위) ===
  if (thisVolume > lastVolume * 1.1 && avgProteinRatio > 0 && avgProteinRatio < 0.8) {
    insights.push({
      id: 'recovery_risk',
      icon: '⚠',
      title: '회복 부족 위험',
      text: '운동 강도 ↑ + 단백질 부족 — 단백질 보충 우선',
      tone: 'warning', priority: 10,
    });
  }

  // === PR 정체기 ===
  if (prs.length > 0) {
    const since = daysAgo(prs[0].date);
    if (since >= 21) {
      insights.push({
        id: 'pr_stagnation',
        icon: '⏸',
        title: 'PR 정체',
        text: `${since}일째 신기록 없음 — 디로드(1주 무게 ↓) 또는 운동 변형 권장`,
        tone: 'warning', priority: 8,
      });
    } else if (since <= 3) {
      insights.push({
        id: 'pr_recent',
        icon: '🏆',
        title: '최근 PR 달성',
        text: `${since === 0 ? '오늘' : `${since}일 전`} 신기록 — 좋은 흐름`,
        tone: 'success', priority: 6,
      });
    }
  }

  // === 체중 추세 (다이어트/벌크 목표 기반) ===
  if (profile && weightLogs.length >= 7) {
    const recent7 = weightLogs.slice(0, 7);
    const prev7 = weightLogs.slice(7, 14);
    if (prev7.length >= 3 && recent7.length >= 3) {
      const recentAvg = recent7.reduce((a, w) => a + w.weight, 0) / recent7.length;
      const prevAvg = prev7.reduce((a, w) => a + w.weight, 0) / prev7.length;
      const weekDelta = recentAvg - prevAvg; // kg per week

      if (profile.goal === 'cut' || profile.goal === 'cut_aggressive') {
        if (Math.abs(weekDelta) < 0.15) {
          insights.push({
            id: 'cut_stalled',
            icon: '⏸',
            title: '체중 정체 (다이어트 중)',
            text: '2주 변화 없음 — 칼로리 기록 정직 확인 또는 −100kcal 검토',
            tone: 'warning', priority: 8,
          });
        } else if (weekDelta < -0.7) {
          insights.push({
            id: 'cut_too_fast',
            icon: '⚠',
            title: '감량 속도 너무 빠름',
            text: `주당 ${Math.abs(weekDelta).toFixed(2)}kg — 근손실 위험, 칼로리 +100~150kcal 검토`,
            tone: 'warning', priority: 7,
          });
        }
      } else if (profile.goal === 'lean_bulk' || profile.goal === 'bulk') {
        if (weekDelta < 0.1 && weekDelta > -0.1) {
          insights.push({
            id: 'bulk_stalled',
            icon: '↑',
            title: '벌크 진전 부족',
            text: '체중 변화 미미 — 탄수 +25g 또는 칼로리 +200kcal',
            tone: 'info', priority: 6,
          });
        } else if (weekDelta > 0.7) {
          insights.push({
            id: 'bulk_too_fast',
            icon: '⚠',
            title: '벌크 속도 너무 빠름',
            text: `주당 +${weekDelta.toFixed(2)}kg — 지방 누적 위험, 탄수 −25g 검토`,
            tone: 'warning', priority: 7,
          });
        }
      }
    }
  }

  // === 운동 빈도 ===
  const thisWeekDays = new Set(thisWeek.map((s) => s.date)).size;
  if (thisWeekDays === 0 && sessions.length > 0) {
    const lastDate = sessions[0].date;
    const since = daysAgo(lastDate);
    if (since >= 4) {
      insights.push({
        id: 'no_workout',
        icon: '💪',
        title: '운동 공백',
        text: `마지막 운동 ${since}일 전 — 가벼운 세션부터 재시작`,
        tone: 'info', priority: 5,
      });
    }
  } else if (thisWeekDays >= 5) {
    insights.push({
      id: 'high_frequency',
      icon: '🔥',
      title: '꾸준한 페이스',
      text: `이번 주 ${thisWeekDays}회 운동 — 회복 잘 챙기세요`,
      tone: 'success', priority: 3,
    });
  }

  // === 체중 미기록 (다이어트/벌크 중) ===
  if (profile && (profile.goal !== 'maintain') && weightLogs.length === 0) {
    insights.push({
      id: 'no_weight',
      icon: '⚖',
      title: '체중 기록 없음',
      text: '다이어트·벌크는 주 3회 이상 체중 기록 필수 — 홈에서 체중 입력',
      tone: 'info', priority: 6,
    });
  }

  // === 수면 부족 (최근 컨디션 로그) ===
  const recentSleepHours = conditionLogs.filter((c) => c.sleepHours !== undefined).slice(0, 7);
  if (recentSleepHours.length >= 3) {
    const avg = recentSleepHours.reduce((a, c) => a + (c.sleepHours || 0), 0) / recentSleepHours.length;
    if (avg < 6) {
      insights.push({
        id: 'sleep_low',
        icon: '😴',
        title: '수면 부족',
        text: `최근 평균 ${avg.toFixed(1)}시간 — 근합성 ↓, 강도 ↓ 검토 또는 수면 우선`,
        tone: 'warning', priority: 9,
      });
    } else if (avg >= 7.5) {
      insights.push({
        id: 'sleep_good',
        icon: '✨',
        title: '수면 충분',
        text: `최근 평균 ${avg.toFixed(1)}시간 — 회복 기반 좋음`,
        tone: 'success', priority: 2,
      });
    }
  }

  // === 근육통 많음 (오늘) ===
  const today = conditionLogs[0];
  if (today && today.date === new Date().toISOString().split('T')[0] && today.soreParts && today.soreParts.length >= 3) {
    insights.push({
      id: 'sore_many',
      icon: '🩹',
      title: `근육통 ${today.soreParts.length}부위`,
      text: `${today.soreParts.join(', ')} — 오늘은 가벼운 활동/스트레칭 권장`,
      tone: 'warning', priority: 7,
    });
  }

  // 우선순위 내림차순 정렬, 최대 3개
  return insights.sort((a, b) => b.priority - a.priority);
}
