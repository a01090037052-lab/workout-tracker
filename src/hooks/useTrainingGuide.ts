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

export function getRecommendedRestTime(goal: TrainingGoal): number {
  switch (goal) {
    case 'strength': return 180;
    case 'hypertrophy': return 90;
    case 'endurance': return 45;
  }
}

export function getRepRange(goal: TrainingGoal): { min: number; max: number; label: string } {
  switch (goal) {
    case 'strength': return { min: 1, max: 5, label: '1~5회' };
    case 'hypertrophy': return { min: 8, max: 12, label: '8~12회' };
    case 'endurance': return { min: 15, max: 20, label: '15~20회' };
  }
}

// === 종목 분류 (복합/고립) ===
// 고립 우선 매칭 (예: "사이드 레터럴 레이즈"의 "레이즈"가 "프레스"보다 먼저 잡혀야 안전)
const ISOLATION_KEYWORDS = [
  '컬', '레이즈', '플라이', '익스텐션', '크런치',
  '카프', '페이스 풀', '페이스풀', '슈러그',
  '푸시다운', '푸쉬다운', '킥백', '리버스 플라이',
  '레그익스텐션', '레그 익스텐션', '레그컬', '레그 컬',
];

const COMPOUND_KEYWORDS = [
  '벤치프레스', '체스트 프레스', '체스트프레스',
  '오버헤드 프레스', '밀리터리 프레스', '숄더 프레스', '푸시 프레스',
  '스쿼트', '데드', '루마니안', '핵스쿼트', '고블릿',
  '로우', '풀업', '친업', '랫풀다운', '풀다운',
  '딥스', '런지', '레그프레스', '레그 프레스',
  '쓰러스트', '글루트브릿지', '힙브릿지', '브릿지',
  '클린', '스내치',
];

export function classifyExercise(name: string, secondaryMuscleCount: number = 0): { isCompound: boolean } {
  if (ISOLATION_KEYWORDS.some((k) => name.includes(k))) return { isCompound: false };
  if (COMPOUND_KEYWORDS.some((k) => name.includes(k))) return { isCompound: true };
  // fallback: 보조근이 2개 이상이면 복합
  return { isCompound: secondaryMuscleCount >= 2 };
}

// === 무게 단위 ===
// 증량 단위 (다음 운동 또는 도전 시 권장)
export function getIncrement(equipmentType?: string, isCompound: boolean = true): number {
  switch (equipmentType) {
    case '바벨': return isCompound ? 2.5 : 1.25;
    case '덤벨': return 2;       // 한쪽당 +1kg
    case '머신': return 5;
    case '케이블': return 5;
    case '맨몸': return 0;
    default: return 2.5;
  }
}

// 무게 반올림 단위 (가능한 실제 세팅 무게)
function getRoundStep(equipmentType?: string, isCompound: boolean = true): number {
  switch (equipmentType) {
    case '바벨': return isCompound ? 2.5 : 1.25;
    case '덤벨': return 1;
    case '머신': return 2.5;
    case '케이블': return 2.5;
    case '맨몸': return 0.5;
    default: return 0.5;
  }
}

function roundWeight(weight: number, equipmentType?: string, isCompound: boolean = true): number {
  if (weight <= 0) return 0;
  const step = getRoundStep(equipmentType, isCompound);
  return Math.round(weight / step) * step;
}

// === 세트 추천 ===
export function suggestForSet(params: {
  goal: TrainingGoal;
  setIndex: number;
  currentSets: WorkoutSet[];
  previousSessionSets?: WorkoutSet[];
  estimated1RM?: number;
  condition?: 'good' | 'normal' | 'tired';
  equipmentType?: string;
  isCompound?: boolean;
}): SetSuggestion | null {
  const {
    goal, setIndex, currentSets, previousSessionSets,
    estimated1RM, condition, equipmentType, isCompound = true,
  } = params;
  const repRange = getRepRange(goal);
  const conditionFactor = condition === 'tired' ? 0.9 : 1;

  const prevSet = setIndex > 0 ? currentSets[setIndex - 1] : null;
  const prevCompleted = prevSet?.isCompleted ? prevSet : null;
  const prevSessionSet = previousSessionSets?.[setIndex];

  if (prevCompleted && prevCompleted.weight > 0) {
    return suggestFromPrevSet(goal, prevCompleted, setIndex, repRange, conditionFactor, equipmentType, isCompound);
  }

  if (prevSessionSet && prevSessionSet.weight > 0) {
    return suggestFromPrevSession(goal, prevSessionSet, repRange, conditionFactor, equipmentType, isCompound);
  }

  if (estimated1RM && estimated1RM > 0) {
    return suggestFrom1RM(goal, estimated1RM, conditionFactor, equipmentType, isCompound);
  }

  return {
    weight: 0,
    reps: Math.round((repRange.min + repRange.max) / 2),
    message: `${repRange.label} 범위로 시작해보세요`,
  };
}

function formatIncrement(inc: number): string {
  return inc % 1 === 0 ? `${inc}` : inc.toFixed(2).replace(/\.?0+$/, '');
}

function suggestFromPrevSet(
  goal: TrainingGoal,
  prevSet: WorkoutSet,
  setIndex: number,
  repRange: { min: number; max: number },
  conditionFactor: number,
  equipmentType?: string,
  isCompound: boolean = true,
): SetSuggestion {
  const w = prevSet.weight;
  const r = prevSet.reps;
  const inc = getIncrement(equipmentType, isCompound);

  if (goal === 'strength') {
    // 스트렝스: 피라미드 업 (앞 2세트는 무게 올리며 횟수 줄임)
    if (setIndex <= 2 && r >= repRange.max) {
      const newWeight = roundWeight(w + inc, equipmentType, isCompound);
      return {
        weight: roundWeight(newWeight * conditionFactor, equipmentType, isCompound),
        reps: Math.max(repRange.min, r - 1),
        message: `세트${setIndex + 1}: +${formatIncrement(inc)}kg 증량 (피라미드)`,
      };
    }
    return {
      weight: roundWeight(w * conditionFactor, equipmentType, isCompound),
      reps: r,
      message: `${w}kg × ${r}회 유지`,
    };
  }

  if (goal === 'hypertrophy') {
    // 근비대: 같은 무게, 목표 횟수 달성
    if (r >= repRange.max) {
      return {
        weight: roundWeight(w * conditionFactor, equipmentType, isCompound),
        reps: repRange.max,
        message: `${w}kg × ${repRange.max}회 유지 → 모든 세트 달성 시 +${formatIncrement(inc)}kg`,
      };
    }
    return {
      weight: roundWeight(w * conditionFactor, equipmentType, isCompound),
      reps: Math.min(r + 1, repRange.max),
      message: `${w}kg 유지, ${repRange.max}회 목표`,
    };
  }

  // 근지구력
  return {
    weight: roundWeight(w * conditionFactor, equipmentType, isCompound),
    reps: Math.min(r + 2, repRange.max),
    message: `${w}kg 유지, ${repRange.max}회까지 늘려보세요`,
  };
}

function suggestFromPrevSession(
  goal: TrainingGoal,
  prevSessionSet: WorkoutSet,
  repRange: { min: number; max: number },
  conditionFactor: number,
  equipmentType?: string,
  isCompound: boolean = true,
): SetSuggestion {
  const w = prevSessionSet.weight;
  const r = prevSessionSet.reps;
  const inc = getIncrement(equipmentType, isCompound);

  if (goal === 'hypertrophy') {
    if (r >= repRange.max) {
      const newWeight = roundWeight((w + inc) * conditionFactor, equipmentType, isCompound);
      return {
        weight: newWeight,
        reps: repRange.min,
        message: `지난번 ${w}kg×${r}회 달성! +${formatIncrement(inc)}kg 증량 도전`,
      };
    }
    return {
      weight: roundWeight(w * conditionFactor, equipmentType, isCompound),
      reps: Math.min(r + 1, repRange.max),
      message: `지난번 ${w}kg×${r}회 → ${Math.min(r + 1, repRange.max)}회 도전`,
    };
  }

  if (goal === 'strength') {
    if (r >= repRange.max) {
      const newWeight = roundWeight((w + inc) * conditionFactor, equipmentType, isCompound);
      return {
        weight: newWeight,
        reps: repRange.min,
        message: `지난번 ${w}kg×${r}회 완료! +${formatIncrement(inc)}kg 증량`,
      };
    }
    return {
      weight: roundWeight(w * conditionFactor, equipmentType, isCompound),
      reps: r,
      message: `지난번 ${w}kg×${r}회 → 같은 무게 도전`,
    };
  }

  // 근지구력은 작은 단위 증량 (절반)
  const enduranceInc = Math.max(getRoundStep(equipmentType, isCompound), inc / 2);
  if (r >= repRange.max) {
    const newWeight = roundWeight((w + enduranceInc) * conditionFactor, equipmentType, isCompound);
    return {
      weight: newWeight,
      reps: repRange.min,
      message: `지난번 ${w}kg×${r}회 달성! +${formatIncrement(enduranceInc)}kg 증량`,
    };
  }
  return {
    weight: roundWeight(w * conditionFactor, equipmentType, isCompound),
    reps: Math.min(r + 2, repRange.max),
    message: `지난번 ${w}kg×${r}회 → 횟수 늘려보세요`,
  };
}

function suggestFrom1RM(
  goal: TrainingGoal,
  estimated1RM: number,
  conditionFactor: number,
  equipmentType?: string,
  isCompound: boolean = true,
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

  const weight = roundWeight(estimated1RM * intensity * conditionFactor, equipmentType, isCompound);

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
  equipmentType?: string,
  isCompound: boolean = true,
): string | null {
  const completedSets = sets.filter((s) => s.isCompleted && s.weight > 0);
  if (completedSets.length === 0) return null;

  const repRange = getRepRange(goal);
  const weight = completedSets[0].weight;
  const allSameWeight = completedSets.every((s) => s.weight === weight);
  const allMaxReps = completedSets.every((s) => s.reps >= repRange.max);
  const inc = getIncrement(equipmentType, isCompound);
  const nextWeight = roundWeight(weight + inc, equipmentType, isCompound);

  if (allSameWeight && allMaxReps && inc > 0) {
    return `모든 세트 ${weight}kg×${repRange.max}회 달성! 다음 운동에서 ${nextWeight}kg으로 증량하세요`;
  }

  const avgReps = Math.round(completedSets.reduce((a, s) => a + s.reps, 0) / completedSets.length);
  if (avgReps < repRange.min && inc > 0) {
    const reducedWeight = roundWeight(weight - inc, equipmentType, isCompound);
    return `평균 ${avgReps}회로 목표(${repRange.label}) 미달. 무게를 ${reducedWeight}kg(-${formatIncrement(inc)}kg)로 줄여보세요`;
  }

  return null;
}
