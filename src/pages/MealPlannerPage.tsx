import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { storage } from '../lib/storage';
import { planTodaysMeals, swapMealItem, planToEntries } from '../lib/mealPlanner';
import { calcMacros } from '../lib/nutrition';
import { getLocalDate } from '../hooks/useLocalDate';
import type { MealPlanResult, PlannedItem, MealType, Food } from '../types';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식',
};

export default function MealPlannerPage() {
  const navigate = useNavigate();
  const [profile] = useState(() => storage.nutritionProfile.get());
  const [prefs, setPrefs] = useState(() => storage.dietPreferences.get());
  const [result, setResult] = useState<MealPlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExcludeModal, setShowExcludeModal] = useState(false);

  const target = profile ? calcMacros(profile, profile.goal) : null;

  const generate = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const r = await planTodaysMeals(profile);
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  // 처음 진입 시 자동 생성
  useEffect(() => { if (profile && !result) generate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSwap = async (mealIdx: number, itemIdx: number) => {
    if (!result) return;
    const current = result.meals[mealIdx].items[itemIdx];
    const replacement = await swapMealItem(current, current.foodId);
    if (!replacement) return;
    const next = { ...result };
    next.meals = result.meals.map((m, i) => {
      if (i !== mealIdx) return m;
      const items = m.items.map((it, j) => j === itemIdx ? replacement : it);
      return { ...m, items };
    });
    // 합계 재계산
    next.totalKcal = next.meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.kcal, 0), 0);
    next.totalProtein = Math.round(next.meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.protein, 0), 0));
    next.totalCarbs = Math.round(next.meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.carbs, 0), 0));
    next.totalFat = Math.round(next.meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.fat, 0), 0));
    next.matchRatio = target && target.kcal > 0 ? Math.min(1.2, next.totalKcal / target.kcal) : 0;
    setResult(next);
  };

  const handleRemoveItem = (mealIdx: number, itemIdx: number) => {
    if (!result) return;
    const next = { ...result };
    next.meals = result.meals.map((m, i) => {
      if (i !== mealIdx) return m;
      return { ...m, items: m.items.filter((_, j) => j !== itemIdx) };
    });
    next.totalKcal = next.meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.kcal, 0), 0);
    next.totalProtein = Math.round(next.meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.protein, 0), 0));
    next.totalCarbs = Math.round(next.meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.carbs, 0), 0));
    next.totalFat = Math.round(next.meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.fat, 0), 0));
    next.matchRatio = target && target.kcal > 0 ? Math.min(1.2, next.totalKcal / target.kcal) : 0;
    setResult(next);
  };

  const handleApplyAll = async () => {
    if (!result) return;
    const today = getLocalDate();
    const log = await db.dailyMacroLogs.where('date').equals(today).first();
    const newEntries = planToEntries(result);
    if (log?.id) {
      await db.dailyMacroLogs.update(log.id, { entries: [...log.entries, ...newEntries] });
    } else {
      await db.dailyMacroLogs.add({ date: today, entries: newEntries, waterMl: 0 });
    }
    navigate('/nutrition');
  };

  if (!profile) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">🪄 자동 식단 짜기</h1>
        <div className="bg-surface rounded-xl p-6 text-center">
          <p className="text-text-secondary text-sm mb-4">프로필 먼저 설정해주세요</p>
          <button onClick={() => navigate('/nutrition')} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">
            영양 페이지로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => navigate(-1)} className="text-text-secondary text-sm">← 뒤로</button>
        <h1 className="text-xl font-bold">🪄 자동 식단</h1>
        <button
          onClick={() => setShowExcludeModal(true)}
          className="text-xs text-primary-light px-2 py-1 bg-primary/10 rounded-lg"
        >제외 음식</button>
      </div>

      {/* 옵션 + 생성 */}
      <div className="bg-surface rounded-xl p-4 mb-4">
        <label className="flex items-center gap-2 text-sm mb-3">
          <input
            type="checkbox"
            checked={prefs.simpleMode}
            onChange={(e) => {
              const next = { ...prefs, simpleMode: e.target.checked };
              setPrefs(next);
              storage.dietPreferences.set(next);
            }}
            className="accent-primary"
          />
          <span>간단 모드 (시간 부족 — 끼니별 음식 수 줄임)</span>
        </label>
        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-3 bg-primary disabled:opacity-40 text-white rounded-xl font-semibold"
        >
          {loading ? '생성 중…' : result ? '🔄 다시 생성' : '🪄 식단 생성'}
        </button>
      </div>

      {result && target && (
        <>
          {/* 매크로 합계 */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm font-semibold">예상 매크로 합계</span>
              <span className={`text-sm font-mono ${result.matchRatio >= 0.9 && result.matchRatio <= 1.1 ? 'text-success' : 'text-warning'}`}>
                {Math.round(result.matchRatio * 100)}%
              </span>
            </div>
            <div className="text-2xl font-mono font-bold mb-1">{result.totalKcal}<span className="text-sm text-text-secondary"> / {target.kcal} kcal</span></div>
            <div className="flex gap-3 text-xs font-mono">
              <span className="text-red-400">P {result.totalProtein}<span className="text-text-secondary">/{target.protein}g</span></span>
              <span className="text-yellow-400">C {result.totalCarbs}<span className="text-text-secondary">/{target.carbs}g</span></span>
              <span className="text-blue-400">F {result.totalFat}<span className="text-text-secondary">/{target.fat}g</span></span>
            </div>
          </div>

          {/* 4끼 카드 */}
          <div className="space-y-3 mb-4">
            {result.meals.map((meal, mi) => {
              const mealKcal = meal.items.reduce((s, i) => s + i.kcal, 0);
              return (
                <div key={meal.mealType} className="bg-surface rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">{MEAL_LABELS[meal.mealType]}</span>
                    <span className="text-xs text-text-secondary font-mono">{mealKcal} / {meal.targetKcal} kcal</span>
                  </div>
                  {meal.items.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-2">항목 없음</p>
                  ) : (
                    <div className="space-y-1.5">
                      {meal.items.map((item, ii) => (
                        <ItemRow
                          key={ii}
                          item={item}
                          onSwap={() => handleSwap(mi, ii)}
                          onRemove={() => handleRemoveItem(mi, ii)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 적용 */}
          <button
            onClick={handleApplyAll}
            className="w-full py-3 bg-success text-white rounded-xl font-semibold mb-2"
          >
            ✓ 오늘 식단에 모두 적용
          </button>
          <p className="text-[10px] text-text-secondary text-center">
            적용 시 기존 식단 위에 추가됩니다. 적용 후 영양 페이지에서 개별 수정 가능.
          </p>
        </>
      )}

      {showExcludeModal && (
        <ExcludeFoodsModal
          prefs={prefs}
          onChange={(p) => { setPrefs(p); storage.dietPreferences.set(p); }}
          onClose={() => setShowExcludeModal(false)}
        />
      )}
    </div>
  );
}

function ItemRow({ item, onSwap, onRemove }: { item: PlannedItem; onSwap: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-surface-light rounded-lg p-2">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.foodName} {item.grams}g</div>
        <div className="text-[10px] text-text-secondary font-mono">
          {item.kcal}kcal · P{item.protein} · C{item.carbs} · F{item.fat}
        </div>
      </div>
      <button
        onClick={onSwap}
        aria-label="다른 음식으로 교체"
        className="w-11 h-11 flex items-center justify-center bg-primary/15 text-primary-light rounded-lg active:bg-primary/25 shrink-0"
      >🔄</button>
      <button
        onClick={onRemove}
        aria-label="이 항목 제외"
        className="w-11 h-11 flex items-center justify-center text-text-secondary rounded-lg active:text-danger active:bg-danger/10 shrink-0"
      >✕</button>
    </div>
  );
}

function ExcludeFoodsModal({ prefs, onChange, onClose }: { prefs: { excludedFoodIds: number[]; simpleMode: boolean }; onChange: (p: { excludedFoodIds: number[]; simpleMode: boolean }) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const allFoods = useLiveQuery(() => db.foods.toArray(), []);

  const filtered = (allFoods || []).filter((f) =>
    !query.trim() || f.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const excludedSet = new Set(prefs.excludedFoodIds);

  const toggle = (food: Food) => {
    if (food.id === undefined) return;
    const newSet = new Set(excludedSet);
    if (newSet.has(food.id)) newSet.delete(food.id);
    else newSet.add(food.id);
    onChange({ ...prefs, excludedFoodIds: [...newSet] });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold">제외할 음식 ({prefs.excludedFoodIds.length})</h3>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>
        <p className="text-[11px] text-text-secondary mb-3">알레르기·싫어하는 음식 선택. 자동 식단 짜기에서 자동 제외됩니다.</p>
        <input
          type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="검색"
          className="w-full bg-surface-light rounded-lg px-4 py-2.5 mb-3 outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="space-y-1 max-h-[55vh] overflow-y-auto">
          {filtered.slice(0, 50).map((f) => {
            const isExcluded = f.id !== undefined && excludedSet.has(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggle(f)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                  isExcluded ? 'bg-danger/15 border border-danger/30' : 'bg-surface-light'
                }`}
              >
                <span className={`text-sm ${isExcluded ? 'text-danger line-through' : ''}`}>{f.name}</span>
                <span className="text-[10px] text-text-secondary">
                  {isExcluded ? '제외됨' : '+ 제외'}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-3 py-2.5 bg-primary text-white rounded-xl font-medium text-sm"
        >완료</button>
      </div>
    </div>
  );
}
