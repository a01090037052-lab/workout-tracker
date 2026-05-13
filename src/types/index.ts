export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscle: MuscleGroup[];
  equipmentType: EquipmentType;
  description: string;
  guide?: string;    // 단계별 수행 방법
  tips?: string;     // 주의사항/팁
  isCustom: boolean;
}

export type MuscleGroup = '가슴' | '등' | '어깨' | '이두' | '삼두' | '하체' | '코어';
export type EquipmentType = '바벨' | '덤벨' | '머신' | '케이블' | '맨몸';
export type SetType = 'normal' | 'warmup' | 'dropset';
export type TrainingGoal = 'hypertrophy' | 'strength' | 'endurance';
export type Condition = 'good' | 'normal' | 'tired';

export interface WorkoutSet {
  setNumber: number;
  weight: number;
  reps: number;
  setType: SetType;
  isCompleted: boolean;
  isPR: boolean;
}

export interface WorkoutExercise {
  exerciseId: number;
  order: number;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id?: number;
  date: string;
  startTime: string;
  endTime?: string;
  duration: number;
  condition: Condition;
  trainingGoal: TrainingGoal;
  routineId?: number;
  programId?: string;
  programWeek?: number;
  programDay?: number;
  exercises: WorkoutExercise[];
}

export interface Routine {
  id?: number;
  name: string;
  exercises: { exerciseId: number; sets: number; order: number }[];
  lastUsed?: string;
}

export interface PersonalRecord {
  id?: number;
  exerciseId: number;
  estimated1RM: number;
  maxWeight: number;
  maxReps: number;
  date: string;
  sessionId: number;
}

export interface InjuryLog {
  id?: number;
  date: string;
  bodyPart: string;
  side: 'left' | 'right' | 'both' | 'center';
  severity: 'mild' | 'moderate' | 'severe';
  note: string;
  sessionId?: number;
  isResolved: boolean;
}

export interface BodyWeightLog {
  id?: number;
  date: string;
  weight: number;        // kg
  bodyFat?: number;      // % (InBody, 캘리퍼, 가정용 체중계)
  muscleMass?: number;   // 골격근량 kg (InBody)
  note?: string;
}

export interface DailyConditionLog {
  id?: number;
  date: string;            // YYYY-MM-DD
  sleepHours?: number;     // 수면 시간 (시간 단위)
  soreParts?: MuscleGroup[]; // 근육통 부위
  stress?: number;         // 1(낮음) ~ 5(높음)
  energy?: number;         // 1(낮음) ~ 5(높음)
  note?: string;
}

export interface MealTemplate {
  id?: number;
  name: string;              // 사용자 지정 이름 (예: "오트밀 아침")
  entries: MacroEntry[];     // 여러 식품 묶음
  defaultMealType?: MealType; // 추가 시 기본 식사 분류
  createdAt: string;
  lastUsedAt?: string;       // 사용 빈도 기반 정렬
}

// 식단 자동 짜기 선호도
export interface DietPreferences {
  excludedFoodIds: number[];   // 알레르기/싫어하는 음식 (Food.id)
  simpleMode: boolean;         // 시간 제약 — 끼니별 음식 수 줄임
}

// 자동 식단 결과
export interface PlannedItem {
  foodId: number;
  foodName: string;
  category: FoodCategory;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface PlannedMeal {
  mealType: MealType;
  ratio: number;               // 끼니별 칼로리 비율 (0~1)
  targetKcal: number;
  items: PlannedItem[];
}

export interface MealPlanResult {
  meals: PlannedMeal[];
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  matchRatio: number;          // 목표 칼로리 충족 비율
}

export type GoalType = 'oneRepMax' | 'bodyWeight' | 'weeklyWorkouts';

export interface Goal {
  id?: number;
  type: GoalType;
  exerciseName?: string;   // type === 'oneRepMax' 시 종목명
  startValue: number;
  targetValue: number;
  startDate: string;       // YYYY-MM-DD
  targetDate: string;
  createdAt: string;
  completedAt?: string;    // 달성 시점
  note?: string;
}

export interface UserSettings {
  key: string;
  value: string | number | boolean | number[];
}

// === 영양 / 매크로 ===
export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type DietGoal = 'cut_aggressive' | 'cut' | 'maintain' | 'lean_bulk' | 'bulk';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface NutritionProfile {
  gender: Gender;
  age: number;
  height: number;        // cm
  weight: number;        // kg
  bodyFat?: number;      // % (선택, Katch-McArdle용)
  activityLevel: ActivityLevel;
  goal: DietGoal;
}

export interface MacroEntry {
  name: string;
  kcal: number;
  protein: number;       // g
  carbs: number;         // g
  fat: number;           // g
  mealType: MealType;
  // 정확도 (0~1): 1=라벨/측정, 0.7=DB 검색, 0.5=추정/손바닥, 0.3=빠른 일반식, 0.2=사후 보정
  confidence?: number;
}

export interface DailyMacroLog {
  id?: number;
  date: string;          // YYYY-MM-DD
  entries: MacroEntry[];
  waterMl?: number;      // 누적 물 섭취 (ml)
}

export type FoodCategory = 'grain' | 'protein' | 'vegetable' | 'fruit' | 'dairy' | 'snack' | 'beverage' | 'sauce' | 'processed' | 'delivery' | 'supplement';

export interface Food {
  id?: number;
  name: string;
  category: FoodCategory;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  defaultServing?: number;   // 기본 분량 (g) — 검색 시 자동 채움
  servingLabel?: string;     // 표시용 (예: "1개(50g)", "1컵")
  isCustom: boolean;
}
