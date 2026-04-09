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
  weight: number;
  bodyFat?: number;
}

export interface UserSettings {
  key: string;
  value: string | number | boolean | number[];
}
