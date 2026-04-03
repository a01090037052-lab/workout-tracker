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

const STORAGE_KEY = 'activeWorkout';

interface SavedWorkout {
  isActive: boolean;
  exercises: WorkoutExercise[];
  startTime: number;
  condition: Condition;
  trainingGoal: TrainingGoal;
}

function saveToStorage(data: SavedWorkout) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function loadFromStorage(): SavedWorkout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useWorkout() {
  const saved = loadFromStorage();

  const [isActive, setIsActive] = useState(saved?.isActive || false);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(saved?.exercises || []);
  const [duration, setDuration] = useState(0);
  const [condition, setCondition] = useState<Condition>(saved?.condition || 'normal');
  const [trainingGoal, setTrainingGoal] = useState<TrainingGoal>(saved?.trainingGoal || 'hypertrophy');
  const [prAlert, setPRAlert] = useState<PRAlert | null>(null);
  const startTimeRef = useRef<number>(saved?.startTime || 0);
  const timerRef = useRef<number | null>(null);

  // 타이머 복구 및 시작
  useEffect(() => {
    if (isActive && startTimeRef.current > 0 && !timerRef.current) {
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [isActive]);

  // 자동 저장 (exercises, condition, trainingGoal 변경 시)
  useEffect(() => {
    if (isActive) {
      saveToStorage({ isActive, exercises, startTime: startTimeRef.current, condition, trainingGoal });
    }
  }, [isActive, exercises, condition, trainingGoal]);

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
    setDuration(0);
    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const addExercise = useCallback(async (exerciseId: number, numSets: number = 1) => {
    // 이전 기록에서 무게/횟수 가져오기
    let prevSets: { weight: number; reps: number }[] = [];
    try {
      const sessions = await db.sessions.orderBy('date').reverse().toArray();
      for (const session of sessions) {
        const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
        if (ex && ex.sets.some((s) => s.isCompleted)) {
          prevSets = ex.sets.filter((s) => s.isCompleted).map((s) => ({ weight: s.weight, reps: s.reps }));
          break;
        }
      }
    } catch {}

    setExercises((prev) => {
      if (prev.some((e) => e.exerciseId === exerciseId)) return prev;
      const actualSets = Math.max(numSets, prevSets.length || numSets);
      const sets: WorkoutSet[] = Array.from({ length: actualSets }, (_, i) => ({
        setNumber: i + 1,
        weight: prevSets[i]?.weight || prevSets[0]?.weight || 0,
        reps: prevSets[i]?.reps || prevSets[0]?.reps || 0,
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

  const completeSet = useCallback((exerciseId: number, setIndex: number) => {
    setExercises((prev) => {
      const ex = prev.find((e) => e.exerciseId === exerciseId);
      const set = ex?.sets[setIndex];
      if (!set) return prev;

      // 완료 전환 시 무게/횟수 검증
      const togglingToComplete = !set.isCompleted;
      if (togglingToComplete && (set.weight <= 0 || set.reps <= 0)) return prev;

      const updated = prev.map((e) => {
        if (e.exerciseId !== exerciseId) return e;
        return { ...e, sets: e.sets.map((s, i) => (i === setIndex ? { ...s, isCompleted: !s.isCompleted } : s)) };
      });

      // PR 체크: 완료로 전환될 때, 현재 세트의 값 사용
      if (togglingToComplete) {
        checkPR(exerciseId, set.weight, set.reps);
      }

      // 즉시 localStorage 저장 (세트 완료 상태 보존)
      saveToStorage({
        isActive: true,
        exercises: updated,
        startTime: startTimeRef.current,
        condition,
        trainingGoal,
      });

      return updated;
    });
  }, [checkPR, condition, trainingGoal]);

  const finishWorkout = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    const validExercises = exercises
      .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.isCompleted && s.weight > 0 && s.reps > 0) }))
      .filter((ex) => ex.sets.length > 0);

    if (validExercises.length === 0) {
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

    for (const ex of validExercises) {
      let bestSet: { weight: number; reps: number; estimated1RM: number } | null = null;
      for (const set of ex.sets) {
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

    clearStorage();
    setIsActive(false);
    setExercises([]);
    setDuration(0);
    return { id, session, validExercises };
  }, [exercises, duration, condition, trainingGoal]);

  const cancelWorkout = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    clearStorage();
    setIsActive(false);
    setExercises([]);
    setDuration(0);
  }, []);

  return {
    isActive, exercises, duration, condition, trainingGoal, prAlert, setPRAlert,
    setCondition, setTrainingGoal,
    startWorkout, addExercise, removeExercise, moveExercise,
    addWarmupSets, addSet, removeSet, updateSet, completeSet,
    finishWorkout, cancelWorkout,
  };
}
