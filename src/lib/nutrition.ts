import type { NutritionProfile, ActivityLevel, DietGoal } from '../types';

// 활동 계수 (Harris-Benedict revised + Mifflin standard)
const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,      // 거의 운동 안 함
  light: 1.375,        // 주 1~3 가벼운 운동
  moderate: 1.55,      // 주 3~5 중간 강도
  active: 1.725,       // 주 6~7 또는 격렬
  very_active: 1.9,    // 매일 격렬 + 육체 노동
};

// 목표별 칼로리 비율
const GOAL_FACTORS: Record<DietGoal, number> = {
  cut_aggressive: 0.75,  // -25%
  cut: 0.80,             // -20%
  maintain: 1.0,
  lean_bulk: 1.10,       // +10%
  bulk: 1.20,            // +20%
};

// 목표별 단백질 (g/kg) — 다이어트는 근육 보존 위해 높게
const PROTEIN_PER_KG: Record<DietGoal, number> = {
  cut_aggressive: 2.4,
  cut: 2.2,
  maintain: 1.8,
  lean_bulk: 1.8,
  bulk: 1.6,
};

// 목표별 지방 (g/kg) — 호르몬 유지 위한 최소량
const FAT_PER_KG: Record<DietGoal, number> = {
  cut_aggressive: 0.8,
  cut: 0.8,
  maintain: 1.0,
  lean_bulk: 1.0,
  bulk: 1.2,
};

/**
 * 기초대사량 (BMR) 계산
 * 체지방률이 있으면 Katch-McArdle (더 정확), 없으면 Mifflin-St Jeor
 */
export function calcBMR(profile: NutritionProfile): number {
  if (profile.bodyFat !== undefined && profile.bodyFat > 0 && profile.bodyFat < 60) {
    // Katch-McArdle: BMR = 370 + 21.6 × LBM
    const lbm = profile.weight * (1 - profile.bodyFat / 100);
    return 370 + 21.6 * lbm;
  }
  // Mifflin-St Jeor (가장 정확한 일반 공식)
  const base = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
  return profile.gender === 'male' ? base + 5 : base - 161;
}

/** 활동대사량 (TDEE) */
export function calcTDEE(profile: NutritionProfile): number {
  return calcBMR(profile) * ACTIVITY_FACTORS[profile.activityLevel];
}

export interface MacroTarget {
  kcal: number;
  protein: number;  // g
  carbs: number;    // g
  fat: number;      // g
}

/** 목표별 매크로 분배 */
export function calcMacros(profile: NutritionProfile, goal: DietGoal): MacroTarget {
  const tdee = calcTDEE(profile);
  const kcal = Math.round(tdee * GOAL_FACTORS[goal]);
  const protein = Math.round(profile.weight * PROTEIN_PER_KG[goal]);
  const fat = Math.round(profile.weight * FAT_PER_KG[goal]);
  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  const carbsKcal = Math.max(0, kcal - proteinKcal - fatKcal);
  const carbs = Math.round(carbsKcal / 4);
  return { kcal, protein, carbs, fat };
}

/** 모든 목표 시나리오 한 번에 */
export function calcAllScenarios(profile: NutritionProfile): Record<DietGoal, MacroTarget> {
  const goals: DietGoal[] = ['cut_aggressive', 'cut', 'maintain', 'lean_bulk', 'bulk'];
  return Object.fromEntries(goals.map((g) => [g, calcMacros(profile, g)])) as Record<DietGoal, MacroTarget>;
}

export const GOAL_LABELS: Record<DietGoal, string> = {
  cut_aggressive: '공격적 다이어트',
  cut: '다이어트',
  maintain: '유지',
  lean_bulk: '린벌크',
  bulk: '벌크',
};

export const GOAL_DESCRIPTIONS: Record<DietGoal, string> = {
  cut_aggressive: 'TDEE −25% · 빠른 감량',
  cut: 'TDEE −20% · 안전한 감량',
  maintain: 'TDEE · 체중 유지',
  lean_bulk: 'TDEE +10% · 클린 벌크',
  bulk: 'TDEE +20% · 본격 벌크',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: '거의 안 움직임',
  light: '가벼운 운동 (주 1~3)',
  moderate: '중간 강도 (주 3~5)',
  active: '높은 강도 (주 6~7)',
  very_active: '매우 활동적 (매일 + 육체노동)',
};
