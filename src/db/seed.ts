import type { Table } from 'dexie';
import { db } from './index';
import { defaultExercises } from '../data/exercises';
import { defaultFoods } from '../data/foods';

const SEED_VERSION = 5; // 운동 목록 버전. 추가 시 올리면 기존 사용자도 업데이트
const FOOD_SEED_VERSION = 3; // 음식 데이터 버전. 추가/수정 시 올리면 기존 사용자도 갱신

/**
 * 이름 기준으로 기본 데이터를 동기화한다.
 *
 * clear() + bulkAdd()를 쓰면 안 되는 이유:
 * 1. isCustom은 boolean이라 IndexedDB가 인덱싱하지 못한다
 *    (where('isCustom').equals(1)이 항상 빈 배열 → 커스텀 항목이 전부 삭제됐음)
 * 2. clear()는 ++id 카운터를 리셋하지 않아 재시드마다 모든 기본 항목의 id가 바뀐다
 *    → 기존 세션/기록이 참조하던 exerciseId가 고아가 되어 '알 수 없음'으로 남는다
 *
 * 이름이 같으면 기존 id를 유지한 채 내용만 갱신하므로 과거 기록이 보존된다.
 */
async function syncByName<T extends { id?: number; name: string; isCustom: boolean }>(
  table: Table<T, number>,
  defaults: Omit<T, 'id'>[]
) {
  const existing = await table.toArray();
  const byName = new Map(existing.filter((e) => !e.isCustom).map((e) => [e.name, e]));
  const defaultNames = new Set(defaults.map((d) => d.name));

  for (const def of defaults) {
    const prev = byName.get(def.name);
    if (prev?.id !== undefined) {
      // id 유지 → 기존 기록의 참조가 살아있음
      await table.put({ ...(def as T), id: prev.id });
    } else {
      await table.add(def as T);
    }
  }

  // 기본 목록에서 빠진 항목만 정리.
  // isCustom === false 인 것만 지운다 — 백업 복원 등으로 필드가 누락된 레코드는
  // 사용자 데이터일 수 있으므로 삭제하지 않고 남겨둔다 (지우는 것보다 남기는 쪽이 안전).
  for (const old of existing) {
    if (old.isCustom === false && old.id !== undefined && !defaultNames.has(old.name)) {
      await table.delete(old.id);
    }
  }
}

export async function seedExercises() {
  const versionKey = await db.settings.get('seedVersion');
  const currentVersion = versionKey ? Number(versionKey.value) : 0;

  if (currentVersion < SEED_VERSION) {
    await syncByName(db.exercises, defaultExercises);
    await db.settings.put({ key: 'seedVersion', value: SEED_VERSION });
  }
}

export async function seedFoods() {
  const versionKey = await db.settings.get('foodSeedVersion');
  const currentVersion = versionKey ? Number(versionKey.value) : 0;

  if (currentVersion < FOOD_SEED_VERSION) {
    await syncByName(db.foods, defaultFoods);
    await db.settings.put({ key: 'foodSeedVersion', value: FOOD_SEED_VERSION });
  }
}
