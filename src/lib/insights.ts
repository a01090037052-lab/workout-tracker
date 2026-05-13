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

/** 단순 선형 회귀 — 시계열 추세 (slope) + 방향 */
function linearTrend(values: number[]): { slope: number; direction: 'up' | 'down' | 'flat'; magnitude: number } {
  const n = values.length;
  if (n < 3) return { slope: 0, direction: 'flat', magnitude: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += values[i];
    sumXY += i * values[i]; sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avg = sumY / n;
  const magnitude = avg > 0 ? Math.abs(slope / avg) * 100 : 0; // % per unit
  const direction = Math.abs(slope) < 0.01 ? 'flat' : slope > 0 ? 'up' : 'down';
  return { slope, direction, magnitude };
}

/** 4주(28일) 기간을 7일 단위 4 주차 평균으로 분할 */
function weeklyBuckets<T extends { date: string }>(items: T[], getValue: (t: T) => number): number[] {
  const buckets: number[][] = [[], [], [], []];
  for (const it of items) {
    const d = daysAgo(it.date);
    if (d < 7) buckets[3].push(getValue(it));      // 최근 주
    else if (d < 14) buckets[2].push(getValue(it));
    else if (d < 21) buckets[1].push(getValue(it));
    else if (d < 28) buckets[0].push(getValue(it));
  }
  return buckets.map((b) => b.length > 0 ? b.reduce((a, v) => a + v, 0) / b.length : NaN)
                .filter((v) => !isNaN(v));
}

/** 평균 + 표준편차 */
function meanStd(values: number[]): { mean: number; std: number; cv: number } {
  if (values.length === 0) return { mean: 0, std: 0, cv: 0 };
  const mean = values.reduce((a, v) => a + v, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  const cv = mean > 0 ? (std / mean) * 100 : 0; // 변동계수 %
  return { mean, std, cv };
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

  // === 근육통 만성화 (5일 중 4일+) ===
  const recent5Cond = conditionLogs.slice(0, 5);
  const soreDayCount = recent5Cond.filter((c) => (c.soreParts?.length ?? 0) > 0).length;
  if (soreDayCount >= 4) {
    insights.push({
      id: 'sore_chronic',
      icon: '🩹',
      title: '근육통 만성화',
      text: `최근 5일 중 ${soreDayCount}일 근육통 — 디로드 또는 폼·강도 점검`,
      tone: 'warning', priority: 8,
    });
  }

  // === [I신규] 지방 부족 (호르몬 위험) ===
  if (target && thisMacroLogs.length >= 3) {
    const totalF = thisMacroLogs.reduce((a, l) => a + l.entries.reduce((s, e) => s + e.fat, 0), 0);
    const totalKcal = thisMacroLogs.reduce((a, l) => a + l.entries.reduce((s, e) => s + e.kcal, 0), 0);
    if (totalKcal > 0) {
      const fatRatio = (totalF * 9) / totalKcal;
      if (fatRatio < 0.15) {
        insights.push({
          id: 'fat_too_low',
          icon: '⚠',
          title: '지방 비율 너무 낮음',
          text: `지방 칼로리 비율 ${Math.round(fatRatio * 100)}% — 호르몬 합성 위험 (20%+ 권장)`,
          tone: 'warning', priority: 8,
        });
      }
    }
  }

  // === [I신규] 식단 기록 누락 ===
  const loggedThisWeek = new Set(thisMacroLogs.map((l) => l.date));
  const last7DayStrs = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
  const missedDays = last7DayStrs.filter((d) => !loggedThisWeek.has(d)).length;
  if (missedDays >= 3 && profile) {
    insights.push({
      id: 'missing_logs',
      icon: '📝',
      title: '식단 기록 누락',
      text: `최근 7일 중 ${missedDays}일 미기록 — 매일 기록해야 코치 정확도 ↑`,
      tone: 'info', priority: 5,
    });
  }

  // === [I신규] 칼로리 변동성 (다이어트·벌크는 일관성이 결과의 80%) ===
  if (profile && (profile.goal !== 'maintain') && thisMacroLogs.length >= 5) {
    const daily = thisMacroLogs.map((l) => l.entries.reduce((s, e) => s + e.kcal, 0));
    const { cv } = meanStd(daily);
    if (cv > 30) {
      insights.push({
        id: 'kcal_variance_high',
        icon: '〰',
        title: '칼로리 변동성 큼',
        text: `이번 주 변동계수 ${Math.round(cv)}% — 일관성 유지가 ${profile.goal === 'cut' || profile.goal === 'cut_aggressive' ? '다이어트' : '벌크'} 결과의 80%`,
        tone: 'warning', priority: 6,
      });
    }
  }

  // === [C신규] 운동-영양 상관: 강도 ↑ + 칼로리 부족 ===
  if (target && thisVolume > 0 && lastVolume > 0 && thisMacroLogs.length >= 3) {
    const avgKcal = thisMacroLogs.reduce((a, l) => a + l.entries.reduce((s, e) => s + e.kcal, 0), 0) / thisMacroLogs.length;
    const volRatio = thisVolume / lastVolume;
    if (volRatio > 1.15 && avgKcal < target.kcal * 0.88) {
      insights.push({
        id: 'high_load_low_fuel',
        icon: '⚠',
        title: '강도 ↑ + 연료 부족',
        text: `운동 +${Math.round((volRatio - 1) * 100)}% 인데 평균 칼로리 ${Math.round(avgKcal)} (${Math.round(avgKcal / target.kcal * 100)}%) — 회복 부족`,
        tone: 'warning', priority: 9,
      });
    }
  }

  // === [I신규] 회복 최적 (수면 + 단백질 + 운동 3중 충족) ===
  if (recentSleepHours.length >= 3 && avgProteinRatio > 0.9 && thisWeekDays >= 3) {
    const avgSleepH = recentSleepHours.reduce((a, c) => a + (c.sleepHours || 0), 0) / recentSleepHours.length;
    if (avgSleepH >= 7) {
      insights.push({
        id: 'recovery_optimal',
        icon: '🌟',
        title: '회복 최적 상태',
        text: `수면 ${avgSleepH.toFixed(1)}h + 단백질 ${Math.round(avgProteinRatio * 100)}% + 운동 ${thisWeekDays}일 — 성장 환경 최상`,
        tone: 'success', priority: 4,
      });
    }
  }

  // === [I신규] 디로드 권장 (PR 21일+ 정체 + 강도 유지) ===
  const recentPR = prs.length > 0 ? daysAgo(prs[0].date) : Infinity;
  if (recentPR >= 21 && thisVolume > lastVolume * 1.0) {
    insights.push({
      id: 'deload_suggested',
      icon: '🔄',
      title: '디로드 권장',
      text: `${recentPR}일째 PR 없음 + 강도 유지 — 1주 무게 −20%로 회복 후 재시작`,
      tone: 'warning', priority: 8,
    });
  }

  // === [I신규] 3중 부담 (운동 ↑ + 단백질 ↓ + 수면 ↓) — 최고 위험 ===
  if (thisVolume > lastVolume * 1.1 && avgProteinRatio > 0 && avgProteinRatio < 0.85 && recentSleepHours.length >= 3) {
    const avgSleepH = recentSleepHours.reduce((a, c) => a + (c.sleepHours || 0), 0) / recentSleepHours.length;
    if (avgSleepH < 6.5) {
      insights.push({
        id: 'triple_strain',
        icon: '🆘',
        title: '3중 부담 — 회복 임계',
        text: `운동 +${Math.round((thisVolume / lastVolume - 1) * 100)}% + 단백질 ${Math.round(avgProteinRatio * 100)}% + 수면 ${avgSleepH.toFixed(1)}h. 1~2주 회복 우선`,
        tone: 'warning', priority: 10,
      });
    }
  }

  // === [I신규] 다이어트 성공 패턴 인식 (단백질 OK + 적정 감량) ===
  if (profile && (profile.goal === 'cut' || profile.goal === 'cut_aggressive')
      && avgProteinRatio >= 0.9 && weightLogs.length >= 7) {
    const recent7 = weightLogs.slice(0, 7);
    const prev7 = weightLogs.slice(7, 14);
    if (prev7.length >= 3) {
      const rAvg = recent7.reduce((a, w) => a + w.weight, 0) / recent7.length;
      const pAvg = prev7.reduce((a, w) => a + w.weight, 0) / prev7.length;
      const d = rAvg - pAvg;
      if (d <= -0.2 && d >= -0.6) {
        insights.push({
          id: 'cut_pattern_success',
          icon: '✅',
          title: '클린 다이어트 성공 중',
          text: `단백질 ${Math.round(avgProteinRatio * 100)}% + 주당 ${d.toFixed(2)}kg 감량 — 정통 페이스`,
          tone: 'success', priority: 3,
        });
      }
    }
  }

  // === [B신규] 4주 체중 회귀 추세 ===
  const last28W = weightLogs.filter((w) => inLastNDays(w.date, 28));
  if (last28W.length >= 7) {
    const sorted = [...last28W].sort((a, b) => a.date.localeCompare(b.date));
    const trend = linearTrend(sorted.map((w) => w.weight));
    if (Math.abs(trend.slope) > 0.03) {
      const direction = trend.direction === 'down' ? '감소' : '증가';
      const weeklyDelta = trend.slope * 7;
      insights.push({
        id: 'weight_4w_trend',
        icon: trend.direction === 'down' ? '📉' : '📈',
        title: `4주 체중 ${direction} 추세`,
        text: `회귀 기반 주당 ${weeklyDelta > 0 ? '+' : ''}${weeklyDelta.toFixed(2)}kg`,
        tone: 'info', priority: 3,
      });
    }
  }

  // === [B신규] 4주 운동 빈도 추세 ===
  if (sessions.length >= 5) {
    const buckets = weeklyBuckets(sessions, () => 1);
    // bucket은 평균이 아닌 카운트로 다시 계산
    const counts = [0, 0, 0, 0];
    for (const s of sessions) {
      const d = daysAgo(s.date);
      if (d < 7) counts[3]++;
      else if (d < 14) counts[2]++;
      else if (d < 21) counts[1]++;
      else if (d < 28) counts[0]++;
    }
    void buckets;
    const t = linearTrend(counts);
    if (t.magnitude > 25 && counts.filter((c) => c > 0).length >= 3) {
      insights.push({
        id: 'freq_4w_trend',
        icon: t.direction === 'up' ? '🔥' : '📉',
        title: `4주 운동 빈도 ${t.direction === 'up' ? '증가' : '감소'}`,
        text: `주차별 ${counts.join(' → ')}회 (회귀 기반 추세)`,
        tone: t.direction === 'up' ? 'success' : 'info', priority: 3,
      });
    }
  }

  // === [I신규] 단백질 매끼 분산 부족 (오늘 1끼에 70%+) ===
  const todayLog = macroLogs.find((l) => l.date === getTodayStr());
  if (todayLog && todayLog.entries.length >= 2) {
    const proteinByMeal: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    let totalToday = 0;
    for (const e of todayLog.entries) {
      proteinByMeal[e.mealType] = (proteinByMeal[e.mealType] || 0) + e.protein;
      totalToday += e.protein;
    }
    const maxMeal = Math.max(...Object.values(proteinByMeal));
    if (totalToday > 30 && maxMeal / totalToday > 0.65) {
      insights.push({
        id: 'protein_uneven',
        icon: '⚖',
        title: '단백질 한 끼 집중',
        text: `한 끼에 ${Math.round(maxMeal)}g (${Math.round(maxMeal / totalToday * 100)}%) — 매끼 25~40g 분산이 근합성 최적`,
        tone: 'info', priority: 4,
      });
    }
  }

  // 우선순위 내림차순 정렬
  return insights.sort((a, b) => b.priority - a.priority);
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}
