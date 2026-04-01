import { db } from './index';
import { defaultExercises } from '../data/exercises';

export async function seedExercises() {
  const count = await db.exercises.count();
  if (count === 0) {
    await db.exercises.bulkAdd(defaultExercises as any[]);
  }
}
