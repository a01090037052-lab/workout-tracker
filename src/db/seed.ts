import { db } from './index';
import { defaultExercises } from '../data/exercises';
import { defaultFoods } from '../data/foods';

const SEED_VERSION = 5; // 운동 목록 버전. 추가 시 올리면 기존 사용자도 업데이트
const FOOD_SEED_VERSION = 2; // 음식 데이터 버전. 추가/수정 시 올리면 기존 사용자도 갱신

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

export async function seedFoods() {
  const versionKey = await db.settings.get('foodSeedVersion');
  const currentVersion = versionKey ? Number(versionKey.value) : 0;

  if (currentVersion < FOOD_SEED_VERSION) {
    // 기존 커스텀 음식 보존, 기본 음식만 교체
    const customFoods = await db.foods.where('isCustom').equals(1).toArray();
    await db.foods.clear();
    await db.foods.bulkAdd(defaultFoods as any[]);
    if (customFoods.length > 0) {
      await db.foods.bulkAdd(customFoods);
    }
    await db.settings.put({ key: 'foodSeedVersion', value: FOOD_SEED_VERSION });
  }
}
