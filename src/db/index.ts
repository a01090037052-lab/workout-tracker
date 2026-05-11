import Dexie, { type Table } from 'dexie';
import type { Exercise, WorkoutSession, Routine, PersonalRecord, InjuryLog, BodyWeightLog, DailyMacroLog, DailyConditionLog, Food, Goal, UserSettings } from '../types';

class WorkoutDB extends Dexie {
  exercises!: Table<Exercise>;
  sessions!: Table<WorkoutSession>;
  routines!: Table<Routine>;
  personalRecords!: Table<PersonalRecord>;
  injuryLogs!: Table<InjuryLog>;
  bodyWeightLogs!: Table<BodyWeightLog>;
  dailyMacroLogs!: Table<DailyMacroLog>;
  conditionLogs!: Table<DailyConditionLog>;
  foods!: Table<Food>;
  goals!: Table<Goal>;
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
    this.version(2).stores({
      exercises: '++id, name, muscleGroup, equipmentType, isCustom',
      sessions: '++id, date, trainingGoal',
      routines: '++id, name',
      personalRecords: '++id, exerciseId, date, sessionId',
      injuryLogs: '++id, date, bodyPart, isResolved',
      bodyWeightLogs: '++id, date',
      settings: 'key',
    });
    this.version(3).stores({
      exercises: '++id, name, muscleGroup, equipmentType, isCustom',
      sessions: '++id, date, trainingGoal',
      routines: '++id, name',
      personalRecords: '++id, exerciseId, date, sessionId',
      injuryLogs: '++id, date, bodyPart, isResolved',
      bodyWeightLogs: '++id, date',
      dailyMacroLogs: '++id, date',
      settings: 'key',
    });
    this.version(4).stores({
      exercises: '++id, name, muscleGroup, equipmentType, isCustom',
      sessions: '++id, date, trainingGoal',
      routines: '++id, name',
      personalRecords: '++id, exerciseId, date, sessionId',
      injuryLogs: '++id, date, bodyPart, isResolved',
      bodyWeightLogs: '++id, date',
      dailyMacroLogs: '++id, date',
      foods: '++id, name, category, isCustom',
      settings: 'key',
    });
    this.version(5).stores({
      exercises: '++id, name, muscleGroup, equipmentType, isCustom',
      sessions: '++id, date, trainingGoal',
      routines: '++id, name',
      personalRecords: '++id, exerciseId, date, sessionId',
      injuryLogs: '++id, date, bodyPart, isResolved',
      bodyWeightLogs: '++id, date',
      dailyMacroLogs: '++id, date',
      conditionLogs: '++id, date',
      foods: '++id, name, category, isCustom',
      settings: 'key',
    });
    this.version(6).stores({
      exercises: '++id, name, muscleGroup, equipmentType, isCustom',
      sessions: '++id, date, trainingGoal',
      routines: '++id, name',
      personalRecords: '++id, exerciseId, date, sessionId',
      injuryLogs: '++id, date, bodyPart, isResolved',
      bodyWeightLogs: '++id, date',
      dailyMacroLogs: '++id, date',
      conditionLogs: '++id, date',
      foods: '++id, name, category, isCustom',
      goals: '++id, type, completedAt',
      settings: 'key',
    });
  }
}

export const db = new WorkoutDB();
