import type { TrainingGoal } from '../types';

export interface TrainingZone {
  zone: 'strength' | 'hypertrophy' | 'endurance';
  label: string;
  icon: string;
  color: string;
}

// 1RM 대비 비율로 운동 영역 판별
export function getTrainingZone(weight: number, reps: number, estimated1RM: number): TrainingZone | null {
  if (weight <= 0 || reps <= 0 || estimated1RM <= 0) return null;
  const intensity = weight / estimated1RM;

  if (intensity >= 0.85 || reps <= 5) {
    return { zone: 'strength', label: '스트렝스 영역', icon: '💪', color: 'text-red-400' };
  }
  if (intensity >= 0.65 || reps <= 12) {
    return { zone: 'hypertrophy', label: '근비대 영역', icon: '🔥', color: 'text-orange-400' };
  }
  return { zone: 'endurance', label: '근지구력 영역', icon: '⚡', color: 'text-blue-400' };
}

// 운동 목적과 실제 영역 불일치 체크
export function checkGoalMismatch(goal: TrainingGoal, zone: TrainingZone): string | null {
  const goalZoneMap: Record<TrainingGoal, TrainingZone['zone']> = {
    hypertrophy: 'hypertrophy',
    strength: 'strength',
    endurance: 'endurance',
  };
  const goalLabels: Record<TrainingGoal, string> = {
    hypertrophy: '근비대',
    strength: '스트렝스',
    endurance: '근지구력',
  };

  if (goalZoneMap[goal] !== zone.zone) {
    return `목표: ${goalLabels[goal]}인데 ${zone.label}에서 운동 중!`;
  }
  return null;
}

// 목적별 권장 휴식 시간 (초)
export function getRecommendedRestTime(goal: TrainingGoal): number {
  switch (goal) {
    case 'strength': return 180;
    case 'hypertrophy': return 90;
    case 'endurance': return 45;
  }
}

// 목적별 권장 횟수 범위
export function getRepRange(goal: TrainingGoal): { min: number; max: number; label: string } {
  switch (goal) {
    case 'strength': return { min: 1, max: 5, label: '1~5회' };
    case 'hypertrophy': return { min: 8, max: 12, label: '8~12회' };
    case 'endurance': return { min: 15, max: 20, label: '15~20회' };
  }
}

// 다음 세트 무게 추천
export function suggestNextWeight(
  goal: TrainingGoal,
  currentWeight: number,
  currentReps: number,
  estimated1RM: number,
  previousSessionWeight?: number,
  previousSessionReps?: number,
  weeksAtSameWeight?: number,
): { weight: number; reps: number; message: string } | null {
  if (currentWeight <= 0 || estimated1RM <= 0) return null;

  const repRange = getRepRange(goal);

  if (goal === 'hypertrophy') {
    // 더블 프로그레션: 상한 도달 시 증량
    if (currentReps >= repRange.max) {
      const increment = currentWeight >= 40 ? 2.5 : 1.25;
      return {
        weight: currentWeight + increment,
        reps: repRange.min,
        message: `${repRange.max}회 달성! +${increment}kg 증량 도전`,
      };
    }
    if (previousSessionWeight && currentWeight === previousSessionWeight && weeksAtSameWeight && weeksAtSameWeight >= 3) {
      return {
        weight: currentWeight,
        reps: currentReps + 1,
        message: `${weeksAtSameWeight}주째 같은 무게. 횟수를 1회 더 늘려보세요`,
      };
    }
    if (previousSessionWeight && previousSessionReps) {
      if (currentWeight === previousSessionWeight && currentReps >= previousSessionReps) {
        return {
          weight: currentWeight,
          reps: Math.min(currentReps + 1, repRange.max),
          message: `지난번 ${previousSessionWeight}kg×${previousSessionReps}회 → 횟수 1회 더!`,
        };
      }
    }
    return {
      weight: currentWeight,
      reps: Math.min(currentReps + 1, repRange.max),
      message: `${repRange.max}회를 목표로 반복수를 늘려보세요`,
    };
  }

  if (goal === 'strength') {
    if (currentReps >= repRange.max) {
      const increment = currentWeight >= 60 ? 2.5 : 1.25;
      return {
        weight: currentWeight + increment,
        reps: repRange.min,
        message: `${repRange.max}회 완료! +${increment}kg 증량`,
      };
    }
    if (previousSessionWeight && currentWeight > previousSessionWeight) {
      return {
        weight: currentWeight,
        reps: currentReps,
        message: `지난번보다 +${currentWeight - previousSessionWeight}kg 올렸어요!`,
      };
    }
    return {
      weight: currentWeight,
      reps: Math.min(currentReps + 1, repRange.max),
      message: `${repRange.max}회까지 채운 뒤 증량하세요`,
    };
  }

  // endurance
  if (currentReps >= repRange.max) {
    const increment = 2.5;
    return {
      weight: currentWeight + increment,
      reps: repRange.min,
      message: `${repRange.max}회 달성! +${increment}kg 증량`,
    };
  }
  return {
    weight: currentWeight,
    reps: Math.min(currentReps + 2, repRange.max),
    message: `${repRange.max}회까지 반복수를 늘려보세요`,
  };
}
