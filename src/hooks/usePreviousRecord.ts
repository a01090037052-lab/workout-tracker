import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { WorkoutSet } from '../types';

export function usePreviousRecord(exerciseId: number): WorkoutSet[] | undefined {
  return useLiveQuery(async () => {
    // DB 에러(백그라운드 전환 시 연결 종료 등)가 렌더를 죽이지 않도록 격리.
    // useLiveQuery는 rejection을 렌더 중 throw하므로 여기서 삼켜야 함.
    try {
      // 최근 30개 세션만 검색 (성능 최적화)
      const sessions = await db.sessions.orderBy('date').reverse().limit(30).toArray();
      for (const session of sessions) {
        const exercise = session.exercises.find((e) => e.exerciseId === exerciseId);
        if (exercise && exercise.sets.some((s) => s.isCompleted && s.setType !== 'warmup')) {
          return exercise.sets.filter((s) => s.isCompleted && s.setType !== 'warmup');
        }
      }
      return undefined;
    } catch (e) {
      console.error('[usePreviousRecord]', e);
      return undefined;
    }
  }, [exerciseId]);
}
