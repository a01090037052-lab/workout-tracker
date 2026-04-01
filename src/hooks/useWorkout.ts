import { useState, useRef, useCallback, useEffect } from 'react';
import { db } from '../db';
import { getLocalDate } from './useLocalDate';
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
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  // 페이지 이탈 경고
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startWorkout = useCallback(() => {
    setIsActive(true);
    setExercises([]);
    setDuration(0);
    startTimeRef.current = Date.now();
    // 실제 경과 시간 기반 타이머 (백그라운드에서도 정확)
    timerRef.current = window.setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const addExercise = useCallback((exerciseId: number, numSets: number = 1) => {
    setExercises((prev) => {
      if (prev.some((e) => e.exerciseId === exerciseId)) return prev;
      const sets: WorkoutSet[] = Array.from({ length: numSets }, (_, i) => ({
        setNumber: i + 1,
        weight: 0,
        reps: 0,
        setType: 'normal',
        isCompleted: false,
        isPR: false,
      }));
      return [
        ...prev,
        { exerciseId, order: prev.length, sets },
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
    // 음수 방지
    if (updates.weight !== undefined) updates.weight = Math.max(0, updates.weight);
    if (updates.reps !== undefined) updates.reps = Math.max(0, Math.floor(updates.reps));
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
      const ex = prev.find((e) => e.exerciseId === exerciseId);
      const set = ex?.sets[setIndex];
      if (!set) return prev;

      // 완료 전환 시 무게/횟수 검증
      if (!set.isCompleted && (set.weight <= 0 || set.reps <= 0)) {
        return prev; // 0kg 또는 0회는 완료 불가
      }

      const updated = prev.map((e) => {
        if (e.exerciseId !== exerciseId) return e;
        return {
          ...e,
          sets: e.sets.map((s, i) => (i === setIndex ? { ...s, isCompleted: !s.isCompleted } : s)),
        };
      });

      // PR 체크 (완료로 전환될 때만)
      if (!set.isCompleted) {
        checkPR(exerciseId, set.weight, set.reps);
      }
      return updated;
    });
  }, [checkPR]);

  const finishWorkout = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    // 완료된 세트가 있는 운동만 필터
    const validExercises = exercises
      .map((ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.isCompleted && s.weight > 0 && s.reps > 0),
      }))
      .filter((ex) => ex.sets.length > 0);

    if (validExercises.length === 0) {
      setIsActive(false);
      setExercises([]);
      setDuration(0);
      return null;
    }

    const session: WorkoutSession = {
      date: getLocalDate(),
      startTime: new Date(startTimeRef.current).toISOString(),
      endTime: new Date().toISOString(),
      duration,
      condition,
      trainingGoal,
      exercises: validExercises,
    };

    const id = await db.sessions.add(session);

    // PR 체크: 종목별로 가장 높은 1RM만 저장 (중복 방지)
    for (const ex of validExercises) {
      let bestSet: { weight: number; reps: number; estimated1RM: number } | null = null;
      for (const set of ex.sets) {
        const estimated1RM = set.weight * (1 + set.reps / 30);
        if (!bestSet || estimated1RM > bestSet.estimated1RM) {
          bestSet = { weight: set.weight, reps: set.reps, estimated1RM };
        }
      }
      if (!bestSet) continue;

      const existingPRs = await db.personalRecords
        .where('exerciseId')
        .equals(ex.exerciseId)
        .sortBy('estimated1RM');
      const currentBest = existingPRs[existingPRs.length - 1];

      if (!currentBest || bestSet.estimated1RM > currentBest.estimated1RM) {
        await db.personalRecords.add({
          exerciseId: ex.exerciseId,
          estimated1RM: bestSet.estimated1RM,
          maxWeight: bestSet.weight,
          maxReps: bestSet.reps,
          date: session.date,
          sessionId: id as number,
        });
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
