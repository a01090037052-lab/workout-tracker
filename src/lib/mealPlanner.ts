import { db } from '../db';
import { storage } from './storage';
import { calcMacros } from './nutrition';
import { getFoodUsageFrequency } from './coach';
import type { Food, FoodCategory, MealType, NutritionProfile, MealPlanResult, PlannedMeal, PlannedItem, MacroEntry } from '../types';

// 끼니별 칼로리 비율 (베테랑 영양사 분배)
const MEAL_DISTRIBUTION: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.30,
  snack: 0.10,
};

/** 식단 자동 생성 — 하이브리드 (균형 배분 + 선호 보정) */
export async function planTodaysMeals(profile: NutritionProfile): Promise<MealPlanResult> {
  const target = calcMacros(profile, profile.goal);
  const allFoods = await db.foods.toArray();
  const usageFreq = await getFoodUsageFrequency();
  const prefs = storage.dietPreferences.get();
  const excluded = new Set(prefs.excludedFoodIds);

  // 사용 가능한 음식 + 선호도 정렬
  const sortByPreference = (foods: Food[]) =>
    foods.sort((a, b) => (usageFreq.get(b.name) || 0) - (usageFreq.get(a.name) || 0));

  // 카테고리별 분리 + 알레르기 제외
  const byCategory: Partial<Record<FoodCategory, Food[]>> = {};
  for (const f of allFoods) {
    if (f.id !== undefined && excluded.has(f.id)) continue;
    if (!byCategory[f.category]) byCategory[f.category] = [];
    byCategory[f.category]!.push(f);
  }
  for (const cat of Object.keys(byCategory) as FoodCategory[]) {
    byCategory[cat] = sortByPreference(byCategory[cat]!);
  }

  const meals: PlannedMeal[] = [];
  let cumulP = 0, cumulC = 0, cumulF = 0;

  for (const mealType of ['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]) {
    const ratio = MEAL_DISTRIBUTION[mealType];
    const targetKcal = Math.round(target.kcal * ratio);
    const targetP = target.protein * ratio;
    const targetC = target.carbs * ratio;
    const targetF = target.fat * ratio;

    const items = pickMealItems(byCategory, mealType, { kcal: targetKcal, p: targetP, c: targetC, f: targetF }, prefs.simpleMode);
    meals.push({ mealType, ratio, targetKcal, items });

    cumulP += items.reduce((s, i) => s + i.protein, 0);
    cumulC += items.reduce((s, i) => s + i.carbs, 0);
    cumulF += items.reduce((s, i) => s + i.fat, 0);
  }

  const totalKcal = meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.kcal, 0), 0);
  const matchRatio = target.kcal > 0 ? Math.min(1.2, totalKcal / target.kcal) : 0;

  return {
    meals,
    totalKcal,
    totalProtein: Math.round(cumulP),
    totalCarbs: Math.round(cumulC),
    totalFat: Math.round(cumulF),
    matchRatio,
  };
}

function pickMealItems(
  byCategory: Partial<Record<FoodCategory, Food[]>>,
  mealType: MealType,
  needs: { kcal: number; p: number; c: number; f: number },
  simpleMode: boolean,
): PlannedItem[] {
  const items: PlannedItem[] = [];
  const protList = byCategory.protein || [];
  const dairyList = byCategory.dairy || [];
  const grainList = byCategory.grain || [];
  const fruitList = byCategory.fruit || [];
  const vegList = byCategory.vegetable || [];

  // 1) 단백질 (메인): 매크로 비례 분량 (50~250g)
  if (protList.length > 0 && needs.p > 5) {
    const pick = protList[0];
    const grams = roundTo10(Math.min(250, Math.max(50, (needs.p / Math.max(8, pick.proteinPer100g)) * 100)));
    items.push(toItem(pick, grams));
  }

  // 2) 탄수 (메인, 간식 제외): 50~300g
  if (mealType !== 'snack' && grainList.length > 0 && needs.c > 10) {
    const pick = grainList[0];
    const grams = roundTo10(Math.min(300, Math.max(50, (needs.c / Math.max(15, pick.carbsPer100g)) * 100)));
    items.push(toItem(pick, grams));
  }

  // 3) 채소 (점심·저녁만)
  if (!simpleMode && (mealType === 'lunch' || mealType === 'dinner') && vegList.length > 0) {
    const pick = vegList[0];
    items.push(toItem(pick, 100));
  }

  // 4) 간식 보충: 유제품 또는 과일
  if (mealType === 'snack') {
    if (dairyList.length > 0) {
      items.push(toItem(dairyList[0], dairyList[0].defaultServing || 100));
    } else if (fruitList.length > 0) {
      items.push(toItem(fruitList[0], fruitList[0].defaultServing || 100));
    }
  }

  // 5) 아침에 유제품 또는 과일 보충 (simpleMode 아닐 때)
  if (!simpleMode && mealType === 'breakfast') {
    if (fruitList.length > 0) {
      items.push(toItem(fruitList[0], fruitList[0].defaultServing || 100));
    } else if (dairyList.length > 0) {
      items.push(toItem(dairyList[0], dairyList[0].defaultServing || 100));
    }
  }

  return items;
}

function roundTo10(g: number): number {
  return Math.max(10, Math.round(g / 10) * 10);
}

function toItem(food: Food, grams: number): PlannedItem {
  const ratio = grams / 100;
  return {
    foodId: food.id!,
    foodName: food.name,
    category: food.category,
    grams,
    kcal: Math.round(food.kcalPer100g * ratio),
    protein: Math.round(food.proteinPer100g * ratio * 10) / 10,
    carbs: Math.round(food.carbsPer100g * ratio * 10) / 10,
    fat: Math.round(food.fatPer100g * ratio * 10) / 10,
  };
}

/** 특정 위치의 음식을 다른 음식으로 교체 (swap) */
export async function swapMealItem(
  current: PlannedItem,
  excludeId: number,
): Promise<PlannedItem | null> {
  const allFoods = await db.foods.toArray();
  const usageFreq = await getFoodUsageFrequency();
  const prefs = storage.dietPreferences.get();
  const excluded = new Set([...prefs.excludedFoodIds, excludeId]);

  // 같은 카테고리 + 매크로 유사 후보
  const candidates = allFoods
    .filter((f) => f.id !== undefined && f.category === current.category && !excluded.has(f.id))
    .sort((a, b) => (usageFreq.get(b.name) || 0) - (usageFreq.get(a.name) || 0));

  if (candidates.length === 0) return null;

  // 분량 유지 + 매크로 재계산
  const pick = candidates[0];
  return toItem(pick, current.grams);
}

/** 식단 결과를 MacroEntry 배열로 변환 (식사 적용용) */
export function planToEntries(result: MealPlanResult): MacroEntry[] {
  const entries: MacroEntry[] = [];
  for (const meal of result.meals) {
    for (const item of meal.items) {
      entries.push({
        name: `${item.foodName} ${item.grams}g`,
        mealType: meal.mealType,
        kcal: item.kcal,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      });
    }
  }
  return entries;
}
