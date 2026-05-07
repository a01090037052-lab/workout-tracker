import { useState, useCallback, useEffect } from 'react';
import { db } from '../db';
import { getLocalDate } from './useLocalDate';
import { storage } from '../lib/storage';
import type { WorkoutExercise, WorkoutSet, WorkoutSession, Condition, TrainingGoal } from '../types';

export interface PRAlert {
  exerciseId: number;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
}

export function useWorkout() {
  const [initialState] = useState(() => storage.activeWorkout.get());

  const [isActive, setIsActive] = useState(initialState?.isActive || false);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(initialState?.exercises || []);
  const [startTimeMs, setStartTimeMs] = useState<number>(initialState?.startTime || 0);
  const [condition, setCondition] = useState<Condition>(initialState?.condition || 'normal');
  const [trainingGoal, setTrainingGoal] = useState<TrainingGoal>(initialState?.trainingGoal || 'hypertrophy');
  const [prAlert, setPRAlert] = useState<PRAlert | null>(null);
  const [routineId, setRoutineId] = useState<number | undefined>(initialState?.routineId);
  const [programInfo, setProgramInfo] = useState<{ programId: string; week: number; day: number } | undefined>(
    initialState?.programId ? { programId: initialState.programId, week: initialState.programWeek || 1, day: initialState.programDay || 0 } : undefined
  );

  // 자동 저장
  useEffect(() => {
    if (isActive) {
      storage.activeWorkout.set({
        isActive, exercises, startTime: startTimeMs, condition, trainingGoal,
        routineId, programId: programInfo?.programId, programWeek: programInfo?.week, programDay: programInfo?.day,
      });
    }
  }, [isActive, exercises, startTimeMs, condition, trainingGoal, routineId, programInfo]);

  // 페이지 이탈 경고
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isActive]);

  const startWorkout = useCallback(() => {
    setIsActive(true);
    setExercises([]);
    setStartTimeMs(Date.now());
    setRoutineId(undefined);
    setProgramInfo(undefined);
  }, []);

  const addExercise = useCallback(async (
    exerciseId: number,
    numSets: number = 1,
    initialSets?: { weight: number; reps: number }[],
  ) => {
    let prevSets: { weight: number; reps: number }[] = [];
    if (!initialSets) {
      try {
        const sessions = await db.sessions.orderBy('date').reverse().toArray();
        for (const session of sessions) {
          const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
          if (ex && ex.sets.some((s) => s.isCompleted)) {
            prevSets = ex.sets.filter((s) => s.isCompleted).map((s) => ({ weight: s.weight, reps: s.reps }));
            break;
          }
        }
      } catch { /* prev session lookup is best-effort */ }
    }

    const source = initialSets || prevSets;
    const actualSets = initialSets ? initialSets.length : Math.max(numSets, prevSets.length || numSets);

    setExercises((prev) => {
      if (prev.some((e) => e.exerciseId === exerciseId)) return prev;
      const sets: WorkoutSet[] = Array.from({ length: actualSets }, (_, i) => ({
        setNumber: i + 1,
        weight: source[i]?.weight || source[0]?.weight || 0,
        reps: source[i]?.reps || source[0]?.reps || 0,
        setType: 'normal', isCompleted: false, isPR: false,
      }));
      return [...prev, { exerciseId, order: prev.length, sets }];
    });
  }, []);

  const removeExercise = useCallback((exerciseId: number) => {
    setExercises((prev) => prev.filter((e) => e.exerciseId !== exerciseId));
  }, []);

  const moveExercise = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    setExercises((prev) => {
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const arr = [...prev];
      [arr[fromIndex], arr[toIndex]] = [arr[toIndex], arr[fromIndex]];
      return arr.map((ex, i) => ({ ...ex, order: i }));
    });
  }, []);

  const addWarmupSets = useCallback((exerciseId: number, warmups: { weight: number; reps: number }[]) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const warmupSets: WorkoutSet[] = warmups.map((w, i) => ({
          setNumber: i + 1, weight: w.weight, reps: w.reps,
          setType: 'warmup' as const, isCompleted: false, isPR: false,
        }));
        const existingSets = ex.sets.map((s, i) => ({ ...s, setNumber: warmups.length + i + 1 }));
        return { ...ex, sets: [...warmupSets, ...existingSets] };
      })
    );
  }, []);

  const addSet = useCallback((exerciseId: number) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, {
          setNumber: ex.sets.length + 1, weight: lastSet?.weight || 0, reps: lastSet?.reps || 0,
          setType: 'normal', isCompleted: false, isPR: false,
        }]};
      })
    );
  }, []);

  const removeSet = useCallback((exerciseId: number, setIndex: number) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId || ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, setNumber: i + 1 })) };
      })
    );
  }, []);

  const updateSet = useCallback((exerciseId: number, setIndex: number, updates: Partial<WorkoutSet>) => {
    if (updates.weight !== undefined) updates.weight = Math.max(0, updates.weight);
    if (updates.reps !== undefined) updates.reps = Math.max(0, Math.floor(updates.reps));
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        return { ...ex, sets: ex.sets.map((s, i) => (i === setIndex ? { ...s, ...updates } : s)) };
      })
    );
  }, []);

  const checkPR = useCallback(async (exerciseId: number, weight: number, reps: number) => {
    if (weight <= 0 || reps <= 0) return;
    const estimated1RM = weight * (1 + reps / 30);
    const existingPRs = await db.personalRecords.where('exerciseId').equals(exerciseId).sortBy('estimated1RM');
    const best = existingPRs[existingPRs.length - 1];
    if (!best || estimated1RM > best.estimated1RM) {
      const exercise = await db.exercises.get(exerciseId);
      setPRAlert({ exerciseId, exerciseName: exercise?.name || '', weight, reps, estimated1RM });
    }
  }, []);

  const completeSet = useCallback((exerciseId: number, setIndex: number, isBodyweight: boolean = false) => {
    let shouldCheckPR = false;
    let prWeight = 0, prReps = 0;

    setExercises((prev) => {
      const ex = prev.find((e) => e.exerciseId === exerciseId);
      const set = ex?.sets[setIndex];
      if (!set) return prev;

      const togglingToComplete = !set.isCompleted;
      if (togglingToComplete) {
        if (isBodyweight && set.reps <= 0) return prev;
        if (!isBodyweight && (set.weight <= 0 || set.reps <= 0)) return prev;
      }

      if (togglingToComplete) {
        shouldCheckPR = true;
        prWeight = set.weight;
        prReps = set.reps;
      }

      return prev.map((e) => {
        if (e.exerciseId !== exerciseId) return e;
        return { ...e, sets: e.sets.map((s, i) => (i === setIndex ? { ...s, isCompleted: !s.isCompleted } : s)) };
      });
    });

    if (shouldCheckPR) {
      checkPR(exerciseId, prWeight, prReps);
    }
  }, [checkPR]);

  const finishWorkout = useCallback(async () => {
    const validExercises = exercises
      .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.isCompleted && s.reps > 0) }))
      .filter((ex) => ex.sets.length > 0);

    if (validExercises.length === 0) return null;

    const endMs = Date.now();
    const durationSec = startTimeMs > 0 ? Math.floor((endMs - startTimeMs) / 1000) : 0;

    const session: WorkoutSession = {
      date: getLocalDate(),
      startTime: new Date(startTimeMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      duration: durationSec,
      condition,
      trainingGoal,
      routineId,
      programId: programInfo?.programId,
      programWeek: programInfo?.week,
      programDay: programInfo?.day,
      exercises: validExercises,
    };

    const id = await db.sessions.add(session);

    for (const ex of validExercises) {
      let bestSet: { weight: number; reps: number; estimated1RM: number } | null = null;
      for (const set of ex.sets) {
        if (set.setType === 'warmup' || set.weight <= 0) continue;
        const estimated1RM = set.weight * (1 + set.reps / 30);
        if (!bestSet || estimated1RM > bestSet.estimated1RM) {
          bestSet = { weight: set.weight, reps: set.reps, estimated1RM };
        }
      }
      if (!bestSet) continue;
      const existingPRs = await db.personalRecords.where('exerciseId').equals(ex.exerciseId).sortBy('estimated1RM');
      const currentBest = existingPRs[existingPRs.length - 1];
      if (!currentBest || bestSet.estimated1RM > currentBest.estimated1RM) {
        await db.personalRecords.add({
          exerciseId: ex.exerciseId, estimated1RM: bestSet.estimated1RM,
          maxWeight: bestSet.weight, maxReps: bestSet.reps,
          date: session.date, sessionId: id as number,
        });
      }
    }

    storage.activeWorkout.clear();
    setIsActive(false);
    setExercises([]);
    setStartTimeMs(0);
    return { id, session, validExercises };
  }, [exercises, startTimeMs, condition, trainingGoal, routineId, programInfo]);

  const cancelWorkout = useCallback(() => {
    storage.activeWorkout.clear();
    setIsActive(false);
    setExercises([]);
    setStartTimeMs(0);
    setRoutineId(undefined);
    setProgramInfo(undefined);
  }, []);

  return {
    isActive, exercises, startTimeMs, condition, trainingGoal, prAlert, setPRAlert,
    setCondition, setTrainingGoal, routineId, setRoutineId, programInfo, setProgramInfo,
    startWorkout, addExercise, removeExercise, moveExercise,
    addWarmupSets, addSet, removeSet, updateSet, completeSet,
    finishWorkout, cancelWorkout,
  };
}
