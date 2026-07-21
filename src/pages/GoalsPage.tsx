import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { GOAL_TYPE_LABELS, GOAL_TYPE_ICONS, getCurrentValue, calcProgress, daysLeft, isAchieved } from '../lib/goals';
import type { Goal, GoalType } from '../types';

export default function GoalsPage() {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const goals = useLiveQuery(() => db.goals.toArray(), []);

  const active = (goals || []).filter((g) => !g.completedAt);
  const completed = (goals || []).filter((g) => g.completedAt);

  return (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => navigate(-1)} className="text-text-secondary text-sm">← 뒤로</button>
        <h1 className="text-xl font-bold">목표</h1>
        <div className="w-10" />
      </div>

      <button
        onClick={() => setShowAdd(true)}
        className="w-full mb-4 py-3 bg-primary text-white rounded-xl font-semibold"
      >+ 새 목표 추가</button>

      {/* 진행 중 */}
      <section className="mb-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">진행 중 ({active.length})</h2>
        {active.length === 0 ? (
          <div className="bg-surface rounded-xl p-8 text-center border border-border border-dashed">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-text-secondary text-sm">진행 중인 목표가 없어요</p>
            <p className="text-text-secondary text-xs mt-1">새 목표를 추가하면 진행률이 자동 추적돼요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((g) => <GoalCard key={g.id} goal={g} />)}
          </div>
        )}
      </section>

      {/* 완료 */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">완료 ({completed.length})</h2>
          <div className="space-y-2">
            {completed.map((g) => <GoalCard key={g.id} goal={g} />)}
          </div>
        </section>
      )}

      {showAdd && <AddGoalModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const [current, setCurrent] = useState<number>(goal.startValue);

  useEffect(() => {
    getCurrentValue(goal).then(setCurrent);
  }, [goal]);

  const progress = calcProgress(goal, current);
  const days = daysLeft(goal);
  const achieved = isAchieved(goal, current);

  // 자동 완료 마킹 (UI에서 한 번만)
  useEffect(() => {
    if (achieved && !goal.completedAt && goal.id) {
      db.goals.update(goal.id, { completedAt: new Date().toISOString() });
    }
  }, [achieved, goal]);

  const handleDelete = async () => {
    if (goal.id && confirm('이 목표를 삭제할까요?')) {
      await db.goals.delete(goal.id);
    }
  };

  const isCompleted = !!goal.completedAt;

  return (
    <div className={`rounded-xl p-4 border ${
      isCompleted ? 'bg-success/5 border-success/30' : 'bg-surface border-border'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{GOAL_TYPE_ICONS[goal.type]}</span>
          <div>
            <div className="text-sm font-semibold">
              {goal.type === 'oneRepMax' ? goal.exerciseName : GOAL_TYPE_LABELS[goal.type]}
            </div>
            <div className="text-[10px] text-text-secondary font-mono">
              {goal.startValue} → {goal.targetValue}
              {goal.type === 'oneRepMax' || goal.type === 'bodyWeight' ? ' kg' : '회/주'}
            </div>
          </div>
        </div>
        <button onClick={handleDelete} className="text-text-secondary/40 hover:text-danger text-xs">✕</button>
      </div>

      {/* 진행률 */}
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-text-secondary">현재 <span className="font-mono font-bold text-text">{current}</span></span>
        <span className={`text-xs font-mono ${achieved ? 'text-success font-bold' : ''}`}>
          {achieved ? '✓ 달성' : `${Math.round(progress)}%`}
        </span>
      </div>
      <div className="h-2 bg-surface-light rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${achieved ? 'bg-success' : 'bg-primary'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-text-secondary mt-2">
        <span>{goal.startDate} → {goal.targetDate}</span>
        <span className={days < 7 && !achieved && !isCompleted ? 'text-warning font-medium' : ''}>
          {isCompleted ? `완료 ${goal.completedAt?.split('T')[0]}` : days >= 0 ? `${days}일 남음` : `${Math.abs(days)}일 지남`}
        </span>
      </div>
    </div>
  );
}

function AddGoalModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<GoalType>('oneRepMax');
  const [exerciseName, setExerciseName] = useState('');
  const [startValue, setStartValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });

  // isCustom은 boolean이라 IndexedDB 인덱스로 조회되지 않음 → JS 필터 사용
  // (기존 where('isCustom').equals(0)은 항상 빈 목록을 반환했음)
  const exercises = useLiveQuery(async () => {
    try {
      return await db.exercises.toArray();
    } catch {
      return [];
    }
  }, []);

  // 종목 선택 시 PR로 시작값 자동 채움
  const autoFillStart = async () => {
    if (type === 'oneRepMax' && exerciseName) {
      const ex = exercises?.find((e) => e.name === exerciseName);
      if (ex?.id) {
        const prs = await db.personalRecords.where('exerciseId').equals(ex.id).sortBy('estimated1RM');
        if (prs.length > 0) setStartValue(String(Math.round(prs[prs.length - 1].estimated1RM)));
      }
    } else if (type === 'bodyWeight') {
      const recent = await db.bodyWeightLogs.orderBy('date').reverse().limit(1).toArray();
      if (recent[0]) setStartValue(String(recent[0].weight));
    }
  };

  useEffect(() => { autoFillStart(); }, [type, exerciseName]); // eslint-disable-line react-hooks/exhaustive-deps

  const isValid = startValue !== '' && targetValue !== '' && targetDate &&
    (type !== 'oneRepMax' || exerciseName) &&
    Number(startValue) !== Number(targetValue);

  const handleSave = async () => {
    if (!isValid) return;
    const today = new Date().toISOString().split('T')[0];
    await db.goals.add({
      type,
      exerciseName: type === 'oneRepMax' ? exerciseName : undefined,
      startValue: Number(startValue),
      targetValue: Number(targetValue),
      startDate: today,
      targetDate,
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">새 목표</h3>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">종류</label>
            <div className="grid grid-cols-3 gap-2">
              {(['oneRepMax', 'bodyWeight', 'weeklyWorkouts'] as GoalType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2 rounded-lg text-xs ${type === t ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'}`}
                >
                  <div className="text-base">{GOAL_TYPE_ICONS[t]}</div>
                  <div className="text-[10px] mt-0.5">{GOAL_TYPE_LABELS[t]}</div>
                </button>
              ))}
            </div>
          </div>

          {type === 'oneRepMax' && (
            <div>
              <label className="text-xs text-text-secondary mb-1 block">종목</label>
              <select
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                className="w-full bg-surface-light rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">선택…</option>
                {exercises?.slice(0, 50).map((e) => (
                  <option key={e.id} value={e.name}>{e.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">시작값</label>
              <input
                type="number" inputMode="decimal" value={startValue}
                onChange={(e) => setStartValue(e.target.value)}
                placeholder="0"
                className="w-full bg-surface-light rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">목표값</label>
              <input
                type="number" inputMode="decimal" value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="0"
                className="w-full bg-surface-light rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">목표 날짜</label>
            <input
              type="date" value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-surface-light rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!isValid}
          className="w-full mt-4 py-3 bg-primary disabled:opacity-40 text-white rounded-xl font-semibold"
        >
          목표 추가
        </button>

        <p className="text-[10px] text-text-secondary text-center mt-2">
          현재값은 PR/체중/세션 기록에서 자동으로 계산돼요
        </p>
      </div>
    </div>
  );
}
