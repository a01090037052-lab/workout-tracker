import { db } from '../db';

/**
 * PR 재계산 (누적 방식)
 * 세션을 날짜순으로 순회하며, 이전 best를 초과한 시점마다 PR 레코드를 생성.
 * 1RM 변화 그래프의 히스토리가 보존됨.
 */
export async function recalculatePRs(exerciseIds: number[]) {
  const sessions = await db.sessions.orderBy('date').toArray();

  for (const exId of exerciseIds) {
    // 기존 PR 전부 삭제
    await db.personalRecords.where('exerciseId').equals(exId).delete();

    // 날짜순으로 세션을 순회하며 누적 best 추적
    let currentBest = 0;

    for (const s of sessions) {
      const ex = s.exercises.find((e) => e.exerciseId === exId);
      if (!ex) continue;

      // 이 세션에서의 best 찾기
      let sessionBest: { estimated1RM: number; maxWeight: number; maxReps: number } | null = null;
      for (const set of ex.sets) {
        if (!set.isCompleted || set.weight <= 0 || set.setType === 'warmup') continue;
        const est = set.weight * (1 + set.reps / 30);
        if (!sessionBest || est > sessionBest.estimated1RM) {
          sessionBest = { estimated1RM: est, maxWeight: set.weight, maxReps: set.reps };
        }
      }

      // 이전 best를 초과하면 새 PR 레코드 추가
      if (sessionBest && sessionBest.estimated1RM > currentBest) {
        currentBest = sessionBest.estimated1RM;
        await db.personalRecords.add({
          exerciseId: exId,
          estimated1RM: sessionBest.estimated1RM,
          maxWeight: sessionBest.maxWeight,
          maxReps: sessionBest.maxReps,
          date: s.date,
          sessionId: s.id!,
        });
      }
    }
  }
}
