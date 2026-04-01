import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { WorkoutSet } from '../types';

export function usePreviousRecord(exerciseId: number): WorkoutSet[] | undefined {
  return useLiveQuery(async () => {
    const sessions = await db.sessions.orderBy('date').reverse().toArray();
    for (const session of sessions) {
      const exercise = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (exercise && exercise.sets.some((s) => s.isCompleted)) {
        return exercise.sets.filter((s) => s.isCompleted);
      }
    }
    return undefined;
  }, [exerciseId]);
}
