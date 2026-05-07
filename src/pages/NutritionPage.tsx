import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { db } from '../db';
import { storage } from '../lib/storage';
import { calcBMR, calcTDEE, calcAllScenarios, calcMacros, GOAL_LABELS, GOAL_DESCRIPTIONS, ACTIVITY_LABELS } from '../lib/nutrition';
import { getLocalDate } from '../hooks/useLocalDate';
import { FOOD_CATEGORY_LABELS } from '../data/foods';
import type { NutritionProfile, MealType, MacroEntry, ActivityLevel, DietGoal, Food, FoodCategory } from '../types';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식',
};
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

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
  const today = getLocalDate();
  const [profile] = useState(() => storage.nutritionProfile.get());
  const [showAddModal, setShowAddModal] = useState(false);

  const log = useLiveQuery(() => db.dailyMacroLogs.where('date').equals(today).first(), [today]);
  const entries = log?.entries || [];

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

  const addEntry = async (entry: MacroEntry) => {
    if (log?.id) {
      await db.dailyMacroLogs.update(log.id, { entries: [...entries, entry] });
    } else {
      await db.dailyMacroLogs.add({ date: today, entries: [entry] });
    }
    setShowAddModal(false);
  };

  const removeEntry = async (idx: number) => {
    if (!log?.id) return;
    const next = entries.filter((_, i) => i !== idx);
    await db.dailyMacroLogs.update(log.id, { entries: next });
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
      {/* 매크로 합계 카드 */}
      <MacroSummaryCard totals={totals} target={target!} goal={profile.goal} />

      {/* 식사 추가 */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full py-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:border-primary hover:text-primary transition-colors"
      >
        + 식사 추가
      </button>

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

      {showAddModal && <AddMealModal onAdd={addEntry} onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

// ============================================================
// 매크로 합계 카드
// ============================================================
function MacroSummaryCard({
  totals, target, goal,
}: {
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  target: { kcal: number; protein: number; carbs: number; fat: number };
  goal: DietGoal;
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
function AddMealModal({ onAdd, onClose }: { onAdd: (entry: MacroEntry) => void; onClose: () => void }) {
  const [mode, setMode] = useState<'search' | 'manual' | 'portion' | 'newFood'>('search');
  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [portionG, setPortionG] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'favorites' | FoodCategory>('all');
  const [favTick, setFavTick] = useState(0); // 즐겨찾기 토글 → 리렌더

  // 직접 입력 모드 상태
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const allFoods = useLiveQuery(() => db.foods.toArray(), []);
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
    // 즐겨찾기 우선 정렬
    list = [...list].sort((a, b) => {
      const af = a.id !== undefined && favIds.includes(a.id) ? 1 : 0;
      const bf = b.id !== undefined && favIds.includes(b.id) ? 1 : 0;
      return bf - af;
    });
    return q ? list : list.slice(0, 50);
  }, [allFoods, query, categoryFilter, favIds]);

  const toggleFavorite = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    storage.favoriteFoods.toggle(id);
    setFavTick((t) => t + 1);
  };

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setPortionG(String(food.defaultServing || 100));
    setMode('portion');
  };

  const handlePortionAdd = () => {
    if (!selectedFood) return;
    const g = Math.max(1, Number(portionG) || 0);
    const ratio = g / 100;
    onAdd({
      name: `${selectedFood.name} ${g}g`,
      mealType,
      kcal: Math.round(selectedFood.kcalPer100g * ratio),
      protein: Math.round(selectedFood.proteinPer100g * ratio * 10) / 10,
      carbs: Math.round(selectedFood.carbsPer100g * ratio * 10) / 10,
      fat: Math.round(selectedFood.fatPer100g * ratio * 10) / 10,
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
    const p = Number(protein) || 0;
    const c = Number(carbs) || 0;
    const f = Number(fat) || 0;
    const calc = Math.round(p * 4 + c * 4 + f * 9);
    if (calc > 0) setKcal(String(calc));
  };

  const portionRatio = selectedFood ? Math.max(1, Number(portionG) || 0) / 100 : 0;
  const preview = selectedFood ? {
    kcal: Math.round(selectedFood.kcalPer100g * portionRatio),
    p: Math.round(selectedFood.proteinPer100g * portionRatio * 10) / 10,
    c: Math.round(selectedFood.carbsPer100g * portionRatio * 10) / 10,
    f: Math.round(selectedFood.fatPer100g * portionRatio * 10) / 10,
  } : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold">식사 추가</h3>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>

        {/* 모드 토글 (분량 입력 중엔 숨김) */}
        {mode !== 'portion' && (
          <div className="flex gap-2 mb-3 bg-surface-light/50 rounded-lg p-1">
            <button
              onClick={() => setMode('search')}
              className={`flex-1 py-1.5 rounded text-xs font-medium ${mode === 'search' ? 'bg-primary text-white' : 'text-text-secondary'}`}
            >🔍 음식 검색</button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-1.5 rounded text-xs font-medium ${mode === 'manual' ? 'bg-primary text-white' : 'text-text-secondary'}`}
            >✏️ 직접 입력</button>
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
                type="number" inputMode="decimal" value={portionG} onChange={(e) => setPortionG(e.target.value)}
                placeholder="100"
                className="w-full bg-surface-light rounded-lg px-4 py-2.5 font-mono text-center outline-none focus:ring-2 focus:ring-primary"
              />
              {selectedFood.servingLabel && (
                <button
                  onClick={() => setPortionG(String(selectedFood.defaultServing || 100))}
                  className="text-[10px] text-primary-light underline mt-1"
                >
                  {selectedFood.servingLabel}로 채우기
                </button>
              )}
            </div>

            {/* 매크로 미리보기 */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-3">
              <div className="text-[10px] text-text-secondary mb-1">매크로 미리보기</div>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-mono font-bold">{preview.kcal}<span className="text-sm text-text-secondary"> kcal</span></span>
              </div>
              <div className="flex gap-3 text-xs font-mono mt-1">
                <span className="text-red-400">P {preview.p}g</span>
                <span className="text-yellow-400">C {preview.c}g</span>
                <span className="text-blue-400">F {preview.f}g</span>
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
    const p = Number(protein) || 0;
    const c = Number(carbs) || 0;
    const f = Number(fat) || 0;
    const calc = Math.round(p * 4 + c * 4 + f * 9);
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
