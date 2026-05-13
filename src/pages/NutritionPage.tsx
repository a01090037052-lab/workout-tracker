import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend, PieChart, Pie, Cell } from 'recharts';
import { db } from '../db';
import { storage } from '../lib/storage';
import { calcBMR, calcTDEE, calcAllScenarios, calcMacros, GOAL_LABELS, GOAL_DESCRIPTIONS, ACTIVITY_LABELS } from '../lib/nutrition';
import { recommendNextMeal, calcDailyScore, postWorkoutRecommendation, analyzeMealPattern, toMacroEntry, getFoodUsageFrequency, type RecommendedFood } from '../lib/coach';
import { getLocalDate } from '../hooks/useLocalDate';
import { FOOD_CATEGORY_LABELS } from '../data/foods';
import NutritionGuide from '../components/nutrition/NutritionGuide';
import type { NutritionProfile, MealType, MacroEntry, ActivityLevel, DietGoal, Food, FoodCategory, MealTemplate, BodyWeightLog } from '../types';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식',
};
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** 매크로(g)에서 칼로리 자동 계산 (Atwater 계수) */
function kcalFromMacros(proteinG: number | string, carbsG: number | string, fatG: number | string): number {
  const p = Number(proteinG) || 0;
  const c = Number(carbsG) || 0;
  const f = Number(fatG) || 0;
  return Math.round(p * 4 + c * 4 + f * 9);
}

export default function NutritionPage() {
  const [view, setView] = useState<'today' | 'calculator' | 'trend'>(() =>
    storage.nutritionProfile.get() ? 'today' : 'calculator'
  );

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-4">영양</h1>

      {/* 탭 토글 */}
      <div className="flex gap-1 mb-4 bg-surface rounded-xl p-1">
        <button
          onClick={() => setView('today')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
            view === 'today' ? 'bg-primary text-white' : 'text-text-secondary'
          }`}
        >오늘 식단</button>
        <button
          onClick={() => setView('trend')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
            view === 'trend' ? 'bg-primary text-white' : 'text-text-secondary'
          }`}
        >추이</button>
        <button
          onClick={() => setView('calculator')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
            view === 'calculator' ? 'bg-primary text-white' : 'text-text-secondary'
          }`}
        >계산기</button>
      </div>

      {view === 'today' && <TodayView onNeedProfile={() => setView('calculator')} />}
      {view === 'trend' && <TrendView onNeedProfile={() => setView('calculator')} />}
      {view === 'calculator' && <CalculatorView onSaved={() => setView('today')} />}
    </div>
  );
}

// ============================================================
// 오늘 식단 view
// ============================================================
function TodayView({ onNeedProfile }: { onNeedProfile: () => void }) {
  const navigate = useNavigate();
  const today = getLocalDate();
  const [yesterday] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [profile] = useState(() => storage.nutritionProfile.get());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  const log = useLiveQuery(() => db.dailyMacroLogs.where('date').equals(today).first(), [today]);
  const yesterdayLog = useLiveQuery(() => db.dailyMacroLogs.where('date').equals(yesterday).first(), [yesterday]);
  const todayWorkouts = useLiveQuery(() => db.sessions.where('date').equals(today).toArray(), [today]);
  const hasWorkoutToday = (todayWorkouts?.length ?? 0) > 0;
  const allFoods = useLiveQuery(() => db.foods.toArray(), []);
  const entries = log?.entries || [];
  const waterMl = log?.waterMl || 0;
  const WATER_TARGET = 2000;

  const totals = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const target = profile ? calcMacros(profile, profile.goal) : null;

  // === 영양 코치 hooks ===
  const recommendation = useLiveQuery(
    () => target ? recommendNextMeal(totals, target) : Promise.resolve(null),
    [totals.kcal, totals.protein, totals.carbs, totals.fat, target?.kcal, target?.protein, target?.carbs, target?.fat],
  );
  const postWorkoutRec = useLiveQuery(
    () => postWorkoutRecommendation(todayWorkouts || [], entries),
    [todayWorkouts?.length, entries.length],
  );
  const dailyScore = useMemo(
    () => target ? calcDailyScore(entries, totals, target, allFoods || []) : null,
    [entries, totals.kcal, totals.protein, totals.carbs, totals.fat, target?.kcal, target?.protein, target?.carbs, target?.fat, allFoods],
  );
  const pattern = useMemo(() => analyzeMealPattern(entries), [entries]);

  const addEntry = async (entry: MacroEntry) => {
    if (log?.id) {
      await db.dailyMacroLogs.update(log.id, { entries: [...entries, entry] });
    } else {
      await db.dailyMacroLogs.add({ date: today, entries: [entry] });
    }
    setShowAddModal(false);
  };

  // 템플릿 등 여러 entry 한 번에 추가
  const addManyEntries = async (newEntries: MacroEntry[]) => {
    if (!newEntries.length) return;
    if (log?.id) {
      await db.dailyMacroLogs.update(log.id, { entries: [...entries, ...newEntries] });
    } else {
      await db.dailyMacroLogs.add({ date: today, entries: newEntries, waterMl: 0 });
    }
    setShowAddModal(false);
  };

  const removeEntry = async (idx: number) => {
    if (!log?.id) return;
    const next = entries.filter((_, i) => i !== idx);
    await db.dailyMacroLogs.update(log.id, { entries: next });
  };

  const copyYesterday = async () => {
    if (!yesterdayLog?.entries.length) return;
    const cloned = yesterdayLog.entries.map((e) => ({ ...e }));
    if (log?.id) {
      await db.dailyMacroLogs.update(log.id, { entries: cloned });
    } else {
      await db.dailyMacroLogs.add({ date: today, entries: cloned, waterMl: 0 });
    }
  };

  const updateWater = async (delta: number) => {
    const next = Math.max(0, waterMl + delta);
    if (log?.id) {
      await db.dailyMacroLogs.update(log.id, { waterMl: next });
    } else {
      await db.dailyMacroLogs.add({ date: today, entries: [], waterMl: next });
    }
  };

  if (!profile) {
    return (
      <div className="bg-surface rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">🥗</div>
        <h3 className="font-bold mb-1">프로필을 먼저 설정하세요</h3>
        <p className="text-sm text-text-secondary mb-4">
          BMR/TDEE 계산을 위해 키·체중·활동 수준이 필요해요
        </p>
        <button onClick={onNeedProfile} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
          프로필 입력하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 운동 후 영양 추천 (긴급, 90분 이내) */}
      {postWorkoutRec && <PostWorkoutCard rec={postWorkoutRec} onAdd={addManyEntries} />}

      {/* 매크로 합계 카드 */}
      <MacroSummaryCard totals={totals} target={target!} goal={profile.goal} hasWorkout={hasWorkoutToday} />

      {/* 일일 식단 점수 */}
      {dailyScore && totals.kcal > 0 && <DailyScoreCard score={dailyScore} />}

      {/* 물 섭취 카드 */}
      <WaterCard waterMl={waterMl} target={WATER_TARGET} onAdd={updateWater} />

      {/* 어제 식단 복사 (오늘 비어있고 어제 기록 있을 때만) */}
      {entries.length === 0 && (yesterdayLog?.entries.length ?? 0) > 0 && (
        <button
          onClick={copyYesterday}
          className="w-full py-3 bg-primary/10 border border-primary/30 rounded-xl text-sm text-primary-light font-medium active:bg-primary/20 transition-colors"
        >
          📋 어제 식단 그대로 복사 ({yesterdayLog?.entries.length}개 항목)
        </button>
      )}

      {/* 다음 식사 추천 (격차 보완) */}
      {recommendation && <RecommendationCard rec={recommendation} onAdd={addManyEntries} />}

      {/* 식사 추가 + 자동 식단 (2분할) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setShowAddModal(true)}
          className="col-span-2 py-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:border-primary hover:text-primary transition-colors text-sm"
        >+ 식사 추가</button>
        <button
          onClick={() => navigate('/meal-planner')}
          className="py-3 bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-xl text-primary-light text-sm font-medium active:bg-primary/20"
        >🪄 자동 식단</button>
      </div>

      {/* 식사 목록 (분류별) */}
      {MEAL_ORDER.map((mealType) => {
        const mealEntries = entries
          .map((e, i) => ({ e, i }))
          .filter((x) => x.e.mealType === mealType);
        if (mealEntries.length === 0) return null;
        const mealKcal = mealEntries.reduce((a, x) => a + x.e.kcal, 0);
        return (
          <div key={mealType} className="bg-surface rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-sm">{MEAL_LABELS[mealType]}</h3>
              <span className="text-xs text-text-secondary font-mono">{mealKcal} kcal</span>
            </div>
            {mealEntries.map(({ e, i }) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{e.name}</div>
                  <div className="text-[10px] text-text-secondary font-mono">
                    {e.kcal}kcal · P{e.protein} · C{e.carbs} · F{e.fat}
                  </div>
                </div>
                <button
                  onClick={() => removeEntry(i)}
                  className="text-text-secondary/40 hover:text-danger ml-2 text-xs px-2 py-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {entries.length === 0 && (
        <div className="bg-surface rounded-xl p-8 text-center border border-border border-dashed">
          <div className="text-3xl mb-2">🍽️</div>
          <p className="text-text-secondary text-sm">아직 오늘 식단이 없어요</p>
        </div>
      )}

      {/* 식사 패턴 분석 노트 */}
      {entries.length >= 2 && pattern.notes.length > 0 && (
        <div className="bg-surface rounded-xl p-3 border border-border">
          <div className="text-xs font-semibold mb-1.5">🩺 식사 패턴</div>
          <ul className="space-y-1">
            {pattern.notes.map((n, i) => (
              <li key={i} className="text-[11px] text-text-secondary leading-relaxed">• {n}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 템플릿으로 저장 (entries가 있을 때만) */}
      {entries.length > 0 && (
        <button
          onClick={() => setShowSaveTemplateModal(true)}
          className="w-full mt-2 py-2 text-xs text-text-secondary hover:text-primary border border-border border-dashed rounded-lg transition-colors"
        >
          📋 오늘 식단을 템플릿으로 저장
        </button>
      )}

      {showAddModal && <AddMealModal onAdd={addEntry} onAddMany={addManyEntries} onClose={() => setShowAddModal(false)} />}
      {showSaveTemplateModal && <SaveTemplateModal entries={entries} onClose={() => setShowSaveTemplateModal(false)} />}
    </div>
  );
}

// ============================================================
// 매크로 합계 카드
// ============================================================
function MacroSummaryCard({
  totals, target, goal, hasWorkout,
}: {
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  target: { kcal: number; protein: number; carbs: number; fat: number };
  goal: DietGoal;
  hasWorkout?: boolean;
}) {
  const kcalPct = target.kcal > 0 ? Math.min(100, (totals.kcal / target.kcal) * 100) : 0;
  const proteinPct = target.protein > 0 ? Math.min(100, (totals.protein / target.protein) * 100) : 0;
  const carbsPct = target.carbs > 0 ? Math.min(100, (totals.carbs / target.carbs) * 100) : 0;
  const fatPct = target.fat > 0 ? Math.min(100, (totals.fat / target.fat) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
      <div className="flex justify-between items-baseline mb-3">
        <div>
          <div className="text-xs text-text-secondary">{GOAL_LABELS[goal]}</div>
          <div className="text-2xl font-bold font-mono">
            {totals.kcal} <span className="text-sm text-text-secondary">/ {target.kcal} kcal</span>
          </div>
        </div>
        <div className={`text-sm font-mono ${kcalPct > 110 ? 'text-warning' : 'text-success'}`}>
          {Math.round(kcalPct)}%
        </div>
      </div>
      <div className="h-2 bg-surface-light rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${kcalPct > 110 ? 'bg-warning' : 'bg-primary'}`}
          style={{ width: `${kcalPct}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MacroRow label="단백질" actual={totals.protein} target={target.protein} pct={proteinPct} color="text-red-400" />
        <MacroRow label="탄수화물" actual={totals.carbs} target={target.carbs} pct={carbsPct} color="text-yellow-400" />
        <MacroRow label="지방" actual={totals.fat} target={target.fat} pct={fatPct} color="text-blue-400" />
      </div>

      {/* 매크로 비율 도넛 (kcal 기준) */}
      <MacroPieRatio totals={totals} target={target} />

      {/* 운동-식단 동기화: 운동일/휴식일 칼로리 권장 */}
      {hasWorkout ? (
        <div className="mt-3 text-[10px] text-primary-light bg-primary/15 rounded-lg px-2 py-1.5 text-center leading-relaxed">
          🏋️ 운동일 — 탄수 +30~50g, 칼로리 +200kcal 권장 (글리코겐 회복)
        </div>
      ) : (
        <div className="mt-3 text-[10px] text-text-secondary bg-surface-light/50 rounded-lg px-2 py-1.5 text-center leading-relaxed">
          🛌 휴식일 — 평소 ±0, 단백질만 유지 (회복용)
        </div>
      )}
    </div>
  );
}

function MacroPieRatio({ totals, target }: {
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  target: { kcal: number; protein: number; carbs: number; fat: number };
}) {
  const pKcal = totals.protein * 4;
  const cKcal = totals.carbs * 4;
  const fKcal = totals.fat * 9;
  const totalKcal = pKcal + cKcal + fKcal;

  if (totalKcal === 0) return null;

  const actualData = [
    { name: 'P', value: pKcal, color: '#F87171' },
    { name: 'C', value: cKcal, color: '#FBBF24' },
    { name: 'F', value: fKcal, color: '#60A5FA' },
  ];

  const actualPct = {
    p: Math.round((pKcal / totalKcal) * 100),
    c: Math.round((cKcal / totalKcal) * 100),
    f: Math.round((fKcal / totalKcal) * 100),
  };

  // 권장 비율 (target의 kcal 환산)
  const tP = target.protein * 4;
  const tC = target.carbs * 4;
  const tF = target.fat * 9;
  const tTotal = tP + tC + tF;
  const targetPct = tTotal > 0 ? {
    p: Math.round((tP / tTotal) * 100),
    c: Math.round((tC / tTotal) * 100),
    f: Math.round((tF / tTotal) * 100),
  } : { p: 0, c: 0, f: 0 };

  return (
    <div className="mt-3 flex items-center gap-3 bg-surface/50 rounded-lg p-2">
      <div className="w-16 h-16 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={actualData} dataKey="value" innerRadius={16} outerRadius={28} cx="50%" cy="50%" stroke="none">
              {actualData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1">
        <div className="text-[10px] text-text-secondary mb-1">매크로 비율 (kcal)</div>
        <div className="flex gap-2 text-[11px] font-mono">
          <span className="text-red-400">P {actualPct.p}%</span>
          <span className="text-yellow-400">C {actualPct.c}%</span>
          <span className="text-blue-400">F {actualPct.f}%</span>
        </div>
        {tTotal > 0 && (
          <div className="text-[9px] text-text-secondary/70 mt-0.5">
            권장 P{targetPct.p}% · C{targetPct.c}% · F{targetPct.f}%
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 체성분 분석 카드 (체지방률·근육량 변화 + 다이어트/벌크 평가)
// ============================================================
function BodyCompositionAnalysis({ logs, goal }: { logs: BodyWeightLog[]; goal: DietGoal }) {
  // 체지방·근육 있는 로그만, 최신순 정렬 (logs는 이미 reverse)
  const withBF = logs.filter((l) => l.bodyFat !== undefined && l.bodyFat > 0);
  const withMM = logs.filter((l) => l.muscleMass !== undefined && l.muscleMass > 0);

  if (withBF.length < 2 && withMM.length < 2) {
    return (
      <div className="bg-surface rounded-xl p-4 border border-border border-dashed">
        <h3 className="font-semibold text-sm mb-1">📐 체성분 분석</h3>
        <p className="text-xs text-text-secondary">
          체지방률·근육량 데이터 2회 이상 필요. 홈 체중 위젯에서 InBody/체중계 데이터 입력하면 자동 분석돼요.
        </p>
      </div>
    );
  }

  // 최신 vs 가장 오래된 (해당 기간의 시작 vs 끝)
  const bfChange = withBF.length >= 2
    ? +(withBF[0].bodyFat! - withBF[withBF.length - 1].bodyFat!).toFixed(1)
    : null;
  const mmChange = withMM.length >= 2
    ? +(withMM[0].muscleMass! - withMM[withMM.length - 1].muscleMass!).toFixed(1)
    : null;
  const weightChange = logs.length >= 2
    ? +(logs[0].weight - logs[logs.length - 1].weight).toFixed(1)
    : null;

  // 평가
  let evaluation: { text: string; tone: 'success' | 'warning' | 'info' } | null = null;
  if (goal === 'cut' || goal === 'cut_aggressive') {
    if (bfChange !== null && bfChange < -0.5 && (mmChange === null || mmChange >= -0.3)) {
      evaluation = { text: '✅ 클린 다이어트 — 지방 ↓ + 근육 유지', tone: 'success' };
    } else if (mmChange !== null && mmChange < -0.5) {
      evaluation = { text: '⚠ 근손실 동반 — 단백질 ↑, 운동 강도 유지', tone: 'warning' };
    } else if (bfChange !== null && bfChange >= 0) {
      evaluation = { text: '⏸ 지방 변화 없음 — 칼로리 적자 부족 가능', tone: 'warning' };
    }
  } else if (goal === 'lean_bulk' || goal === 'bulk') {
    if (mmChange !== null && mmChange > 0.3 && (bfChange === null || bfChange < 1)) {
      evaluation = { text: '✅ 클린 벌크 — 근육 ↑ + 지방 통제', tone: 'success' };
    } else if (bfChange !== null && bfChange >= 1.5 && (mmChange === null || mmChange < 0.5)) {
      evaluation = { text: '⚠ 더티 벌크 경향 — 탄수 약간 줄이거나 운동 볼륨 ↑', tone: 'warning' };
    } else if (mmChange !== null && mmChange < 0.1) {
      evaluation = { text: '⏸ 근육 증가 부족 — 단백질·칼로리·운동 강도 점검', tone: 'warning' };
    }
  } else {
    if (Math.abs(weightChange || 0) < 0.5 && Math.abs(bfChange || 0) < 0.5) {
      evaluation = { text: '✅ 안정적 유지', tone: 'success' };
    }
  }

  return (
    <div className="bg-surface rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">📐 체성분 분석</h3>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <ChangeStat label="체중" value={weightChange} unit="kg" goalDir={goal === 'cut' || goal === 'cut_aggressive' ? 'down' : goal === 'maintain' ? 'flat' : 'up'} />
        <ChangeStat label="체지방률" value={bfChange} unit="%p" goalDir="down" />
        <ChangeStat label="골격근량" value={mmChange} unit="kg" goalDir="up" />
      </div>

      {evaluation && (
        <div className={`text-xs p-2.5 rounded-lg flex items-start gap-1.5 ${
          evaluation.tone === 'success' ? 'bg-success/10 text-success' :
          evaluation.tone === 'warning' ? 'bg-warning/10 text-warning' :
          'bg-surface-light text-text-secondary'
        }`}>
          <span className="flex-1">{evaluation.text}</span>
        </div>
      )}

      <p className="text-[10px] text-text-secondary mt-2">
        ※ 측정 기준 비교 (기간 내 첫·마지막). 체중계 시간대 일정 유지 권장 (아침 공복).
      </p>
    </div>
  );
}

function ChangeStat({ label, value, unit, goalDir }: { label: string; value: number | null; unit: string; goalDir: 'up' | 'down' | 'flat' }) {
  if (value === null) {
    return (
      <div className="bg-surface-light rounded-lg p-2 text-center">
        <div className="text-[10px] text-text-secondary">{label}</div>
        <div className="text-sm font-mono text-text-secondary/40 mt-0.5">—</div>
      </div>
    );
  }
  // 목표 방향과 일치하면 success, 반대면 warning, 거의 0이면 neutral
  const tone: 'success' | 'warning' | 'neutral' =
    Math.abs(value) < 0.2 ? 'neutral'
    : goalDir === 'down' ? (value < 0 ? 'success' : 'warning')
    : goalDir === 'up' ? (value > 0 ? 'success' : 'warning')
    : 'neutral';
  return (
    <div className="bg-surface-light rounded-lg p-2 text-center">
      <div className="text-[10px] text-text-secondary">{label}</div>
      <div className={`text-sm font-mono font-bold mt-0.5 ${
        tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-text'
      }`}>
        {value > 0 ? '+' : ''}{value}<span className="text-[9px] text-text-secondary ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

function MacroRow({ label, actual, target, pct, color }: { label: string; actual: number; target: number; pct: number; color: string }) {
  return (
    <div className="bg-surface/50 rounded-lg p-2 text-center">
      <div className={`text-[10px] ${color}`}>{label}</div>
      <div className="text-sm font-mono font-semibold mt-0.5">
        {actual}<span className="text-text-secondary text-[10px]">/{target}g</span>
      </div>
      <div className="h-1 bg-surface-light rounded-full mt-1 overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ============================================================
// 식사 추가 모달
// ============================================================
function AddMealModal({ onAdd, onAddMany, onClose }: { onAdd: (entry: MacroEntry) => void; onAddMany: (entries: MacroEntry[]) => void; onClose: () => void }) {
  const [mode, setMode] = useState<'search' | 'manual' | 'portion' | 'newFood' | 'template' | 'estimate'>('search');
  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [portionG, setPortionG] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'favorites' | FoodCategory>('all');
  const [favTick, setFavTick] = useState(0); // 즐겨찾기 토글 → 리렌더
  // 매크로 사용자 수정값 (분량 변경 시 reset)
  const [overrides, setOverrides] = useState<{ kcal?: number; p?: number; c?: number; f?: number }>({});

  // 직접 입력 모드 상태
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  // 손바닥 분량 가이드
  const [showHandGuide, setShowHandGuide] = useState(false);
  const [handP, setHandP] = useState(0);
  const [handC, setHandC] = useState(0);
  const [handF, setHandF] = useState(0);

  const allFoods = useLiveQuery(() => db.foods.toArray(), []);
  const usageFreq = useLiveQuery(() => getFoodUsageFrequency(), []);
  // favTick은 의도적 트리거 (storage 변경을 useMemo에 알림)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const favIds = useMemo(() => storage.favoriteFoods.get(), [favTick]);

  const filteredFoods = useMemo(() => {
    if (!allFoods) return [];
    const q = query.trim().toLowerCase();
    let list = allFoods;
    // 카테고리 필터
    if (categoryFilter === 'favorites') {
      list = list.filter((f) => f.id !== undefined && favIds.includes(f.id));
    } else if (categoryFilter !== 'all') {
      list = list.filter((f) => f.category === categoryFilter);
    }
    // 검색어 필터
    if (q) list = list.filter((f) => f.name.toLowerCase().includes(q));
    // 정렬: 즐겨찾기 우선 → 최근 14일 사용 빈도 우선 (자주 먹는 음식 위로)
    list = [...list].sort((a, b) => {
      const af = a.id !== undefined && favIds.includes(a.id) ? 1 : 0;
      const bf = b.id !== undefined && favIds.includes(b.id) ? 1 : 0;
      if (bf !== af) return bf - af;
      const freqA = usageFreq?.get(a.name) || 0;
      const freqB = usageFreq?.get(b.name) || 0;
      return freqB - freqA;
    });
    return q ? list : list.slice(0, 50);
  }, [allFoods, query, categoryFilter, favIds, usageFreq]);

  const toggleFavorite = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    storage.favoriteFoods.toggle(id);
    setFavTick((t) => t + 1);
  };

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setPortionG(String(food.defaultServing || 100));
    setOverrides({}); // 새 음식 선택 → 수정값 초기화
    setMode('portion');
  };

  const handlePortionG = (v: string) => {
    setPortionG(v);
    setOverrides({}); // 분량 변경 시 자동 계산값으로 다시 (사용자가 수정한 값 reset)
  };

  const handlePortionAdd = () => {
    if (!selectedFood || !preview) return;
    const g = Math.max(1, Number(portionG) || 0);
    onAdd({
      name: `${selectedFood.name} ${g}g`,
      mealType,
      kcal: preview.kcal,
      protein: preview.p,
      carbs: preview.c,
      fat: preview.f,
    });
  };

  const handleManualAdd = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      mealType,
      kcal: Math.max(0, Number(kcal) || 0),
      protein: Math.max(0, Number(protein) || 0),
      carbs: Math.max(0, Number(carbs) || 0),
      fat: Math.max(0, Number(fat) || 0),
    });
  };

  const autoKcal = () => {
    const calc = kcalFromMacros(protein, carbs, fat);
    if (calc > 0) setKcal(String(calc));
  };

  // 손바닥 분량 → P/C/F + kcal 자동 채움 (단백질 손바닥 27g, 탄수 주먹 35g, 지방 엄지 12g)
  const applyHandGuide = () => {
    const pg = Math.round(handP * 27);
    const cg = Math.round(handC * 35);
    const fg = Math.round(handF * 12);
    setProtein(String(pg));
    setCarbs(String(cg));
    setFat(String(fg));
    setKcal(String(kcalFromMacros(pg, cg, fg)));
  };

  const portionRatio = selectedFood ? Math.max(1, Number(portionG) || 0) / 100 : 0;
  const autoMacros = selectedFood ? {
    kcal: Math.round(selectedFood.kcalPer100g * portionRatio),
    p: Math.round(selectedFood.proteinPer100g * portionRatio * 10) / 10,
    c: Math.round(selectedFood.carbsPer100g * portionRatio * 10) / 10,
    f: Math.round(selectedFood.fatPer100g * portionRatio * 10) / 10,
  } : null;
  // 사용자 수정값이 있으면 override, 없으면 auto
  const preview = autoMacros ? {
    kcal: overrides.kcal ?? autoMacros.kcal,
    p: overrides.p ?? autoMacros.p,
    c: overrides.c ?? autoMacros.c,
    f: overrides.f ?? autoMacros.f,
  } : null;
  const hasOverride = Object.keys(overrides).length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold">식사 추가</h3>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>

        {/* 모드 토글 (분량 입력/새 음식 등록 중엔 숨김) */}
        {mode !== 'portion' && mode !== 'newFood' && (
          <div className="flex gap-1 mb-3 bg-surface-light/50 rounded-lg p-1">
            <button
              onClick={() => setMode('search')}
              className={`flex-1 py-1.5 rounded text-[11px] font-medium ${mode === 'search' ? 'bg-primary text-white' : 'text-text-secondary'}`}
            >🔍 검색</button>
            <button
              onClick={() => setMode('template')}
              className={`flex-1 py-1.5 rounded text-[11px] font-medium ${mode === 'template' ? 'bg-primary text-white' : 'text-text-secondary'}`}
            >📋 템플릿</button>
            <button
              onClick={() => setMode('estimate')}
              className={`flex-1 py-1.5 rounded text-[11px] font-medium ${mode === 'estimate' ? 'bg-primary text-white' : 'text-text-secondary'}`}
            >🍱 추정</button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-1.5 rounded text-[11px] font-medium ${mode === 'manual' ? 'bg-primary text-white' : 'text-text-secondary'}`}
            >✏️ 직접</button>
          </div>
        )}

        {/* 검색 모드 */}
        {mode === 'search' && (
          <>
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="음식 이름으로 검색 (예: 닭가슴살)"
              autoFocus
              className="w-full bg-surface-light rounded-lg px-4 py-2.5 mb-3 outline-none focus:ring-2 focus:ring-primary"
            />

            {/* 카테고리 필터 칩 */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {[{ key: 'all', label: '전체' }, { key: 'favorites', label: '⭐' },
                ...(Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[]).map((c) => ({ key: c, label: FOOD_CATEGORY_LABELS[c] })),
              ].map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategoryFilter(c.key as 'all' | 'favorites' | FoodCategory)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    categoryFilter === c.key ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'
                  }`}
                >{c.label}</button>
              ))}
            </div>

            <div className="space-y-1 max-h-[45vh] overflow-y-auto mb-2">
              {filteredFoods.length === 0 && (
                <div className="text-center py-8 text-text-secondary text-sm">
                  {categoryFilter === 'favorites'
                    ? '즐겨찾기가 없어요. ★를 눌러 추가하세요'
                    : query ? '검색 결과가 없어요' : '식품 데이터 로딩 중...'}
                </div>
              )}
              {filteredFoods.map((f) => {
                const isFav = f.id !== undefined && favIds.includes(f.id);
                return (
                  <div key={f.id} className="flex items-stretch gap-0.5 bg-surface-light hover:bg-border rounded-lg transition-colors">
                    <button
                      onClick={(e) => toggleFavorite(e, f.id!)}
                      className={`px-3 ${isFav ? 'text-yellow-400' : 'text-text-secondary/30 hover:text-text-secondary'}`}
                      aria-label="즐겨찾기"
                    >★</button>
                    <button
                      onClick={() => handleSelectFood(f)}
                      className="flex-1 text-left py-3 pr-3"
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-medium">{f.name}</span>
                        <span className="text-[10px] text-text-secondary">
                          {FOOD_CATEGORY_LABELS[f.category]}
                          {f.isCustom && <span className="text-primary-light ml-1">· 내가 추가</span>}
                        </span>
                      </div>
                      <div className="text-[10px] text-text-secondary font-mono mt-0.5">
                        100g: {f.kcalPer100g}kcal · P{f.proteinPer100g} · C{f.carbsPer100g} · F{f.fatPer100g}
                        {f.servingLabel && <span className="text-primary-light ml-2">· {f.servingLabel}</span>}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setMode('newFood')}
              className="w-full py-2.5 border-2 border-dashed border-border rounded-lg text-text-secondary hover:border-primary hover:text-primary text-sm transition-colors"
            >
              + 새 음식 등록
            </button>
          </>
        )}

        {/* 템플릿 모드 */}
        {mode === 'template' && (
          <TemplateList onApply={onAddMany} />
        )}

        {/* 일반식 추정 모드 (외식·집밥 평균치 기반) */}
        {mode === 'estimate' && (
          <EstimateForm onAdd={(e) => onAdd(e)} />
        )}

        {/* 새 음식 등록 모드 */}
        {mode === 'newFood' && (
          <NewFoodForm
            onSaved={(food) => {
              setSelectedFood(food);
              setPortionG(String(food.defaultServing || 100));
              setMode('portion');
            }}
            onCancel={() => setMode('search')}
          />
        )}

        {/* 분량 입력 모드 (음식 선택 후) */}
        {mode === 'portion' && selectedFood && preview && (
          <>
            <button
              onClick={() => { setMode('search'); setSelectedFood(null); }}
              className="text-xs text-primary-light mb-2"
            >← 다른 음식 선택</button>
            <div className="bg-surface-light rounded-lg p-3 mb-3">
              <div className="font-semibold mb-1">{selectedFood.name}</div>
              <div className="text-[10px] text-text-secondary font-mono">
                100g 기준: {selectedFood.kcalPer100g}kcal · P{selectedFood.proteinPer100g} · C{selectedFood.carbsPer100g} · F{selectedFood.fatPer100g}
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs text-text-secondary mb-1 block">분량 (g)</label>
              <input
                type="number" inputMode="decimal" value={portionG} onChange={(e) => handlePortionG(e.target.value)}
                placeholder="100"
                className="w-full bg-surface-light rounded-lg px-4 py-2.5 font-mono text-center outline-none focus:ring-2 focus:ring-primary"
              />

              {/* 배수 빠른 입력 칩 */}
              <div className="flex gap-1.5 mt-2">
                {[0.5, 1, 1.5, 2].map((mult) => {
                  const baseG = selectedFood.defaultServing || 100;
                  const grams = Math.round(baseG * mult);
                  const baseLabel = selectedFood.servingLabel?.split(' (')[0] || `${baseG}g`;
                  const label = mult === 1 ? baseLabel : `×${mult}`;
                  return (
                    <button
                      key={mult}
                      onClick={() => handlePortionG(String(grams))}
                      className="flex-1 py-1.5 bg-surface-light hover:bg-border rounded-lg text-[11px] text-text-secondary transition-colors"
                    >
                      <div className="font-medium">{label}</div>
                      <div className="text-[9px] opacity-70">{grams}g</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 매크로 — 자동 계산 + 사용자 수정 가능 */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-3">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-[10px] text-text-secondary">
                  매크로 (분량 기준 자동, 직접 수정 가능)
                </span>
                {hasOverride && (
                  <button
                    onClick={() => setOverrides({})}
                    className="text-[10px] text-primary-light underline"
                  >자동 계산으로 초기화</button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <MacroEditField label="kcal" value={preview.kcal} color="text-text"
                  onChange={(v) => setOverrides({ ...overrides, kcal: v })} />
                <MacroEditField label="P (g)" value={preview.p} color="text-red-400"
                  onChange={(v) => setOverrides({ ...overrides, p: v })} />
                <MacroEditField label="C (g)" value={preview.c} color="text-yellow-400"
                  onChange={(v) => setOverrides({ ...overrides, c: v })} />
                <MacroEditField label="F (g)" value={preview.f} color="text-blue-400"
                  onChange={(v) => setOverrides({ ...overrides, f: v })} />
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs text-text-secondary mb-1 block">식사 분류</label>
              <div className="flex gap-2">
                {MEAL_ORDER.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMealType(m)}
                    className={`flex-1 py-2 rounded-lg text-sm ${
                      mealType === m ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'
                    }`}
                  >
                    {MEAL_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePortionAdd}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold"
            >
              추가
            </button>
          </>
        )}

        {/* 직접 입력 모드 */}
        {mode === 'manual' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">음식 이름</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="예: 닭가슴살 샐러드"
                className="w-full bg-surface-light rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 손바닥 분량 빠른 추정 */}
            <div className="bg-surface-light/40 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowHandGuide(!showHandGuide)}
                className="w-full flex justify-between items-center p-2.5 text-xs"
              >
                <span className="font-medium">🖐 손바닥 분량으로 추정 (영양사 표준)</span>
                <span className="text-text-secondary">{showHandGuide ? '접기' : '펼치기'}</span>
              </button>
              {showHandGuide && (
                <div className="px-3 pb-3 space-y-2 border-t border-border">
                  <p className="text-[10px] text-text-secondary leading-relaxed mt-2">
                    개수 선택 후 [적용]을 누르면 아래 P/C/F·kcal가 자동 채워져요.
                  </p>
                  <HandRow label="단백질 (손바닥)" unit="× 27g" value={handP} onChange={setHandP} colorClass="text-red-400" />
                  <HandRow label="탄수 (주먹)" unit="× 35g" value={handC} onChange={setHandC} colorClass="text-yellow-400" />
                  <HandRow label="지방 (엄지)" unit="× 12g" value={handF} onChange={setHandF} colorClass="text-blue-400" />
                  <div className="text-[10px] text-text-secondary font-mono text-center">
                    예상: {Math.round(handP * 27)}g P · {Math.round(handC * 35)}g C · {Math.round(handF * 12)}g F · {kcalFromMacros(handP * 27, handC * 35, handF * 12)} kcal
                  </div>
                  <button
                    onClick={applyHandGuide}
                    className="w-full py-2 bg-primary/20 text-primary-light rounded-lg text-xs font-medium"
                  >P/C/F·칼로리 자동 채우기</button>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-text-secondary mb-1 block">식사 분류</label>
              <div className="flex gap-2">
                {MEAL_ORDER.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMealType(m)}
                    className={`flex-1 py-2 rounded-lg text-sm ${
                      mealType === m ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'
                    }`}
                  >
                    {MEAL_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-red-400 mb-1 block">단백질(g)</label>
                <input
                  type="number" inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)}
                  placeholder="0"
                  className="w-full bg-surface-light rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] text-yellow-400 mb-1 block">탄수(g)</label>
                <input
                  type="number" inputMode="decimal" value={carbs} onChange={(e) => setCarbs(e.target.value)}
                  placeholder="0"
                  className="w-full bg-surface-light rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] text-blue-400 mb-1 block">지방(g)</label>
                <input
                  type="number" inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)}
                  placeholder="0"
                  className="w-full bg-surface-light rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-text-secondary">칼로리 (kcal)</label>
                <button onClick={autoKcal} className="text-[10px] text-primary-light underline">매크로로 자동 계산</button>
              </div>
              <input
                type="number" inputMode="decimal" value={kcal} onChange={(e) => setKcal(e.target.value)}
                placeholder="0"
                className="w-full bg-surface-light rounded-lg px-4 py-2.5 font-mono text-center outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              onClick={handleManualAdd}
              disabled={!name.trim()}
              className="w-full mt-2 py-3 bg-primary disabled:opacity-40 text-white rounded-xl font-semibold"
            >
              추가
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 계산기 / 프로필 view
// ============================================================
function CalculatorView({ onSaved }: { onSaved: () => void }) {
  const [profile, setProfile] = useState<NutritionProfile>(() =>
    storage.nutritionProfile.get() || {
      gender: 'male',
      age: 25,
      height: 170,
      weight: 70,
      activityLevel: 'moderate',
      goal: 'maintain',
    }
  );
  const [showGuide, setShowGuide] = useState(false);

  const handleSave = () => {
    storage.nutritionProfile.set(profile);
    onSaved();
  };

  const isValid = profile.age > 0 && profile.height > 0 && profile.weight > 0;
  const bmr = isValid ? Math.round(calcBMR(profile)) : 0;
  const tdee = isValid ? Math.round(calcTDEE(profile)) : 0;
  const scenarios = isValid ? calcAllScenarios(profile) : null;

  return (
    <div className="space-y-4">
      {/* 매크로 가이드 (펼침) */}
      <div className="bg-surface rounded-xl overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex justify-between items-center p-4 active:bg-surface-light transition-colors"
        >
          <span className="font-semibold text-sm">📚 매크로 가이드 — 단백질·탄수·지방이란?</span>
          <span className="text-xs text-text-secondary">{showGuide ? '접기 ▴' : '펼치기 ▾'}</span>
        </button>
        {showGuide && (
          <div className="px-4 pb-4 border-t border-border">
            <NutritionGuide />
          </div>
        )}
      </div>

      {/* 프로필 입력 */}
      <div className="bg-surface rounded-xl p-4 space-y-3">
        <h3 className="font-semibold">프로필</h3>

        <div>
          <label className="text-xs text-text-secondary mb-1 block">성별</label>
          <div className="flex gap-2">
            <button
              onClick={() => setProfile({ ...profile, gender: 'male' })}
              className={`flex-1 py-2 rounded-lg text-sm ${profile.gender === 'male' ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'}`}
            >남성</button>
            <button
              onClick={() => setProfile({ ...profile, gender: 'female' })}
              className={`flex-1 py-2 rounded-lg text-sm ${profile.gender === 'female' ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'}`}
            >여성</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <NumberField label="나이" value={profile.age} onChange={(v) => setProfile({ ...profile, age: v })} />
          <NumberField label="키 (cm)" value={profile.height} onChange={(v) => setProfile({ ...profile, height: v })} />
          <NumberField label="체중 (kg)" value={profile.weight} onChange={(v) => setProfile({ ...profile, weight: v })} />
        </div>

        <div>
          <label className="text-xs text-text-secondary mb-1 block">체지방률 % (선택, 더 정확한 계산)</label>
          <input
            type="number" inputMode="decimal" value={profile.bodyFat ?? ''}
            onChange={(e) => setProfile({ ...profile, bodyFat: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="모르면 비워두기"
            className="w-full bg-surface-light rounded-lg px-4 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary"
          />
          {profile.bodyFat !== undefined && (
            <p className="text-[10px] text-primary-light mt-1">Katch-McArdle 공식 사용 (더 정확)</p>
          )}
        </div>

        <div>
          <label className="text-xs text-text-secondary mb-1 block">활동 수준</label>
          <select
            value={profile.activityLevel}
            onChange={(e) => setProfile({ ...profile, activityLevel: e.target.value as ActivityLevel })}
            className="w-full bg-surface-light rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
              <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-text-secondary mb-1 block">목표</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(GOAL_LABELS) as DietGoal[]).map((g) => (
              <button
                key={g}
                onClick={() => setProfile({ ...profile, goal: g })}
                className={`py-2 px-3 rounded-lg text-xs text-left ${
                  profile.goal === g ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'
                }`}
              >
                <div className="font-medium">{GOAL_LABELS[g]}</div>
                <div className="text-[10px] opacity-80">{GOAL_DESCRIPTIONS[g]}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!isValid}
          className="w-full py-3 bg-primary disabled:opacity-40 text-white rounded-xl font-semibold"
        >
          저장하고 오늘 식단으로
        </button>
      </div>

      {/* 결과 */}
      {isValid && scenarios && (
        <>
          <div className="bg-surface rounded-xl p-4">
            <h3 className="font-semibold mb-3 text-sm">계산 결과</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-light rounded-lg p-3 text-center">
                <div className="text-xs text-text-secondary">기초대사량 (BMR)</div>
                <div className="text-2xl font-mono font-bold mt-1">{bmr}</div>
                <div className="text-[10px] text-text-secondary">kcal/일</div>
              </div>
              <div className="bg-surface-light rounded-lg p-3 text-center">
                <div className="text-xs text-text-secondary">활동대사량 (TDEE)</div>
                <div className="text-2xl font-mono font-bold mt-1">{tdee}</div>
                <div className="text-[10px] text-text-secondary">kcal/일</div>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-4">
            <h3 className="font-semibold mb-3 text-sm">목표별 시나리오</h3>
            <div className="space-y-2">
              {(Object.keys(GOAL_LABELS) as DietGoal[]).map((g) => {
                const m = scenarios[g];
                const isSelected = profile.goal === g;
                return (
                  <div
                    key={g}
                    className={`rounded-lg p-3 ${isSelected ? 'bg-primary/15 border border-primary/30' : 'bg-surface-light'}`}
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-medium text-sm">{GOAL_LABELS[g]}</span>
                      <span className="text-lg font-mono font-bold">{m.kcal}<span className="text-xs text-text-secondary"> kcal</span></span>
                    </div>
                    <div className="flex gap-3 text-[11px] font-mono">
                      <span className="text-red-400">P {m.protein}g</span>
                      <span className="text-yellow-400">C {m.carbs}g</span>
                      <span className="text-blue-400">F {m.fat}g</span>
                      <span className="text-text-secondary ml-auto">{GOAL_DESCRIPTIONS[g]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// 영양 코치 — 시간 기반 식사 분류 자동 추정
// ============================================================
function autoMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 19) return 'dinner';
  return 'snack';
}

// ============================================================
// 운동 후 영양 추천 카드
// ============================================================
function PostWorkoutCard({ rec, onAdd }: { rec: { minutesSinceEnd: number; reason: string; foods: RecommendedFood[] }; onAdd: (entries: MacroEntry[]) => void }) {
  return (
    <div className="bg-gradient-to-br from-success/15 to-success/5 border border-success/30 rounded-xl p-4">
      <div className="text-sm font-semibold text-success mb-1">🏋️ 운동 후 영양</div>
      <p className="text-xs text-text-secondary mb-3 leading-relaxed">{rec.reason}</p>
      <div className="space-y-1.5">
        {rec.foods.map((f, i) => (
          <button
            key={i}
            onClick={() => onAdd([toMacroEntry(f, autoMealType())])}
            className="w-full bg-surface/70 hover:bg-surface rounded-lg p-2.5 text-left text-xs transition-colors"
          >
            <div className="flex justify-between items-baseline">
              <span className="font-medium">{f.name} {f.grams}g</span>
              <span className="text-success font-mono text-[10px]">+ 추가</span>
            </div>
            <div className="text-[10px] text-text-secondary font-mono mt-0.5">
              {f.kcal}kcal · P{f.protein} · C{f.carbs} · F{f.fat}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 일일 식단 점수 카드
// ============================================================
function DailyScoreCard({ score }: { score: { total: number; breakdown: { protein: number; calorie: number; balance: number; diversity: number; natural: number }; insights: string[] } }) {
  const grade = score.total >= 90 ? 'A+' : score.total >= 80 ? 'A' : score.total >= 70 ? 'B' : score.total >= 60 ? 'C' : 'D';
  const gradeColor = score.total >= 80 ? 'text-success' : score.total >= 60 ? 'text-warning' : 'text-danger';
  return (
    <div className="bg-surface rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">📊 오늘 식단 점수</span>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-mono font-bold ${gradeColor}`}>{score.total}</span>
          <span className="text-xs text-text-secondary">/ 100</span>
          <span className={`text-base font-bold ml-1 ${gradeColor}`}>{grade}</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1 mb-2 text-[9px] text-center font-mono">
        <ScoreBar label="단백질" value={score.breakdown.protein} max={40} />
        <ScoreBar label="칼로리" value={score.breakdown.calorie} max={20} />
        <ScoreBar label="균형" value={score.breakdown.balance} max={15} />
        <ScoreBar label="다양성" value={score.breakdown.diversity} max={15} />
        <ScoreBar label="자연식" value={score.breakdown.natural} max={10} />
      </div>
      {score.insights.length > 0 && (
        <ul className="space-y-0.5 mt-2">
          {score.insights.map((ins, i) => (
            <li key={i} className="text-[11px] text-warning leading-relaxed">• {ins}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  const color = pct >= 80 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-danger';
  return (
    <div>
      <div className="text-text-secondary mb-0.5">{label}</div>
      <div className="h-1 bg-surface-light rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-text font-medium mt-0.5">{value}/{max}</div>
    </div>
  );
}

// ============================================================
// 다음 식사 추천 카드
// ============================================================
function RecommendationCard({ rec, onAdd }: { rec: { reason: string; primary: string; foods: RecommendedFood[] }; onAdd: (entries: MacroEntry[]) => void }) {
  return (
    <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-primary-light">🍽️ 다음 식사 추천</span>
      </div>
      <p className="text-xs text-text-secondary mb-2.5 leading-relaxed">{rec.reason}</p>
      <div className="space-y-1.5">
        {rec.foods.map((f, i) => (
          <button
            key={i}
            onClick={() => onAdd([toMacroEntry(f, autoMealType())])}
            className="w-full bg-surface/70 hover:bg-surface rounded-lg p-2.5 text-left text-xs transition-colors"
          >
            <div className="flex justify-between items-baseline">
              <span className="font-medium">{f.name} {f.grams}g</span>
              <span className="text-primary-light text-[10px]">+ 추가</span>
            </div>
            <div className="text-[10px] text-text-secondary font-mono mt-0.5">
              {f.kcal}kcal · P{f.protein} · C{f.carbs} · F{f.fat}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 식단 템플릿 목록 (식사 추가 모달의 'template' 모드)
// ============================================================
function TemplateList({ onApply }: { onApply: (entries: MacroEntry[]) => void }) {
  const templates = useLiveQuery(() => db.mealTemplates.toArray(), []);
  const sorted = useMemo(() => {
    if (!templates) return [];
    // 최근 사용 순 + 미사용은 생성순
    return [...templates].sort((a, b) => {
      const ta = a.lastUsedAt || a.createdAt;
      const tb = b.lastUsedAt || b.createdAt;
      return tb.localeCompare(ta);
    });
  }, [templates]);

  const applyTemplate = async (t: MealTemplate) => {
    if (t.id) {
      await db.mealTemplates.update(t.id, { lastUsedAt: new Date().toISOString() });
    }
    onApply(t.entries);
  };

  const deleteTemplate = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('이 템플릿을 삭제할까요?')) {
      await db.mealTemplates.delete(id);
    }
  };

  if (!templates) return <div className="py-8 text-center text-text-secondary text-sm">로딩 중…</div>;

  if (templates.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="text-3xl mb-2">📋</div>
        <p className="text-text-secondary text-sm mb-1">저장된 템플릿이 없어요</p>
        <p className="text-text-secondary text-xs">오늘 식단 화면에서 "📋 오늘 식단을 템플릿으로 저장"을 눌러보세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {sorted.map((t) => {
        const totalKcal = t.entries.reduce((a, e) => a + e.kcal, 0);
        const totalP = Math.round(t.entries.reduce((a, e) => a + e.protein, 0));
        return (
          <button
            key={t.id}
            onClick={() => applyTemplate(t)}
            className="w-full bg-surface-light hover:bg-border rounded-lg p-3 text-left transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{t.name}</div>
                <div className="text-[10px] text-text-secondary mt-0.5">
                  {t.entries.length}개 항목 · {totalKcal}kcal · P{totalP}g
                </div>
                {t.lastUsedAt && (
                  <div className="text-[9px] text-text-secondary/70 mt-0.5">
                    마지막 사용 {t.lastUsedAt.split('T')[0]}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => deleteTemplate(e, t.id!)}
                className="text-text-secondary/40 hover:text-danger text-xs px-2 py-1"
              >✕</button>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// 현재 식단을 템플릿으로 저장
// ============================================================
function SaveTemplateModal({ entries, onClose }: { entries: MacroEntry[]; onClose: () => void }) {
  const [name, setName] = useState('');

  const handleSave = async () => {
    if (!name.trim() || entries.length === 0) return;
    await db.mealTemplates.add({
      name: name.trim(),
      entries: entries.map((e) => ({ ...e })),
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  const totalKcal = entries.reduce((a, e) => a + e.kcal, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">템플릿으로 저장</h3>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>

        <div className="bg-surface-light rounded-lg p-3 mb-3">
          <div className="text-[10px] text-text-secondary mb-1">저장될 항목 ({entries.length}개, {totalKcal}kcal)</div>
          <div className="text-xs text-text-secondary space-y-0.5 max-h-32 overflow-y-auto">
            {entries.map((e, i) => (
              <div key={i}>• {e.name}</div>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-text-secondary mb-1 block">템플릿 이름</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="예: 평일 아침 / 다이어트 점심"
            autoFocus
            className="w-full bg-surface-light rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-3 bg-primary disabled:opacity-40 text-white rounded-xl font-semibold"
        >
          저장
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 일반식 추정 폼 — 외식·집밥 등 영양정보 없는 음식
// ============================================================
const ESTIMATE_CATEGORIES = [
  { name: '한식 정식·백반',           kcal: 700, p: 25, c: 90,  f: 20 },
  { name: '집밥 (단순)',              kcal: 500, p: 20, c: 70,  f: 15 },
  { name: '일식 (회·초밥)',           kcal: 500, p: 30, c: 60,  f: 8  },
  { name: '양식 (파스타·스테이크)',    kcal: 800, p: 30, c: 60,  f: 30 },
  { name: '중식 (짜장·짬뽕·볶음)',     kcal: 800, p: 20, c: 100, f: 25 },
  { name: '카페·브런치',              kcal: 600, p: 20, c: 50,  f: 30 },
  { name: '뷔페 1접시',               kcal: 500, p: 20, c: 60,  f: 20 },
  { name: '분식 (떡볶이·김밥·라볶이)', kcal: 600, p: 15, c: 80,  f: 15 },
  { name: '치킨·피자',                kcal: 900, p: 30, c: 50,  f: 50 },
  { name: '햄버거·패스트푸드',         kcal: 700, p: 25, c: 60,  f: 35 },
  { name: '국밥·곰탕류',              kcal: 600, p: 30, c: 50,  f: 20 },
  { name: '구이류 (삼겹·갈비)',        kcal: 800, p: 35, c: 10,  f: 60 },
] as const;

type SizeOpt = 'sm' | 'md' | 'lg';
type ProtOpt = 'low' | 'mid' | 'hi';

function EstimateForm({ onAdd }: { onAdd: (entry: MacroEntry) => void }) {
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [size, setSize] = useState<SizeOpt>('md');
  const [protein, setProtein] = useState<ProtOpt>('mid');
  const [mealType, setMealType] = useState<MealType>(autoMealType());
  const [conservative, setConservative] = useState(false);

  const sizeFactor = size === 'sm' ? 0.7 : size === 'md' ? 1 : 1.4;
  const protFactor = protein === 'low' ? 0.7 : protein === 'mid' ? 1 : 1.5;
  const consvFactor = conservative ? 1.2 : 1;

  const base = ESTIMATE_CATEGORIES[categoryIdx];
  const estimated = {
    kcal: Math.round(base.kcal * sizeFactor * consvFactor),
    protein: Math.round(base.p * sizeFactor * protFactor),
    carbs: Math.round(base.c * sizeFactor * consvFactor),
    fat: Math.round(base.f * sizeFactor * consvFactor),
  };

  const handleAdd = () => {
    const sizeLabel = size === 'sm' ? '소' : size === 'md' ? '중' : '대';
    const protLabel = protein === 'low' ? '단백질 적음' : protein === 'mid' ? '보통' : '단백질 많음';
    onAdd({
      name: `${base.name} (${sizeLabel}, ${protLabel})${conservative ? ' [+20% 보정]' : ''}`,
      mealType,
      ...estimated,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-text-secondary leading-relaxed">
        외식·집밥처럼 영양 라벨이 없는 음식의 매크로를 카테고리·분량·단백질 비중으로 추정합니다. 정확도는 ±15% 정도.
      </p>

      <div>
        <label className="text-xs text-text-secondary mb-1 block">카테고리</label>
        <select
          value={categoryIdx}
          onChange={(e) => setCategoryIdx(Number(e.target.value))}
          className="w-full bg-surface-light rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          {ESTIMATE_CATEGORIES.map((c, i) => (
            <option key={i} value={i}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-text-secondary mb-1 block">분량</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: 'sm', label: '소', sub: '×0.7' },
            { v: 'md', label: '중', sub: '기본' },
            { v: 'lg', label: '대', sub: '×1.4' },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setSize(opt.v)}
              className={`py-2 rounded-lg text-sm ${size === opt.v ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'}`}
            >
              {opt.label}
              <div className="text-[9px] opacity-70">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-text-secondary mb-1 block">단백질 비중 (육류·생선·계란 비중)</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: 'low', label: '적음', sub: '채소·면 위주' },
            { v: 'mid', label: '보통', sub: '평균' },
            { v: 'hi',  label: '많음', sub: '고기·생선 충분' },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setProtein(opt.v)}
              className={`py-2 rounded-lg text-xs ${protein === opt.v ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'}`}
            >
              {opt.label}
              <div className="text-[9px] opacity-70">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={conservative}
          onChange={(e) => setConservative(e.target.checked)}
          className="accent-primary"
        />
        외식·소스 많음 — 칼로리·탄수·지방 +20% 보수적 보정
      </label>

      {/* 미리보기 */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
        <div className="text-[10px] text-text-secondary mb-1">추정 매크로 (미리보기)</div>
        <div className="text-2xl font-mono font-bold">{estimated.kcal}<span className="text-sm text-text-secondary"> kcal</span></div>
        <div className="flex gap-3 text-xs font-mono mt-1">
          <span className="text-red-400">P {estimated.protein}g</span>
          <span className="text-yellow-400">C {estimated.carbs}g</span>
          <span className="text-blue-400">F {estimated.fat}g</span>
        </div>
      </div>

      <div>
        <label className="text-xs text-text-secondary mb-1 block">식사 분류</label>
        <div className="flex gap-2">
          {MEAL_ORDER.map((m) => (
            <button
              key={m}
              onClick={() => setMealType(m)}
              className={`flex-1 py-2 rounded-lg text-sm ${mealType === m ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'}`}
            >
              {MEAL_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleAdd}
        className="w-full py-3 bg-primary text-white rounded-xl font-semibold"
      >
        추가
      </button>

      <p className="text-[10px] text-text-secondary text-center">
        ※ 추정값은 평균치. 정확하면 직접 입력 모드 권장.
      </p>
    </div>
  );
}

// 손바닥 분량 카운터 (직접 입력 모드의 보조)
function HandRow({ label, unit, value, onChange, colorClass }: { label: string; unit: string; value: number; onChange: (v: number) => void; colorClass: string }) {
  return (
    <div className="flex items-center justify-between bg-surface rounded-lg p-2">
      <div className="text-xs">
        <div className={`font-medium ${colorClass}`}>{label}</div>
        <div className="text-[10px] text-text-secondary">{unit}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, +(value - 0.5).toFixed(1)))}
          className="w-7 h-7 bg-surface-light rounded-lg text-text-secondary"
        >−</button>
        <span className="font-mono text-sm w-10 text-center">{value}개</span>
        <button
          onClick={() => onChange(Math.min(8, +(value + 0.5).toFixed(1)))}
          className="w-7 h-7 bg-surface-light rounded-lg text-text-secondary"
        >+</button>
      </div>
    </div>
  );
}

function MacroEditField({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (v: number) => void }) {
  return (
    <div className="bg-surface rounded-lg p-2">
      <div className={`text-[9px] ${color} text-center`}>{label}</div>
      <input
        type="number" inputMode="decimal"
        value={value || ''}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full bg-transparent text-center text-base font-mono font-semibold outline-none focus:bg-surface-light/50 rounded mt-0.5"
      />
    </div>
  );
}

function WaterCard({ waterMl, target, onAdd }: { waterMl: number; target: number; onAdd: (delta: number) => void }) {
  const pct = Math.min(100, (waterMl / target) * 100);
  const liters = (waterMl / 1000).toFixed(waterMl >= 1000 ? 1 : 2);
  return (
    <div className="bg-surface rounded-xl p-4">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm font-semibold">💧 물 섭취</span>
        <span className="text-sm font-mono">
          {liters}<span className="text-xs text-text-secondary"> / {(target / 1000).toFixed(1)} L ({Math.round(pct)}%)</span>
        </span>
      </div>
      <div className="h-2 bg-surface-light rounded-full overflow-hidden mb-3">
        <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => onAdd(-250)} className="flex-1 py-2 bg-surface-light rounded-lg text-xs text-text-secondary">−250</button>
        <button onClick={() => onAdd(250)} className="flex-1 py-2 bg-cyan-500/15 text-cyan-400 rounded-lg text-xs font-medium">+250ml</button>
        <button onClick={() => onAdd(500)} className="flex-1 py-2 bg-cyan-500/15 text-cyan-400 rounded-lg text-xs font-medium">+500ml</button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs text-text-secondary mb-1 block">{label}</label>
      <input
        type="number" inputMode="decimal" value={value || ''}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full bg-surface-light rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

// ============================================================
// 추이 view (체중 / 칼로리 / 매크로)
// ============================================================
function TrendView({ onNeedProfile }: { onNeedProfile: () => void }) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [profile] = useState(() => storage.nutritionProfile.get());

  // 기간 시작일 (포함)
  const fromDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1));
    return d.toISOString().split('T')[0];
  }, [days]);

  const weightLogs = useLiveQuery(
    () => db.bodyWeightLogs.where('date').aboveOrEqual(fromDate).toArray(),
    [fromDate]
  );
  const macroLogs = useLiveQuery(
    () => db.dailyMacroLogs.where('date').aboveOrEqual(fromDate).toArray(),
    [fromDate]
  );

  const target = profile ? calcMacros(profile, profile.goal) : null;

  const trendData = useMemo(() => {
    if (!weightLogs || !macroLogs) return [];
    const weightMap = new Map(weightLogs.map((w) => [w.date, w.weight]));
    const macroMap = new Map(
      macroLogs.map((l) => [
        l.date,
        l.entries.reduce(
          (a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.protein, c: a.c + e.carbs, f: a.f + e.fat }),
          { kcal: 0, p: 0, c: 0, f: 0 }
        ),
      ])
    );

    const points: { date: string; label: string; weight?: number; kcal: number; protein: number; carbs: number; fat: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const m = macroMap.get(dateStr);
      points.push({
        date: dateStr,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        weight: weightMap.get(dateStr),
        kcal: m?.kcal || 0,
        protein: m?.p || 0,
        carbs: m?.c || 0,
        fat: m?.f || 0,
      });
    }
    return points;
  }, [weightLogs, macroLogs, days]);

  const weightPoints = trendData.filter((p) => p.weight !== undefined);
  const kcalPoints = trendData.filter((p) => p.kcal > 0);
  const hasMacroData = kcalPoints.length > 0;
  const hasWeightData = weightPoints.length >= 2;

  // 평균 계산
  const avgKcal = hasMacroData
    ? Math.round(kcalPoints.reduce((a, p) => a + p.kcal, 0) / kcalPoints.length)
    : 0;
  const avgProtein = hasMacroData
    ? Math.round(kcalPoints.reduce((a, p) => a + p.protein, 0) / kcalPoints.length)
    : 0;
  const weightDiff = hasWeightData
    ? +(weightPoints[weightPoints.length - 1].weight! - weightPoints[0].weight!).toFixed(1)
    : 0;

  if (!profile) {
    return (
      <div className="bg-surface rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">📊</div>
        <h3 className="font-bold mb-1">프로필이 필요해요</h3>
        <p className="text-sm text-text-secondary mb-4">목표 칼로리·매크로를 표시하려면 프로필 설정이 필요해요</p>
        <button onClick={onNeedProfile} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
          프로필 입력하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 기간 선택 */}
      <div className="flex gap-1 bg-surface rounded-xl p-1">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d as 7 | 30 | 90)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              days === d ? 'bg-primary text-white' : 'text-text-secondary'
            }`}
          >최근 {d}일</button>
        ))}
      </div>

      {/* 자연어 인사이트 */}
      {(() => {
        const insights: { icon: string; text: string; tone: 'success' | 'warning' | 'neutral' }[] = [];

        if (target && avgProtein > 0) {
          const ratio = avgProtein / target.protein;
          if (ratio >= 0.95 && ratio <= 1.15) {
            insights.push({ icon: '✅', text: `단백질 평균 ${Math.round(ratio * 100)}% 달성 — 잘 챙기고 있어요`, tone: 'success' });
          } else if (ratio < 0.8) {
            insights.push({ icon: '⚠', text: `단백질 ${Math.round(ratio * 100)}%로 목표보다 ${Math.round(target.protein - avgProtein)}g 부족`, tone: 'warning' });
          } else if (ratio > 1.2) {
            insights.push({ icon: '↑', text: `단백질 ${Math.round(ratio * 100)}% — 충분 (과다는 큰 문제 아님)`, tone: 'neutral' });
          }
        }

        if (target && avgKcal > 0) {
          const pct = Math.round(((avgKcal - target.kcal) / target.kcal) * 100);
          if (Math.abs(pct) <= 5) {
            insights.push({ icon: '🎯', text: `칼로리 평균 ${avgKcal} — 목표(${target.kcal}) 정확히 맞춤`, tone: 'success' });
          } else if (Math.abs(pct) > 15) {
            insights.push({ icon: '⚠', text: `칼로리 변동 큼 (목표 대비 ${pct > 0 ? '+' : ''}${pct}%)`, tone: 'warning' });
          }
        }

        if (hasWeightData) {
          const weeksSpan = Math.max(1, days / 7);
          const weeklyDiff = +(weightDiff / weeksSpan).toFixed(2);
          const goal = profile.goal;
          if (goal === 'cut' || goal === 'cut_aggressive') {
            if (weeklyDiff <= -0.3 && weeklyDiff >= -0.7) {
              insights.push({ icon: '📉', text: `주당 ${Math.abs(weeklyDiff)}kg 감량 — 다이어트 적정 속도`, tone: 'success' });
            } else if (weeklyDiff < -0.7) {
              insights.push({ icon: '⚠', text: `주당 ${Math.abs(weeklyDiff)}kg — 너무 빠른 감량 (근손실 위험, 칼로리 ↑ 검토)`, tone: 'warning' });
            } else if (weeklyDiff >= 0) {
              insights.push({ icon: '⏸', text: `체중 정체 — 칼로리 정직하게 기록했는지 확인`, tone: 'warning' });
            }
          } else if (goal === 'lean_bulk' || goal === 'bulk') {
            if (weeklyDiff >= 0.2 && weeklyDiff <= 0.5) {
              insights.push({ icon: '📈', text: `주당 +${weeklyDiff}kg — 클린 벌크 적정 속도`, tone: 'success' });
            } else if (weeklyDiff > 0.7) {
              insights.push({ icon: '⚠', text: `주당 +${weeklyDiff}kg — 너무 빠른 벌크 (지방 증가 ↑, 탄수 −25g 검토)`, tone: 'warning' });
            } else if (weeklyDiff < 0.1) {
              insights.push({ icon: '↑', text: `벌크 진전 부족 — 탄수 +25g 추가 권장`, tone: 'neutral' });
            }
          }
        }

        if (insights.length === 0) return null;
        return (
          <div className="bg-surface rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-2">📊 이번 기간 인사이트</h3>
            <div className="space-y-2">
              {insights.map((ins, i) => (
                <div key={i} className={`text-xs p-2.5 rounded-lg flex items-start gap-1.5 ${
                  ins.tone === 'success' ? 'bg-success/10 text-success' :
                  ins.tone === 'warning' ? 'bg-warning/10 text-warning' :
                  'bg-surface-light text-text-secondary'
                }`}>
                  <span>{ins.icon}</span>
                  <span className="flex-1">{ins.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface rounded-xl p-3 text-center">
          <div className="text-[10px] text-text-secondary">평균 칼로리</div>
          <div className="text-lg font-mono font-bold mt-0.5">{avgKcal}</div>
          <div className="text-[10px] text-text-secondary">목표 {target?.kcal || 0}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <div className="text-[10px] text-text-secondary">평균 단백질</div>
          <div className="text-lg font-mono font-bold mt-0.5 text-red-400">{avgProtein}<span className="text-[10px] text-text-secondary">g</span></div>
          <div className="text-[10px] text-text-secondary">목표 {target?.protein || 0}g</div>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <div className="text-[10px] text-text-secondary">체중 변화</div>
          <div className={`text-lg font-mono font-bold mt-0.5 ${weightDiff > 0 ? 'text-warning' : weightDiff < 0 ? 'text-success' : ''}`}>
            {hasWeightData ? `${weightDiff > 0 ? '+' : ''}${weightDiff}` : '-'}
          </div>
          <div className="text-[10px] text-text-secondary">kg</div>
        </div>
      </div>

      {/* 체성분 분석 (체지방률·근육량 있을 때만) */}
      <BodyCompositionAnalysis logs={weightLogs || []} goal={profile.goal} />

      {/* 체중 추이 */}
      <div className="bg-surface rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-2">체중 추이</h3>
        {hasWeightData ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                labelFormatter={(l) => `날짜 ${l}`}
                formatter={(v) => [`${v}kg`, '체중']}
              />
              <Line type="monotone" dataKey="weight" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-6 text-text-secondary text-xs">
            체중 기록이 2개 이상 필요해요. 홈에서 매일 기록해보세요.
          </div>
        )}
      </div>

      {/* 칼로리 추이 */}
      <div className="bg-surface rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-2">칼로리 추이</h3>
        {hasMacroData ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <Tooltip
                contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${v} kcal`, '칼로리']}
              />
              {target && <ReferenceLine y={target.kcal} stroke="#22C55E" strokeDasharray="3 3" label={{ value: '목표', fill: '#22C55E', fontSize: 9, position: 'right' }} />}
              <Line type="monotone" dataKey="kcal" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-6 text-text-secondary text-xs">
            식단 기록이 없어요. 오늘 식단에서 추가해보세요.
          </div>
        )}
      </div>

      {/* 매크로 추이 */}
      <div className="bg-surface rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-2">매크로 추이 (g)</h3>
        {hasMacroData ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <Tooltip
                contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
              <Line type="monotone" dataKey="protein" name="단백질" stroke="#F87171" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="carbs" name="탄수" stroke="#FBBF24" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="fat" name="지방" stroke="#60A5FA" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-6 text-text-secondary text-xs">데이터 없음</div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 새 음식 등록 폼
// ============================================================
function NewFoodForm({ onSaved, onCancel }: { onSaved: (food: Food) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('protein');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [defaultServing, setDefaultServing] = useState('');
  const [servingLabel, setServingLabel] = useState('');

  const isValid = name.trim().length > 0 && Number(kcal) >= 0;

  const handleSave = async () => {
    if (!isValid) return;
    const food: Omit<Food, 'id'> = {
      name: name.trim(),
      category,
      kcalPer100g: Math.max(0, Number(kcal) || 0),
      proteinPer100g: Math.max(0, Number(protein) || 0),
      carbsPer100g: Math.max(0, Number(carbs) || 0),
      fatPer100g: Math.max(0, Number(fat) || 0),
      defaultServing: defaultServing ? Math.max(1, Number(defaultServing)) : undefined,
      servingLabel: servingLabel.trim() || undefined,
      isCustom: true,
    };
    const id = await db.foods.add(food as Food);
    onSaved({ ...food, id: id as number });
  };

  // 매크로로 칼로리 자동 계산
  const autoKcal = () => {
    const calc = kcalFromMacros(protein, carbs, fat);
    if (calc > 0) setKcal(String(calc));
  };

  return (
    <>
      <button onClick={onCancel} className="text-xs text-primary-light mb-3">← 검색으로 돌아가기</button>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-text-secondary mb-1 block">음식 이름</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="예: 단백질 쉐이크"
            className="w-full bg-surface-light rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-xs text-text-secondary mb-1 block">카테고리</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FoodCategory)}
            className="w-full bg-surface-light rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            {(Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[]).map((c) => (
              <option key={c} value={c}>{FOOD_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <div className="bg-surface-light/50 rounded-lg p-3">
          <div className="text-[10px] text-text-secondary mb-2">100g 기준 매크로</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-red-400 mb-1 block">단백질(g)</label>
              <input
                type="number" inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
                className="w-full bg-surface rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-yellow-400 mb-1 block">탄수(g)</label>
              <input
                type="number" inputMode="decimal" value={carbs} onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
                className="w-full bg-surface rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-blue-400 mb-1 block">지방(g)</label>
              <input
                type="number" inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)}
                placeholder="0"
                className="w-full bg-surface rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-text-secondary">칼로리 (kcal)</label>
              <button onClick={autoKcal} className="text-[10px] text-primary-light underline">매크로로 자동 계산</button>
            </div>
            <input
              type="number" inputMode="decimal" value={kcal} onChange={(e) => setKcal(e.target.value)}
              placeholder="0"
              className="w-full bg-surface rounded-lg px-4 py-2 font-mono text-center outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-text-secondary mb-1 block">기본 분량 (g, 선택)</label>
            <input
              type="number" inputMode="decimal" value={defaultServing} onChange={(e) => setDefaultServing(e.target.value)}
              placeholder="100"
              className="w-full bg-surface-light rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-[10px] text-text-secondary mb-1 block">단위 라벨 (선택)</label>
            <input
              type="text" value={servingLabel} onChange={(e) => setServingLabel(e.target.value)}
              placeholder="예: 1스쿱"
              className="w-full bg-surface-light rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!isValid}
          className="w-full mt-2 py-3 bg-primary disabled:opacity-40 text-white rounded-xl font-semibold"
        >
          등록하고 식사에 추가
        </button>
      </div>
    </>
  );
}
