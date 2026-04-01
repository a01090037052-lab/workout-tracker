import Dexie, { type Table } from 'dexie';
import type { Exercise, WorkoutSession, Routine, PersonalRecord, InjuryLog, UserSettings } from '../types';

class WorkoutDB extends Dexie {
  exercises!: Table<Exercise>;
  sessions!: Table<WorkoutSession>;
  routines!: Table<Routine>;
  personalRecords!: Table<PersonalRecord>;
  injuryLogs!: Table<InjuryLog>;
  settings!: Table<UserSettings>;

  constructor() {
    super('WorkoutTracker');
    this.version(1).stores({
      exercises: '++id, name, muscleGroup, equipmentType, isCustom',
      sessions: '++id, date, trainingGoal',
      routines: '++id, name',
      personalRecords: '++id, exerciseId, date',
      injuryLogs: '++id, date, bodyPart, isResolved',
      settings: 'key',
    });
  }
}

export const db = new WorkoutDB();
