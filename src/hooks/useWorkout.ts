import { useState, useRef, useCallback, useEffect } from 'react';
import { db } from '../db';
import type { WorkoutExercise, WorkoutSet, WorkoutSession, Condition, TrainingGoal } from '../types';

export interface PRAlert {
  exerciseId: number;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
}

export function useWorkout() {
  const [isActive, setIsActive] = useState(false);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [duration, setDuration] = useState(0);
  const [condition, setCondition] = useState<Condition>('normal');
  const [trainingGoal, setTrainingGoal] = useState<TrainingGoal>('hypertrophy');
  const [prAlert, setPRAlert] = useState<PRAlert | null>(null);
  const startTimeRef = useRef<string>('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startWorkout = useCallback(() => {
    setIsActive(true);
    setExercises([]);
    setDuration(0);
    startTimeRef.current = new Date().toISOString();
    timerRef.current = window.setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  }, []);

  const addExercise = useCallback((exerciseId: number) => {
    setExercises((prev) => {
      if (prev.some((e) => e.exerciseId === exerciseId)) return prev;
      return [
        ...prev,
        {
          exerciseId,
          order: prev.length,
          sets: [{ setNumber: 1, weight: 0, reps: 0, setType: 'normal', isCompleted: false, isPR: false }],
        },
      ];
    });
  }, []);

  const removeExercise = useCallback((exerciseId: number) => {
    setExercises((prev) => prev.filter((e) => e.exerciseId !== exerciseId));
  }, []);

  const addSet = useCallback((exerciseId: number) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              setNumber: ex.sets.length + 1,
              weight: lastSet?.weight || 0,
              reps: lastSet?.reps || 0,
              setType: 'normal',
              isCompleted: false,
              isPR: false,
            },
          ],
        };
      })
    );
  }, []);

  const removeSet = useCallback((exerciseId: number, setIndex: number) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        if (ex.sets.length <= 1) return ex;
        const newSets = ex.sets.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, setNumber: i + 1 }));
        return { ...ex, sets: newSets };
      })
    );
  }, []);

  const updateSet = useCallback((exerciseId: number, setIndex: number, updates: Partial<WorkoutSet>) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, i) => (i === setIndex ? { ...s, ...updates } : s)),
        };
      })
    );
  }, []);

  const checkPR = useCallback(async (exerciseId: number, weight: number, reps: number) => {
    if (weight <= 0 || reps <= 0) return;
    const estimated1RM = weight * (1 + reps / 30);
    const existingPRs = await db.personalRecords
      .where('exerciseId')
      .equals(exerciseId)
      .sortBy('estimated1RM');
    const best = existingPRs[existingPRs.length - 1];
    if (!best || estimated1RM > best.estimated1RM) {
      const exercise = await db.exercises.get(exerciseId);
      setPRAlert({
        exerciseId,
        exerciseName: exercise?.name || '',
        weight,
        reps,
        estimated1RM,
      });
    }
  }, []);

  const completeSet = useCallback((exerciseId: number, setIndex: number) => {
    setExercises((prev) => {
      const updated = prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, i) => (i === setIndex ? { ...s, isCompleted: !s.isCompleted } : s)),
        };
      });
      // PR 체크 (완료로 전환될 때만)
      const ex = prev.find((e) => e.exerciseId === exerciseId);
      const set = ex?.sets[setIndex];
      if (set && !set.isCompleted) {
        checkPR(exerciseId, set.weight, set.reps);
      }
      return updated;
    });
  }, [checkPR]);

  const finishWorkout = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const session: WorkoutSession = {
      date: new Date().toISOString().split('T')[0],
      startTime: startTimeRef.current,
      endTime: new Date().toISOString(),
      duration,
      condition,
      trainingGoal,
      exercises,
    };

    const id = await db.sessions.add(session);

    // PR 체크
    for (const ex of exercises) {
      for (const set of ex.sets) {
        if (!set.isCompleted || set.weight === 0) continue;
        const estimated1RM = set.weight * (1 + set.reps / 30);
        const existingPR = await db.personalRecords
          .where('exerciseId')
          .equals(ex.exerciseId)
          .sortBy('estimated1RM');
        const best = existingPR[existingPR.length - 1];
        if (!best || estimated1RM > best.estimated1RM) {
          await db.personalRecords.add({
            exerciseId: ex.exerciseId,
            estimated1RM,
            maxWeight: set.weight,
            maxReps: set.reps,
            date: session.date,
            sessionId: id as number,
          });
        }
      }
    }

    setIsActive(false);
    setExercises([]);
    setDuration(0);
    return id;
  }, [exercises, duration, condition, trainingGoal]);

  const cancelWorkout = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setExercises([]);
    setDuration(0);
  }, []);

  return {
    isActive,
    exercises,
    duration,
    condition,
    trainingGoal,
    prAlert,
    setPRAlert,
    setCondition,
    setTrainingGoal,
    startWorkout,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    completeSet,
    finishWorkout,
    cancelWorkout,
  };
}
