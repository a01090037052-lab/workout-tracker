import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { storage } from '../lib/storage';
import { calcBMR, calcTDEE, calcAllScenarios, calcMacros, GOAL_LABELS, GOAL_DESCRIPTIONS, ACTIVITY_LABELS } from '../lib/nutrition';
import { getLocalDate } from '../hooks/useLocalDate';
import type { NutritionProfile, MealType, MacroEntry, ActivityLevel, DietGoal } from '../types';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식',
};
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function NutritionPage() {
  const [view, setView] = useState<'today' | 'calculator'>(() =>
    storage.nutritionProfile.get() ? 'today' : 'calculator'
  );

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-4">영양</h1>

      {/* 탭 토글 */}
      <div className="flex gap-2 mb-4 bg-surface rounded-xl p-1">
        <button
          onClick={() => setView('today')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'today' ? 'bg-primary text-white' : 'text-text-secondary'
          }`}
        >
          오늘 식단
        </button>
        <button
          onClick={() => setView('calculator')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'calculator' ? 'bg-primary text-white' : 'text-text-secondary'
          }`}
        >
          계산기 / 프로필
        </button>
      </div>

      {view === 'today' ? <TodayView onNeedProfile={() => setView('calculator')} /> : <CalculatorView onSaved={() => setView('today')} />}
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
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const handleSave = () => {
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

  // 매크로로 칼로리 자동 계산 옵션 (헬퍼)
  const autoKcal = () => {
    const p = Number(protein) || 0;
    const c = Number(carbs) || 0;
    const f = Number(fat) || 0;
    const calc = Math.round(p * 4 + c * 4 + f * 9);
    if (calc > 0) setKcal(String(calc));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">식사 추가</h3>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">음식 이름</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="예: 닭가슴살 100g"
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
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full mt-4 py-3 bg-primary disabled:opacity-40 text-white rounded-xl font-semibold"
        >
          추가
        </button>
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
