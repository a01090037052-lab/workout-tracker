import { db } from './index';
import { defaultExercises } from '../data/exercises';

const SEED_VERSION = 3; // 운동 목록 버전. 추가 시 올리면 기존 사용자도 업데이트

export async function seedExercises() {
  const versionKey = await db.settings.get('seedVersion');
  const currentVersion = versionKey ? Number(versionKey.value) : 0;

  if (currentVersion < SEED_VERSION) {
    // 기존 커스텀 운동 보존, 기본 운동만 교체
    const customExercises = await db.exercises.where('isCustom').equals(1).toArray();
    await db.exercises.clear();
    await db.exercises.bulkAdd(defaultExercises as any[]);
    if (customExercises.length > 0) {
      await db.exercises.bulkAdd(customExercises);
    }
    await db.settings.put({ key: 'seedVersion', value: SEED_VERSION });
  }
}
