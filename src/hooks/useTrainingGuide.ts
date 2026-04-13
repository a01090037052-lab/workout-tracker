import type { TrainingGoal, WorkoutSet } from '../types';

export interface TrainingZone {
  zone: 'strength' | 'hypertrophy' | 'endurance';
  label: string;
  icon: string;
  color: string;
}

export interface SetSuggestion {
  weight: number;
  reps: number;
  message: string;
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

// 증량 단위 결정
function getIncrement(_weight: number, _isCompound: boolean): number {
  return 5; // 바벨 최소 원판 2.5kg × 양쪽 = 5kg
}

/**
 * 세트별 무게/횟수 추천 (개선판)
 *
 * 고려하는 데이터:
 * 1. 같은 운동 내 이전 세트 (currentSets)
 * 2. 지난 운동 기록 (previousSessionSets)
 * 3. 추정 1RM
 * 4. 운동 목적
 */
export function suggestForSet(params: {
  goal: TrainingGoal;
  setIndex: number;
  currentSets: WorkoutSet[];           // 현재 운동의 세트들
  previousSessionSets?: WorkoutSet[];  // 지난 운동의 세트들
  estimated1RM?: number;
  condition?: 'good' | 'normal' | 'tired';
}): SetSuggestion | null {
  const { goal, setIndex, currentSets, previousSessionSets, estimated1RM, condition } = params;
  const repRange = getRepRange(goal);

  // 컨디션 보정 계수
  const conditionFactor = condition === 'tired' ? 0.9 : 1;

  // 이전 세트 (같은 운동 내)
  const prevSet = setIndex > 0 ? currentSets[setIndex - 1] : null;
  const prevCompleted = prevSet?.isCompleted ? prevSet : null;

  // 지난 운동의 같은 세트
  const prevSessionSet = previousSessionSets?.[setIndex];

  // === 1) 같은 운동 내에서 이전 세트가 완료된 경우 ===
  if (prevCompleted && prevCompleted.weight > 0) {
    return suggestFromPrevSet(goal, prevCompleted, setIndex, repRange, conditionFactor, estimated1RM);
  }

  // === 2) 지난 운동 기록이 있는 경우 ===
  if (prevSessionSet && prevSessionSet.weight > 0) {
    return suggestFromPrevSession(goal, prevSessionSet, repRange, conditionFactor);
  }

  // === 3) 1RM만 있는 경우 ===
  if (estimated1RM && estimated1RM > 0) {
    return suggestFrom1RM(goal, estimated1RM, repRange, conditionFactor);
  }

  // === 4) 아무 데이터도 없는 경우 ===
  return {
    weight: 0,
    reps: Math.round((repRange.min + repRange.max) / 2),
    message: `${repRange.label} 범위로 시작해보세요`,
  };
}

// 같은 운동 내 이전 세트 기반 추천
function suggestFromPrevSet(
  goal: TrainingGoal,
  prevSet: WorkoutSet,
  setIndex: number,
  repRange: { min: number; max: number },
  conditionFactor: number,
  _estimated1RM?: number,
): SetSuggestion {
  const w = prevSet.weight;
  const r = prevSet.reps;
  const increment = getIncrement(w, true);

  if (goal === 'strength') {
    // 스트렝스: 피라미드 업 (세트마다 무게 올리고 횟수 줄이기)
    if (setIndex <= 2 && r >= repRange.max) {
      const newWeight = Math.round((w + increment) * 2) / 2;
      return {
        weight: Math.round(newWeight * conditionFactor * 2) / 2,
        reps: Math.max(repRange.min, r - 1),
        message: `세트${setIndex + 1}: +${increment}kg 증량 (피라미드)`,
      };
    }
    // 같은 무게 유지
    return {
      weight: Math.round(w * conditionFactor * 2) / 2,
      reps: r,
      message: `${w}kg × ${r}회 유지`,
    };
  }

  if (goal === 'hypertrophy') {
    // 근비대: 같은 무게 유지, 목표 횟수 달성에 집중
    if (r >= repRange.max) {
      // 모든 세트에서 상한 달성 중이면 다음 세트도 같은 무게
      return {
        weight: Math.round(w * conditionFactor * 2) / 2,
        reps: repRange.max,
        message: `${w}kg × ${repRange.max}회 유지 → 모든 세트 달성 시 +${increment}kg`,
      };
    }
    return {
      weight: Math.round(w * conditionFactor * 2) / 2,
      reps: Math.min(r + 1, repRange.max),
      message: `${w}kg 유지, ${repRange.max}회 목표`,
    };
  }

  // 근지구력: 같은 무게, 최대 횟수
  return {
    weight: Math.round(w * conditionFactor * 2) / 2,
    reps: Math.min(r + 2, repRange.max),
    message: `${w}kg 유지, ${repRange.max}회까지 늘려보세요`,
  };
}

// 지난 운동 기록 기반 추천
function suggestFromPrevSession(
  goal: TrainingGoal,
  prevSessionSet: WorkoutSet,
  repRange: { min: number; max: number },
  conditionFactor: number,
): SetSuggestion {
  const w = prevSessionSet.weight;
  const r = prevSessionSet.reps;
  const increment = getIncrement(w, true);

  if (goal === 'hypertrophy') {
    if (r >= repRange.max) {
      // 지난번에 상한 달성 → 증량 추천
      const newWeight = Math.round((w + increment) * conditionFactor * 2) / 2;
      return {
        weight: newWeight,
        reps: repRange.min,
        message: `지난번 ${w}kg×${r}회 달성! +${increment}kg 증량 도전`,
      };
    }
    return {
      weight: Math.round(w * conditionFactor * 2) / 2,
      reps: Math.min(r + 1, repRange.max),
      message: `지난번 ${w}kg×${r}회 → ${Math.min(r + 1, repRange.max)}회 도전`,
    };
  }

  if (goal === 'strength') {
    if (r >= repRange.max) {
      const newWeight = Math.round((w + increment) * conditionFactor * 2) / 2;
      return {
        weight: newWeight,
        reps: repRange.min,
        message: `지난번 ${w}kg×${r}회 완료! +${increment}kg 증량`,
      };
    }
    return {
      weight: Math.round(w * conditionFactor * 2) / 2,
      reps: r,
      message: `지난번 ${w}kg×${r}회 → 같은 무게 도전`,
    };
  }

  // 근지구력
  if (r >= repRange.max) {
    const newWeight = Math.round((w + 2.5) * conditionFactor * 2) / 2;
    return {
      weight: newWeight,
      reps: repRange.min,
      message: `지난번 ${w}kg×${r}회 달성! +2.5kg 증량`,
    };
  }
  return {
    weight: Math.round(w * conditionFactor * 2) / 2,
    reps: Math.min(r + 2, repRange.max),
    message: `지난번 ${w}kg×${r}회 → 횟수 늘려보세요`,
  };
}

// 1RM 기반 추천 (이전 기록 없을 때)
function suggestFrom1RM(
  goal: TrainingGoal,
  estimated1RM: number,
  _repRange: { min: number; max: number },
  conditionFactor: number,
): SetSuggestion {
  let intensity: number;
  let targetReps: number;

  if (goal === 'strength') {
    intensity = 0.85;
    targetReps = 3;
  } else if (goal === 'hypertrophy') {
    intensity = 0.7;
    targetReps = 10;
  } else {
    intensity = 0.55;
    targetReps = 18;
  }

  const weight = Math.round(estimated1RM * intensity * conditionFactor / 2.5) * 2.5;

  return {
    weight,
    reps: targetReps,
    message: `1RM(${Math.round(estimated1RM)}kg) 기반: ${Math.round(intensity * 100)}% 강도`,
  };
}

// 운동 완료 후 다음 운동 증량 메시지
export function getProgressionMessage(
  goal: TrainingGoal,
  sets: WorkoutSet[],
): string | null {
  const completedSets = sets.filter((s) => s.isCompleted && s.weight > 0);
  if (completedSets.length === 0) return null;

  const repRange = getRepRange(goal);
  const weight = completedSets[0].weight;
  const allSameWeight = completedSets.every((s) => s.weight === weight);
  const allMaxReps = completedSets.every((s) => s.reps >= repRange.max);
  const increment = getIncrement(weight, true);

  if (allSameWeight && allMaxReps) {
    return `모든 세트 ${weight}kg×${repRange.max}회 달성! 다음 운동에서 ${weight + increment}kg으로 증량하세요`;
  }

  const avgReps = Math.round(completedSets.reduce((a, s) => a + s.reps, 0) / completedSets.length);
  if (avgReps < repRange.min) {
    return `평균 ${avgReps}회로 목표(${repRange.label}) 미달. 무게를 ${increment}kg 줄여보세요`;
  }

  return null;
}
