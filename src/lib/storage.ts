import type { WorkoutExercise, Condition, TrainingGoal } from '../types';

// 모든 localStorage 키를 한 곳에 모아 오타 방지
const KEYS = {
  weightSuggestion: 'weightSuggestion',
  activeWorkout: 'activeWorkout',
  lastBackupAt: 'lastBackupAt',
  backupSnoozedUntil: 'backupReminderSnoozedUntil',
  activeProgramId: 'activeProgramId',
  programProgressPrefix: 'prog_',
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

export const storage = {
  weightSuggestion: {
    get(): boolean {
      return localStorage.getItem(KEYS.weightSuggestion) !== 'off';
    },
    set(enabled: boolean) {
      localStorage.setItem(KEYS.weightSuggestion, enabled ? 'on' : 'off');
    },
    raw(): string {
      return localStorage.getItem(KEYS.weightSuggestion) || 'on';
    },
    setRaw(value: string) {
      localStorage.setItem(KEYS.weightSuggestion, value);
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
      localStorage.setItem(KEYS.lastBackupAt, String(Date.now()));
    },
  },

  backupSnoozedUntil: {
    get(): number {
      return Number(localStorage.getItem(KEYS.backupSnoozedUntil) || 0);
    },
    set(ms: number) {
      localStorage.setItem(KEYS.backupSnoozedUntil, String(ms));
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
      if (id) localStorage.setItem(KEYS.activeProgramId, id);
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
          localStorage.setItem(key, value);
        }
      }
    },
  },
};
