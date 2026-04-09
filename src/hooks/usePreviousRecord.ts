import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { WorkoutSet } from '../types';

export function usePreviousRecord(exerciseId: number): WorkoutSet[] | undefined {
  return useLiveQuery(async () => {
    // 최근 30개 세션만 검색 (성능 최적화)
    const sessions = await db.sessions.orderBy('date').reverse().limit(30).toArray();
    for (const session of sessions) {
      const exercise = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (exercise && exercise.sets.some((s) => s.isCompleted && s.setType !== 'warmup')) {
        return exercise.sets.filter((s) => s.isCompleted && s.setType !== 'warmup');
      }
    }
    return undefined;
  }, [exerciseId]);
}
