import { db } from '../db';
import type { Goal, GoalType } from '../types';

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  oneRepMax: '1RM (kg)',
  bodyWeight: '체중 (kg)',
  weeklyWorkouts: '주간 운동 횟수',
};

export const GOAL_TYPE_ICONS: Record<GoalType, string> = {
  oneRepMax: '💪',
  bodyWeight: '⚖',
  weeklyWorkouts: '🔥',
};

/** 목표의 현재값을 실제 데이터에서 계산 */
export async function getCurrentValue(goal: Goal): Promise<number> {
  switch (goal.type) {
    case 'oneRepMax': {
      if (!goal.exerciseName) return goal.startValue;
      const exercises = await db.exercises.toArray();
      const ex = exercises.find((e) => e.name === goal.exerciseName);
      if (!ex || !ex.id) return goal.startValue;
      const prs = await db.personalRecords.where('exerciseId').equals(ex.id).sortBy('estimated1RM');
      return prs.length > 0 ? Math.round(prs[prs.length - 1].estimated1RM) : goal.startValue;
    }
    case 'bodyWeight': {
      const recent = await db.bodyWeightLogs.orderBy('date').reverse().limit(1).toArray();
      return recent[0]?.weight ?? goal.startValue;
    }
    case 'weeklyWorkouts': {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      const startStr = start.toISOString().split('T')[0];
      const sessions = await db.sessions.where('date').aboveOrEqual(startStr).toArray();
      return new Set(sessions.map((s) => s.date)).size;
    }
  }
}

/** 진행률 % (0~100, 방향 자동 — 감량 목표면 startValue > targetValue) */
export function calcProgress(goal: Goal, current: number): number {
  const range = goal.targetValue - goal.startValue;
  if (range === 0) return current >= goal.targetValue ? 100 : 0;
  const pct = ((current - goal.startValue) / range) * 100;
  return Math.max(0, Math.min(100, pct));
}

/** 남은 일수 (음수면 기한 지남) */
export function daysLeft(goal: Goal): number {
  const target = new Date(goal.targetDate + 'T12:00:00').getTime();
  return Math.ceil((target - Date.now()) / 86400000);
}

/** 목표 달성 여부 자동 판정 (방향 무관) */
export function isAchieved(goal: Goal, current: number): boolean {
  if (goal.targetValue >= goal.startValue) {
    return current >= goal.targetValue;  // 증량 목표
  }
  return current <= goal.targetValue;     // 감량 목표
}
