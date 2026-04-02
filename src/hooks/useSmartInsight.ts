import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export interface SmartInsight {
  type: 'plateau' | 'fatigue' | 'deload' | 'progress';
  icon: string;
  message: string;
  color: string;
}

export function useSmartInsight(exerciseId: number): SmartInsight | null | undefined {
  return useLiveQuery(async () => {
    const sessions = await db.sessions.orderBy('date').reverse().limit(20).toArray();
    const exercise = await db.exercises.get(exerciseId);
    if (!exercise || sessions.length < 2) return null;

    // 이 종목의 최근 기록들 추출
    const history: { date: string; maxWeight: number; totalVolume: number; avgReps: number }[] = [];
    for (const session of sessions) {
      const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (!ex) continue;
      const completed = ex.sets.filter((s) => s.isCompleted && s.weight > 0);
      if (completed.length === 0) continue;
      const maxWeight = Math.max(...completed.map((s) => s.weight));
      const totalVolume = completed.reduce((acc, s) => acc + s.weight * s.reps, 0);
      const avgReps = Math.round(completed.reduce((acc, s) => acc + s.reps, 0) / completed.length);
      history.push({ date: session.date, maxWeight, totalVolume, avgReps });
    }

    if (history.length < 2) return null;

    // 정체기 감지: 최근 3회 이상 같은 최대 무게
    if (history.length >= 3) {
      const recentWeights = history.slice(0, 3).map((h) => h.maxWeight);
      if (recentWeights.every((w) => w === recentWeights[0])) {
        return {
          type: 'plateau',
          icon: '⚠️',
          message: `${recentWeights[0]}kg에서 ${history.length >= 4 ? '4회' : '3회'} 연속 정체 중. 무게를 5% 줄이고 횟수를 늘리거나, 변형 종목을 시도해보세요`,
          color: 'text-warning',
        };
      }
    }

    // 피로도 감지: 최근 볼륨이 2회 연속 감소
    if (history.length >= 3) {
      const [latest, prev, prevPrev] = history;
      if (latest.totalVolume < prev.totalVolume && prev.totalVolume < prevPrev.totalVolume) {
        const dropPct = Math.round((1 - latest.totalVolume / prevPrev.totalVolume) * 100);
        return {
          type: 'fatigue',
          icon: '😓',
          message: `볼륨이 2회 연속 감소 (${dropPct}%↓). 피로가 누적된 것 같아요. 디로드 주간을 고려해보세요`,
          color: 'text-orange-400',
        };
      }
    }

    // 디로드 필요 감지: 4주 이상 연속 볼륨 증가 후
    if (history.length >= 5) {
      let consecutiveIncrease = 0;
      for (let i = 0; i < history.length - 1; i++) {
        if (history[i].totalVolume > history[i + 1].totalVolume) {
          consecutiveIncrease++;
        } else break;
      }
      if (consecutiveIncrease >= 4) {
        return {
          type: 'deload',
          icon: '🔄',
          message: `${consecutiveIncrease}회 연속 볼륨 증가! 이번 주는 무게를 50~60%로 줄여 디로드하면 다음 주기에 더 성장할 수 있어요`,
          color: 'text-blue-400',
        };
      }
    }

    // 성장 감지: 최근 기록이 이전보다 높음
    if (history.length >= 2) {
      const [latest, prev] = history;
      if (latest.maxWeight > prev.maxWeight) {
        const diff = latest.maxWeight - prev.maxWeight;
        return {
          type: 'progress',
          icon: '📈',
          message: `지난번보다 +${diff}kg 증량 성공! 좋은 성장세예요`,
          color: 'text-success',
        };
      }
      if (latest.totalVolume > prev.totalVolume * 1.05) {
        const pct = Math.round((latest.totalVolume / prev.totalVolume - 1) * 100);
        return {
          type: 'progress',
          icon: '📈',
          message: `볼륨 ${pct}% 증가! 점진적 과부하가 잘 되고 있어요`,
          color: 'text-success',
        };
      }
    }

    return null;
  }, [exerciseId]);
}
