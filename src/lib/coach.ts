import { db } from '../db';
import type { Food, MacroEntry, WorkoutSession, DietGoal } from '../types';
import type { MacroTarget } from './nutrition';

// ============================================================
// 다음 식사 추천 (실시간 격차 보완)
// ============================================================
export interface RecommendedFood {
  name: string;
  category: Food['category'];
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealRecommendation {
  reason: string;
  primary: 'protein' | 'carbs' | 'fat' | 'kcal';
  remaining: { kcal: number; protein: number; carbs: number; fat: number };
  foods: RecommendedFood[];
}

export async function recommendNextMeal(
  totals: { kcal: number; protein: number; carbs: number; fat: number },
  target: MacroTarget,
): Promise<MealRecommendation | null> {
  const remaining = {
    kcal: target.kcal - totals.kcal,
    protein: target.protein - totals.protein,
    carbs: target.carbs - totals.carbs,
    fat: target.fat - totals.fat,
  };

  // 거의 충족됨 (단백질 5g 이내 + 칼로리 100kcal 이내)
  if (remaining.protein <= 5 && remaining.kcal <= 100) return null;

  // 가장 부족한 매크로 식별 (단백질 우선)
  let primary: 'protein' | 'carbs' | 'fat' | 'kcal' = 'protein';
  let reason: string;

  const proteinShortPct = target.protein > 0 ? (remaining.protein / target.protein) * 100 : 0;
  const carbShortPct = target.carbs > 0 ? (remaining.carbs / target.carbs) * 100 : 0;

  if (proteinShortPct > 25 && remaining.protein > 10) {
    primary = 'protein';
    reason = `남은 단백질 ${Math.round(remaining.protein)}g — 단백질 식품 권장`;
  } else if (carbShortPct > 30 && remaining.carbs > 30) {
    primary = 'carbs';
    reason = `남은 탄수 ${Math.round(remaining.carbs)}g — 클린 탄수 권장`;
  } else if (remaining.kcal > 200) {
    primary = 'kcal';
    reason = `남은 칼로리 ${Math.round(remaining.kcal)} — 균형 식사 권장`;
  } else {
    return null;
  }

  const allFoods = await db.foods.toArray();

  // 카테고리 + 매크로 우선순위로 후보 필터
  let candidates: Food[] = [];
  if (primary === 'protein') {
    candidates = allFoods
      .filter((f) => f.proteinPer100g >= 15 && f.kcalPer100g < 600 && f.category !== 'sauce')
      .sort((a, b) => {
        // 단백질/kcal 효율 우선 (단위 칼로리당 단백질 ↑)
        const effA = a.proteinPer100g / Math.max(50, a.kcalPer100g);
        const effB = b.proteinPer100g / Math.max(50, b.kcalPer100g);
        return effB - effA;
      });
  } else if (primary === 'carbs') {
    candidates = allFoods
      .filter((f) => f.carbsPer100g >= 20 && (f.category === 'grain' || f.category === 'fruit'))
      .sort((a, b) => b.carbsPer100g - a.carbsPer100g);
  } else {
    // 균형 — 단백질 + 적당한 탄수
    candidates = allFoods
      .filter((f) => f.proteinPer100g >= 10 && f.carbsPer100g >= 10 && f.kcalPer100g < 400)
      .sort((a, b) => (b.proteinPer100g + b.carbsPer100g) - (a.proteinPer100g + a.carbsPer100g));
  }

  // 상위 3개 추천 + 분량 계산
  const foods: RecommendedFood[] = candidates.slice(0, 3).map((f) => {
    let grams: number;
    if (primary === 'protein') {
      const needed = Math.min(50, remaining.protein); // 한 끼 최대 50g 권장
      grams = Math.max(50, Math.round((needed * 100) / f.proteinPer100g / 10) * 10);
    } else if (primary === 'carbs') {
      const needed = Math.min(80, remaining.carbs);
      grams = Math.max(50, Math.round((needed * 100) / f.carbsPer100g / 10) * 10);
    } else {
      grams = f.defaultServing || 100;
    }
    grams = Math.min(grams, 400); // 너무 많지 않게

    const ratio = grams / 100;
    return {
      name: f.name,
      category: f.category,
      grams,
      kcal: Math.round(f.kcalPer100g * ratio),
      protein: Math.round(f.proteinPer100g * ratio * 10) / 10,
      carbs: Math.round(f.carbsPer100g * ratio * 10) / 10,
      fat: Math.round(f.fatPer100g * ratio * 10) / 10,
    };
  });

  return { reason, primary, remaining, foods };
}

/** RecommendedFood → MacroEntry 변환 (식사 추가용) */
export function toMacroEntry(rec: RecommendedFood, mealType: MacroEntry['mealType']): MacroEntry {
  return {
    name: `${rec.name} ${rec.grams}g`,
    mealType,
    kcal: rec.kcal,
    protein: rec.protein,
    carbs: rec.carbs,
    fat: rec.fat,
  };
}

// ============================================================
// 일일 식단 점수 (100점 만점)
// ============================================================
export interface DailyScore {
  total: number;
  breakdown: {
    protein: number;     // 40
    calorie: number;     // 20
    balance: number;     // 15
    diversity: number;   // 15
    natural: number;     // 10
  };
  insights: string[];
}

export function calcDailyScore(
  entries: MacroEntry[],
  totals: { kcal: number; protein: number; carbs: number; fat: number },
  target: MacroTarget,
  foods: Food[],
): DailyScore {
  const insights: string[] = [];

  // 1. 단백질 충족도 (40점) — 100% 만점, 80% 미만 빠르게 감점
  const proteinRatio = target.protein > 0 ? totals.protein / target.protein : 0;
  let proteinScore: number;
  if (proteinRatio >= 0.95) proteinScore = 40;
  else if (proteinRatio >= 0.85) proteinScore = 35;
  else if (proteinRatio >= 0.75) proteinScore = 28;
  else if (proteinRatio >= 0.6) proteinScore = 20;
  else proteinScore = Math.round(proteinRatio * 30);
  if (proteinScore < 30) insights.push(`단백질 충족도 ${Math.round(proteinRatio * 100)}% — 더 챙겨야 해요`);

  // 2. 칼로리 정확도 (20점) — ±5% 만점
  let calorieScore: number;
  if (totals.kcal === 0) {
    calorieScore = 0;
  } else {
    const calDelta = Math.abs(totals.kcal - target.kcal) / target.kcal;
    if (calDelta <= 0.05) calorieScore = 20;
    else if (calDelta <= 0.10) calorieScore = 16;
    else if (calDelta <= 0.20) calorieScore = 10;
    else calorieScore = 5;
    if (totals.kcal > target.kcal * 1.15) insights.push(`칼로리 +${Math.round((totals.kcal - target.kcal))}kcal 초과`);
    else if (totals.kcal < target.kcal * 0.7) insights.push(`칼로리 부족 (${Math.round(totals.kcal)}/${target.kcal})`);
  }

  // 3. 매크로 균형 (15점) — target 대비 P/C/F 비율 격차
  let balanceScore = 15;
  if (totals.kcal > 0) {
    const actualKcalTotal = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
    const targetKcalTotal = target.protein * 4 + target.carbs * 4 + target.fat * 9;
    if (actualKcalTotal > 0 && targetKcalTotal > 0) {
      const diff =
        Math.abs(totals.protein * 4 / actualKcalTotal - target.protein * 4 / targetKcalTotal) +
        Math.abs(totals.carbs * 4 / actualKcalTotal - target.carbs * 4 / targetKcalTotal) +
        Math.abs(totals.fat * 9 / actualKcalTotal - target.fat * 9 / targetKcalTotal);
      balanceScore = Math.max(0, Math.round(15 - diff * 25));
    }
  }

  // 4. 다양성 (15점) — 식품 카테고리 다양성
  const usedCategories = new Set<string>();
  for (const e of entries) {
    // entry name에 등록된 식품 매칭 시도
    const matched = foods.find((f) => e.name.startsWith(f.name));
    if (matched) usedCategories.add(matched.category);
  }
  const diversityScore = Math.min(15, usedCategories.size * 3); // 5+ 카테고리 = 만점
  if (diversityScore < 9) insights.push(`식품 다양성 부족 (${usedCategories.size}종 카테고리)`);

  // 5. 자연식 비율 (10점) — processed/delivery 비율 낮을수록 ↑
  let processedCount = 0;
  let totalMatched = 0;
  for (const e of entries) {
    const matched = foods.find((f) => e.name.startsWith(f.name));
    if (matched) {
      totalMatched++;
      if (matched.category === 'processed' || matched.category === 'delivery') processedCount++;
    }
  }
  const processedRatio = totalMatched > 0 ? processedCount / totalMatched : 0;
  const naturalScore = Math.round((1 - processedRatio) * 10);
  if (processedRatio > 0.5) insights.push(`가공식품·배달 비율 ${Math.round(processedRatio * 100)}% — 자연식 늘리기`);

  const total = proteinScore + calorieScore + balanceScore + diversityScore + naturalScore;

  return {
    total: Math.round(total),
    breakdown: {
      protein: proteinScore,
      calorie: calorieScore,
      balance: balanceScore,
      diversity: diversityScore,
      natural: naturalScore,
    },
    insights,
  };
}

// ============================================================
// 운동 후 영양 추천 (가장 최근 운동 종료 후 90분 이내)
// ============================================================
export interface PostWorkoutRec {
  minutesSinceEnd: number;
  reason: string;
  foods: RecommendedFood[];
}

export async function postWorkoutRecommendation(
  todaySessions: WorkoutSession[],
  todayEntries: MacroEntry[],
): Promise<PostWorkoutRec | null> {
  if (todaySessions.length === 0) return null;
  // 가장 최근 종료 세션
  const lastSession = [...todaySessions].sort((a, b) => (b.endTime || '').localeCompare(a.endTime || ''))[0];
  if (!lastSession.endTime) return null;

  const endMs = new Date(lastSession.endTime).getTime();
  const elapsed = (Date.now() - endMs) / 60000;
  if (elapsed > 90) return null; // 90분 지났으면 비표시
  if (elapsed < 0) return null;

  // 운동 후 식사가 이미 있는지 (운동 시간 이후 추가된 entry 1개 이상이면 skip)
  // entry에 timestamp가 없으므로 단순화: today entry 0이면 추천
  // 더 정확히는 entry 추가 시각 저장이 필요. 단순 룰: 추천 항상 표시 (사용자가 무시 가능)

  // 단백질 30g + 탄수 50g 권장 식품
  const allFoods = await db.foods.toArray();
  const protein = allFoods
    .filter((f) => f.proteinPer100g >= 20 && f.category !== 'sauce')
    .sort((a, b) => b.proteinPer100g - a.proteinPer100g)
    .slice(0, 2);
  const carb = allFoods
    .filter((f) => f.carbsPer100g >= 20 && f.category === 'grain')
    .sort((a, b) => b.carbsPer100g - a.carbsPer100g)
    .slice(0, 1);

  const foods: RecommendedFood[] = [...protein, ...carb].map((f) => {
    const grams = f.proteinPer100g >= 20 ? 150 : 100;
    const ratio = grams / 100;
    return {
      name: f.name,
      category: f.category,
      grams,
      kcal: Math.round(f.kcalPer100g * ratio),
      protein: Math.round(f.proteinPer100g * ratio * 10) / 10,
      carbs: Math.round(f.carbsPer100g * ratio * 10) / 10,
      fat: Math.round(f.fatPer100g * ratio * 10) / 10,
    };
  });

  // 사용 안된 변수 경고 회피
  void todayEntries;

  return {
    minutesSinceEnd: Math.round(elapsed),
    reason: `운동 종료 ${Math.round(elapsed)}분 — 단백질 30g + 탄수 50g 권장 (회복 + 글리코겐 충전)`,
    foods,
  };
}

// ============================================================
// 주간 코치 리포트 (자연어 + 다음 주 행동)
// ============================================================
export interface WeeklyReport {
  weekLabel: string;
  workout: {
    days: number;
    volume: number;
    volumeDelta: number; // %
    prCount: number;
  };
  nutrition: {
    avgKcal: number;
    avgProtein: number;
    proteinRatio: number;
    daysLogged: number;
  };
  body: {
    weightDelta: number;
    bfDelta: number | null;
    mmDelta: number | null;
  };
  recovery: {
    avgSleep: number | null;
    soreDays: number;
  };
  summary: string;
  nextWeekActions: string[];
}

export async function generateWeeklyReport(goal: DietGoal | null): Promise<WeeklyReport | null> {
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 6);
  const thisStart = thisWeekStart.toISOString().split('T')[0];
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 13);
  const lastStart = lastWeekStart.toISOString().split('T')[0];

  const sessions = await db.sessions.where('date').aboveOrEqual(lastStart).toArray();
  const thisSessions = sessions.filter((s) => s.date >= thisStart);
  const lastSessions = sessions.filter((s) => s.date < thisStart);

  const calcVolume = (ss: WorkoutSession[]) =>
    ss.reduce((a, s) =>
      a + s.exercises.reduce((ax, ex) =>
        ax + ex.sets.filter((set) => set.isCompleted && set.setType !== 'warmup')
          .reduce((sum, set) => sum + set.weight * set.reps, 0),
        0),
      0);

  const thisVolume = calcVolume(thisSessions);
  const lastVolume = calcVolume(lastSessions);
  const volumeDelta = lastVolume > 0 ? ((thisVolume - lastVolume) / lastVolume) * 100 : 0;

  const prs = await db.personalRecords.where('date').aboveOrEqual(thisStart).toArray();

  const macroLogs = await db.dailyMacroLogs.where('date').aboveOrEqual(thisStart).toArray();
  const daysLogged = macroLogs.length;
  const totalKcal = macroLogs.reduce((a, l) => a + l.entries.reduce((s, e) => s + e.kcal, 0), 0);
  const totalProtein = macroLogs.reduce((a, l) => a + l.entries.reduce((s, e) => s + e.protein, 0), 0);
  const avgKcal = daysLogged > 0 ? Math.round(totalKcal / daysLogged) : 0;
  const avgProtein = daysLogged > 0 ? Math.round(totalProtein / daysLogged) : 0;

  const weightLogs = await db.bodyWeightLogs.where('date').aboveOrEqual(lastStart).toArray();
  const weightByDate = weightLogs.sort((a, b) => a.date.localeCompare(b.date));
  const weightDelta = weightByDate.length >= 2
    ? +(weightByDate[weightByDate.length - 1].weight - weightByDate[0].weight).toFixed(1) : 0;
  const bfFirst = weightByDate.find((w) => w.bodyFat !== undefined);
  const bfLast = [...weightByDate].reverse().find((w) => w.bodyFat !== undefined);
  const bfDelta = bfFirst && bfLast && bfFirst !== bfLast ? +(bfLast.bodyFat! - bfFirst.bodyFat!).toFixed(1) : null;
  const mmFirst = weightByDate.find((w) => w.muscleMass !== undefined);
  const mmLast = [...weightByDate].reverse().find((w) => w.muscleMass !== undefined);
  const mmDelta = mmFirst && mmLast && mmFirst !== mmLast ? +(mmLast.muscleMass! - mmFirst.muscleMass!).toFixed(1) : null;

  const condLogs = await db.conditionLogs.where('date').aboveOrEqual(thisStart).toArray();
  const sleepLogs = condLogs.filter((c) => c.sleepHours !== undefined);
  const avgSleep = sleepLogs.length > 0
    ? +(sleepLogs.reduce((a, c) => a + (c.sleepHours || 0), 0) / sleepLogs.length).toFixed(1) : null;
  const soreDays = condLogs.filter((c) => (c.soreParts?.length ?? 0) > 0).length;

  // 단백질 충족도 (profile target 알 수 있을 때만 정확)
  const proteinRatio = avgProtein / 150; // 대략 70kg 사용자 기준 (정확하려면 profile 필요)

  const workoutDays = new Set(thisSessions.map((s) => s.date)).size;

  // 종합 평가
  let summary: string;
  if (workoutDays === 0 && daysLogged === 0) {
    summary = '이번 주는 데이터가 거의 없어요. 운동과 식단 기록부터 시작해보세요.';
  } else if (workoutDays >= 4 && proteinRatio >= 0.85 && volumeDelta > -10) {
    summary = `이번 주 운동 ${workoutDays}회 + 단백질 잘 챙김 — 안정적인 페이스입니다.`;
  } else if (workoutDays >= 3 && proteinRatio < 0.7) {
    summary = `운동은 ${workoutDays}회로 적정이지만 단백질 부족이 두드러져요. 회복이 안 따라올 수 있습니다.`;
  } else if (volumeDelta > 15) {
    summary = `운동 강도 ↑ (+${Math.round(volumeDelta)}%) — 단백질·수면 더 챙기세요.`;
  } else if (volumeDelta < -20) {
    summary = `운동 강도 ↓ (${Math.round(volumeDelta)}%) — 회복 주간이라면 OK, 아니라면 일정 점검.`;
  } else {
    summary = `운동 ${workoutDays}일 · 식단 기록 ${daysLogged}일 · 평균 단백질 ${avgProtein}g. 꾸준한 페이스입니다.`;
  }

  // 다음 주 행동 3가지 (자동 우선순위)
  const actions: string[] = [];
  if (proteinRatio < 0.85) actions.push(`단백질 우선 — 닭가슴살/계란/그릭요거트 매끼 추가 (목표 ${Math.round(avgProtein * 1.2)}g+)`);
  if (workoutDays < 3) actions.push('운동 빈도 ↑ — 주 3회 이상 권장');
  if (volumeDelta < -15 && workoutDays > 0) actions.push('운동 강도 복구 — 점진적으로 5~10% 증량');
  if (avgSleep !== null && avgSleep < 6.5) actions.push(`수면 ↑ — 평균 ${avgSleep}h, 최소 7h 목표`);
  if (soreDays >= 5) actions.push('근육통 지속 — 디로드 1주 또는 강도 ↓');
  if (goal === 'cut' && Math.abs(weightDelta) < 0.2) actions.push('다이어트 정체 — refeed day 또는 칼로리 −100 검토');
  if (goal && (goal === 'lean_bulk' || goal === 'bulk') && weightDelta < 0.1) actions.push('벌크 정체 — 탄수 +25g/일');
  if (daysLogged < 5) actions.push('식단 기록 ↑ — 매일 기록해야 정확한 분석 가능');

  if (actions.length === 0) actions.push('현재 페이스 유지 — 변화 줄 필요 X');

  return {
    weekLabel: `${thisStart} ~ ${now.toISOString().split('T')[0]}`,
    workout: { days: workoutDays, volume: Math.round(thisVolume), volumeDelta: +volumeDelta.toFixed(1), prCount: prs.length },
    nutrition: { avgKcal, avgProtein, proteinRatio: +proteinRatio.toFixed(2), daysLogged },
    body: { weightDelta, bfDelta, mmDelta },
    recovery: { avgSleep, soreDays },
    summary,
    nextWeekActions: actions.slice(0, 3),
  };
}

// ============================================================
// 식사 패턴 분석 (오늘 기준 단순 룰)
// ============================================================
export interface MealPatternAnalysis {
  totalEntries: number;
  mealCount: Record<MacroEntry['mealType'], number>;
  proteinPerMeal: number[]; // 매끼 단백질 (g) 분포
  notes: string[];
}

export function analyzeMealPattern(entries: MacroEntry[]): MealPatternAnalysis {
  const mealCount: Record<MacroEntry['mealType'], number> = {
    breakfast: 0, lunch: 0, dinner: 0, snack: 0,
  };
  const proteinByMeal: Record<MacroEntry['mealType'], number> = {
    breakfast: 0, lunch: 0, dinner: 0, snack: 0,
  };
  for (const e of entries) {
    mealCount[e.mealType]++;
    proteinByMeal[e.mealType] += e.protein;
  }

  const proteinPerMeal = (Object.keys(proteinByMeal) as MacroEntry['mealType'][])
    .filter((m) => mealCount[m] > 0)
    .map((m) => proteinByMeal[m]);

  const notes: string[] = [];
  // 단백질 분산: 매 식사 20g 이상이 이상적 (근합성)
  const lowProteinMeals = proteinPerMeal.filter((p) => p > 0 && p < 20).length;
  if (lowProteinMeals >= 2) {
    notes.push('일부 끼니의 단백질이 20g 미만 — 매끼 균등 분산이 근합성 최적');
  }
  // 끼니 수
  const totalMeals = Object.values(mealCount).reduce((a, b) => a + b, 0);
  if (totalMeals === 1) notes.push('식사 1회 — 매크로 분산을 위해 3~4끼 권장');
  if (mealCount.dinner > 0 && mealCount.lunch === 0 && mealCount.breakfast === 0) {
    notes.push('저녁만 식사 — 단백질 합성 한 번에 몰리지 않게 분산');
  }

  return {
    totalEntries: entries.length,
    mealCount,
    proteinPerMeal,
    notes,
  };
}

// ============================================================
// 선호 음식 학습 — 최근 14일 사용 빈도
// ============================================================
export async function getFoodUsageFrequency(): Promise<Map<string, number>> {
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceStr = since.toISOString().split('T')[0];

  const logs = await db.dailyMacroLogs.where('date').aboveOrEqual(sinceStr).toArray();
  const freq = new Map<string, number>();

  for (const log of logs) {
    for (const entry of log.entries) {
      // entry name에서 식품명만 추출 (분량 떼고)
      const baseName = entry.name.replace(/ \d+g$/, '').trim();
      freq.set(baseName, (freq.get(baseName) || 0) + 1);
    }
  }

  return freq;
}

