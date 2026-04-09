import { db } from '../db';

export async function recalculatePRs(exerciseIds: number[]) {
  for (const exId of exerciseIds) {
    // 기존 PR 전부 삭제
    await db.personalRecords.where('exerciseId').equals(exId).delete();

    // 모든 세션에서 해당 종목의 best 찾기
    const sessions = await db.sessions.toArray();
    let best: { estimated1RM: number; maxWeight: number; maxReps: number; date: string; sessionId: number } | null = null;

    for (const s of sessions) {
      const ex = s.exercises.find((e) => e.exerciseId === exId);
      if (!ex) continue;
      for (const set of ex.sets) {
        if (!set.isCompleted || set.weight <= 0 || set.setType === 'warmup') continue;
        const est = set.weight * (1 + set.reps / 30);
        if (!best || est > best.estimated1RM) {
          best = { estimated1RM: est, maxWeight: set.weight, maxReps: set.reps, date: s.date, sessionId: s.id! };
        }
      }
    }

    if (best) {
      await db.personalRecords.add({ exerciseId: exId, ...best });
    }
  }
}
