import type { WorkoutExercise, Condition, TrainingGoal, NutritionProfile, DietPreferences } from '../types';

// 모든 localStorage 키를 한 곳에 모아 오타 방지
const KEYS = {
  weightSuggestion: 'weightSuggestion',
  activeWorkout: 'activeWorkout',
  lastBackupAt: 'lastBackupAt',
  backupSnoozedUntil: 'backupReminderSnoozedUntil',
  activeProgramId: 'activeProgramId',
  programProgressPrefix: 'prog_',
  nutritionProfile: 'nutritionProfile',
} as const;

export interface SavedActiveWorkout {
  isActive: boolean;
  exercises: WorkoutExercise[];
  startTime: number;
  condition: Condition;
  trainingGoal: TrainingGoal;
  routineId?: number;
  programId?: string;
  programWeek?: number;
  programDay?: number;
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch { return null; }
}

function writeJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota or private mode */ }
}

// Safari 시크릿 모드/용량 초과 시 setItem이 throw하므로 전 경로를 감싼다
function writeRaw(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* quota or private mode */ }
}

export const storage = {
  weightSuggestion: {
    get(): boolean {
      return localStorage.getItem(KEYS.weightSuggestion) !== 'off';
    },
    set(enabled: boolean) {
      writeRaw(KEYS.weightSuggestion, enabled ? 'on' : 'off');
    },
    raw(): string {
      return localStorage.getItem(KEYS.weightSuggestion) || 'on';
    },
    setRaw(value: string) {
      writeRaw(KEYS.weightSuggestion, value);
    },
  },

  activeWorkout: {
    get(): SavedActiveWorkout | null {
      return readJSON<SavedActiveWorkout>(KEYS.activeWorkout);
    },
    set(data: SavedActiveWorkout) {
      writeJSON(KEYS.activeWorkout, data);
    },
    clear() {
      localStorage.removeItem(KEYS.activeWorkout);
    },
  },

  lastBackupAt: {
    get(): number {
      return Number(localStorage.getItem(KEYS.lastBackupAt) || 0);
    },
    setNow() {
      writeRaw(KEYS.lastBackupAt, String(Date.now()));
    },
  },

  backupSnoozedUntil: {
    get(): number {
      return Number(localStorage.getItem(KEYS.backupSnoozedUntil) || 0);
    },
    set(ms: number) {
      writeRaw(KEYS.backupSnoozedUntil, String(ms));
    },
    clear() {
      localStorage.removeItem(KEYS.backupSnoozedUntil);
    },
  },

  activeProgramId: {
    get(): string | null {
      return localStorage.getItem(KEYS.activeProgramId);
    },
    set(id: string | null) {
      if (id) writeRaw(KEYS.activeProgramId, id);
      else localStorage.removeItem(KEYS.activeProgramId);
    },
  },

  programProgress: {
    get<T>(programId: string): T | null {
      return readJSON<T>(KEYS.programProgressPrefix + programId);
    },
    set<T>(programId: string, data: T) {
      writeJSON(KEYS.programProgressPrefix + programId, data);
    },
    // 백업 export용: prog_* + activeProgramId 키 묶어서 반환
    exportAll(): Record<string, string> {
      const out: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith(KEYS.programProgressPrefix) || key === KEYS.activeProgramId) {
          const v = localStorage.getItem(key);
          if (v !== null) out[key] = v;
        }
      }
      return out;
    },
    // 복원 시 prog_*와 activeProgramId 일괄 복구
    importAll(map: Record<string, string>) {
      for (const [key, value] of Object.entries(map)) {
        if (key.startsWith(KEYS.programProgressPrefix) || key === KEYS.activeProgramId) {
          writeRaw(key, value);
        }
      }
    },
  },

  nutritionProfile: {
    get(): NutritionProfile | null {
      return readJSON<NutritionProfile>(KEYS.nutritionProfile);
    },
    set(profile: NutritionProfile) {
      writeJSON(KEYS.nutritionProfile, profile);
    },
    clear() {
      localStorage.removeItem(KEYS.nutritionProfile);
    },
  },

  favoriteFoods: {
    get(): number[] {
      return readJSON<number[]>('favoriteFoods') || [];
    },
    set(ids: number[]) {
      writeJSON('favoriteFoods', ids);
    },
    has(id: number): boolean {
      return this.get().includes(id);
    },
    toggle(id: number): boolean {
      const cur = this.get();
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      this.set(next);
      return next.includes(id);
    },
  },

  programAutoApplyPR: {
    // default true (기존 동작 유지). PR 갱신 시 진행 중 1RM 자동 반영.
    get(): boolean {
      return localStorage.getItem('programAutoApplyPR') !== 'off';
    },
    set(enabled: boolean) {
      writeRaw('programAutoApplyPR', enabled ? 'on' : 'off');
    },
  },

  microPlates: {
    // default false: 1.25kg 마이크로 원판 없음 → 바벨은 5kg 단위로만 세팅 가능.
    // 켜면 바벨 추천/원판 계산이 2.5kg 단위가 됨.
    get(): boolean {
      return localStorage.getItem('microPlates') === 'on';
    },
    set(enabled: boolean) {
      writeRaw('microPlates', enabled ? 'on' : 'off');
    },
  },

  dumbbell25: {
    // default false: 덤벨이 2kg 단위(2,4,6…). 켜면 2.5kg 단위(2.5,5,7.5…).
    get(): boolean {
      return localStorage.getItem('dumbbell25') === 'on';
    },
    set(enabled: boolean) {
      writeRaw('dumbbell25', enabled ? 'on' : 'off');
    },
  },

  dietPreferences: {
    get(): DietPreferences {
      return readJSON<DietPreferences>('dietPreferences') || { excludedFoodIds: [], simpleMode: false };
    },
    set(prefs: DietPreferences) {
      writeJSON('dietPreferences', prefs);
    },
  },
};
