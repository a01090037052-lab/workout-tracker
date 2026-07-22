import { useEffect, useRef, useState } from 'react';
import type { WorkoutSet, TrainingGoal, Condition } from '../../types';
import { getTrainingZone, checkGoalMismatch, suggestForSet, getIncrement } from '../../hooks/useTrainingGuide';
import { storage } from '../../lib/storage';

interface Props {
  set: WorkoutSet;
  setIndex: number;
  currentSets: WorkoutSet[];
  previousSessionSets?: WorkoutSet[];
  estimated1RM?: number;
  trainingGoal?: TrainingGoal;
  condition?: Condition;
  isBodyweight?: boolean;
  equipmentType?: string;
  isCompound?: boolean;
  isExpanded?: boolean;
  onActivate?: () => void;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onComplete: () => void;
  onRemove: () => void;
}

/** "62.", "62.5" 같은 중간 입력이 살아남도록 숫자+점 한 개만 허용 */
function sanitizeDecimal(v: string): string {
  return v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}
function sanitizeInt(v: string): string {
  return v.replace(/[^0-9]/g, '');
}

export default function SetRow({
  set, setIndex, currentSets, previousSessionSets,
  estimated1RM, trainingGoal, condition, isBodyweight, equipmentType, isCompound,
  isExpanded, onActivate, onUpdate, onComplete, onRemove,
}: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const repsInputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // 입력 중에는 문자열 버퍼를 그대로 두고, 확정(blur) 시점에만 숫자로 반영.
  // type="number" + Number()는 "62." 상태에서 빈 문자열을 반환해 소수점 입력이 불가능했음.
  const [weightDraft, setWeightDraft] = useState<string | null>(null);
  const [repsDraft, setRepsDraft] = useState<string | null>(null);

  // 이 세트가 펼쳐지면 화면 안으로. block:'nearest'라 이미 보이면 스크롤하지 않아 덜 튄다.
  useEffect(() => {
    if (isExpanded) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isExpanded]);

  const handleWeightEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    commitWeight();
    repsInputRef.current?.focus();
  };
  const handleRepsEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    commitReps();
    e.currentTarget.blur();
    if (set.isCompleted) return;
    const canComplete = isBodyweight ? set.reps > 0 : (set.weight > 0 && set.reps > 0);
    if (canComplete) onComplete();
  };

  const commitWeight = () => {
    if (weightDraft === null) return;
    onUpdate({ weight: Math.max(0, Math.min(999, Number(weightDraft) || 0)) });
    setWeightDraft(null);
  };
  const commitReps = () => {
    if (repsDraft === null) return;
    onUpdate({ reps: Math.max(0, Math.min(999, Math.floor(Number(repsDraft) || 0))) });
    setRepsDraft(null);
  };

  const zone = set.isCompleted && estimated1RM
    ? getTrainingZone(set.weight, set.reps, estimated1RM)
    : null;
  const mismatch = zone && trainingGoal ? checkGoalMismatch(trainingGoal, zone) : null;

  const weightSuggestionEnabled = storage.weightSuggestion.get();
  const suggestion = weightSuggestionEnabled && !set.isCompleted && trainingGoal
    ? suggestForSet({ goal: trainingGoal, setIndex, currentSets, previousSessionSets, estimated1RM, condition, equipmentType, isCompound })
    : null;
  const hasSuggestion = suggestion && suggestion.weight > 0;
  const previousSet = previousSessionSets?.[setIndex];

  const incFromGuide = getIncrement(equipmentType, isCompound);
  const weightStep = incFromGuide > 0 ? incFromGuide : 1;

  const typeBadge = set.setType === 'warmup' ? 'W' : set.setType === 'dropset' ? 'D' : `${set.setNumber}`;
  const typeBadgeClass =
    set.setType === 'warmup' ? 'bg-yellow-500/20 text-yellow-400'
    : set.setType === 'dropset' ? 'bg-purple-500/20 text-purple-400'
    : set.isCompleted ? 'bg-primary/20 text-primary-light' : 'bg-surface-light text-text-secondary';

  const weightValue = weightDraft !== null ? weightDraft : (set.weight ? String(set.weight) : '');
  const repsValue = repsDraft !== null ? repsDraft : (set.reps ? String(set.reps) : '');

  // ── 접힌 세트: 한 줄 요약. 탭하면 펼쳐진다 ─────────────────────
  if (!isExpanded) {
    const summary = set.isCompleted || set.weight || set.reps
      ? (isBodyweight ? `${set.reps || 0}회` : `${set.weight || 0}kg × ${set.reps || 0}`)
      : '미입력';
    return (
      <button
        ref={rowRef as never}
        onClick={onActivate}
        className={`w-full flex items-center gap-2.5 py-2.5 px-3 mb-1.5 rounded-xl text-left transition-colors ${
          set.isCompleted ? 'bg-primary/5' : 'bg-surface-light/30 active:bg-surface-light/60'
        }`}
      >
        <span className={`text-[11px] w-7 h-7 flex items-center justify-center font-mono font-bold rounded ${typeBadgeClass}`}>
          {typeBadge}
        </span>
        <span className={`flex-1 text-sm font-mono ${set.isCompleted ? 'text-text' : 'text-text-secondary'}`}>
          {summary}
        </span>
        {zone && <span className={`text-xs ${zone.color}`}>{zone.icon}</span>}
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
          set.isCompleted ? 'bg-success text-white' : 'border border-border text-transparent'
        }`}>✓</span>
      </button>
    );
  }

  // ── 펼친 세트: 큰 컨트롤 ──────────────────────────────────────
  const canComplete = isBodyweight ? set.reps > 0 : (set.weight > 0 && set.reps > 0);
  return (
    <div
      ref={rowRef}
      className={`mb-2 rounded-2xl border p-3 ${
        set.isCompleted ? 'bg-primary/10 border-primary/25' : 'bg-surface-light/40 border-border'
      }`}
    >
      {/* 세트 타입 세그먼트 + 라벨 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
          {([['warmup', 'W'], ['normal', '일반'], ['dropset', 'D']] as const).map(([type, label]) => (
            <button
              key={type}
              onClick={() => onUpdate({ setType: type })}
              className={`px-2.5 h-8 text-xs font-medium rounded-md transition-colors ${
                (set.setType || 'normal') === type
                  ? type === 'warmup' ? 'bg-yellow-500/20 text-yellow-400'
                    : type === 'dropset' ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-primary/20 text-primary-light'
                  : 'text-text-secondary'
              }`}
            >{label}</button>
          ))}
        </div>
        <span className="text-xs text-text-secondary font-mono">{set.setNumber}세트</span>
      </div>

      {/* 무게: ± 버튼이 주력 컨트롤 (자주 하는 건 65→67.5처럼 고치는 것) */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => { commitWeight(); onUpdate({ weight: Math.max(0, (set.weight || 0) - weightStep) }); }}
          className="w-14 h-14 rounded-xl bg-surface text-2xl text-text-secondary active:bg-border shrink-0"
        >−</button>
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="decimal"
            enterKeyHint="next"
            value={weightValue}
            onFocus={(e) => { setWeightDraft(set.weight ? String(set.weight) : ''); e.target.select(); }}
            onChange={(e) => setWeightDraft(sanitizeDecimal(e.target.value))}
            onBlur={commitWeight}
            onKeyDown={handleWeightEnter}
            placeholder={isBodyweight ? '+0' : (hasSuggestion ? `${suggestion!.weight}` : previousSet?.weight ? `${previousSet.weight}` : '0')}
            className={`w-full h-14 text-center text-3xl font-mono font-bold rounded-xl outline-none transition-all ${
              set.isCompleted ? 'bg-primary/10 text-primary-light' : 'bg-surface focus:ring-2 focus:ring-primary'
            }`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">{isBodyweight ? '+kg' : 'kg'}</span>
        </div>
        <button
          onClick={() => { commitWeight(); onUpdate({ weight: Math.min(999, (set.weight || 0) + weightStep) }); }}
          className="w-14 h-14 rounded-xl bg-surface text-2xl text-text-secondary active:bg-border shrink-0"
        >+</button>
      </div>

      {/* 지난번 / 추천 칩 — 탭하면 무게+횟수 동시 입력 */}
      <div className="flex items-center gap-2 mb-3">
        {previousSet && (previousSet.weight > 0 || previousSet.reps > 0) && (
          <button
            onClick={() => onUpdate({ weight: previousSet.weight, reps: previousSet.reps })}
            className="flex-1 h-9 rounded-lg bg-surface text-xs text-text-secondary font-mono active:bg-border"
          >지난번 {isBodyweight ? `${previousSet.reps}회` : `${previousSet.weight}×${previousSet.reps}`}</button>
        )}
        {hasSuggestion && (
          <button
            onClick={() => onUpdate({ weight: suggestion!.weight, reps: suggestion!.reps })}
            className="flex-1 h-9 rounded-lg bg-primary/15 text-xs text-primary-light font-mono font-semibold active:bg-primary/25"
          >추천 {isBodyweight ? `${suggestion!.reps}회` : `${suggestion!.weight}×${suggestion!.reps}`}</button>
        )}
      </div>

      {/* 횟수 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-text-secondary w-8">횟수</span>
        <button
          onClick={() => { commitReps(); onUpdate({ reps: Math.max(0, (set.reps || 0) - 1) }); }}
          className="w-12 h-12 rounded-xl bg-surface text-xl text-text-secondary active:bg-border shrink-0"
        >−</button>
        <div className="relative flex-1">
          <input
            ref={repsInputRef}
            type="text"
            inputMode="numeric"
            enterKeyHint="done"
            value={repsValue}
            onFocus={(e) => { setRepsDraft(set.reps ? String(set.reps) : ''); e.target.select(); }}
            onChange={(e) => setRepsDraft(sanitizeInt(e.target.value))}
            onBlur={commitReps}
            onKeyDown={handleRepsEnter}
            placeholder={hasSuggestion ? `${suggestion!.reps}` : previousSet?.reps ? `${previousSet.reps}` : '0'}
            className={`w-full h-12 text-center text-2xl font-mono font-bold rounded-xl outline-none transition-all ${
              set.isCompleted ? 'bg-primary/10 text-primary-light' : 'bg-surface focus:ring-2 focus:ring-primary'
            }`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">회</span>
        </div>
        <button
          onClick={() => { commitReps(); onUpdate({ reps: Math.min(999, (set.reps || 0) + 1) }); }}
          className="w-12 h-12 rounded-xl bg-surface text-xl text-text-secondary active:bg-border shrink-0"
        >+</button>
      </div>

      {/* 운동 영역 / 목표 불일치 / 추천 메시지 */}
      {(zone || (suggestion && !set.isCompleted)) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 mb-3 text-[11px]">
          {zone && (
            <span className={`flex items-center gap-1 ${zone.color}`}>
              <span>{zone.icon}</span><span>{zone.label}</span>
              {mismatch && <span className="text-warning ml-1">⚠ {mismatch}</span>}
            </span>
          )}
          {suggestion && !set.isCompleted && (
            <span className="text-primary-light/80">{suggestion.message}</span>
          )}
        </div>
      )}

      {/* 완료 + 삭제 */}
      {!showDeleteConfirm ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { commitWeight(); commitReps(); onComplete(); }}
            className={`flex-1 h-12 rounded-xl font-semibold text-sm transition-all ${
              set.isCompleted
                ? 'bg-gradient-to-br from-success to-green-600 text-white shadow-md shadow-success/30'
                : canComplete
                  ? 'bg-primary text-white active:scale-[0.98]'
                  : 'bg-surface text-text-secondary'
            }`}
          >
            {set.isCompleted ? '완료됨 ✓' : '완료 ✓'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-12 h-12 rounded-xl bg-surface text-text-secondary/50 active:text-danger text-lg shrink-0"
          >✕</button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-1 py-1">
          <span className="text-xs text-danger flex-1">이 세트를 삭제할까요?</span>
          <button onClick={() => setShowDeleteConfirm(false)} className="text-xs px-3 h-9 bg-surface rounded-lg">취소</button>
          <button onClick={() => { onRemove(); setShowDeleteConfirm(false); }} className="text-xs px-3 h-9 bg-danger text-white rounded-lg">삭제</button>
        </div>
      )}
    </div>
  );
}
