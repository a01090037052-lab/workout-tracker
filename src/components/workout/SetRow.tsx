import { useEffect, useRef, useState } from 'react';
import type { WorkoutSet, TrainingGoal, Condition } from '../../types';
import { getTrainingZone, checkGoalMismatch, suggestForSet } from '../../hooks/useTrainingGuide';
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
  /** 현재 편집 중인(활성) 세트인지 — 강조 테두리 + 칩/타입/삭제 보조줄 표시 */
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
  isExpanded: isActive, onActivate, onUpdate, onComplete, onRemove,
}: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const repsInputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  // 입력 중에는 문자열 버퍼를 유지하고, 확정(blur) 시점에만 숫자로 반영.
  // type="number" + Number()는 "62." 상태에서 빈 문자열을 반환해 소수점 입력이 불가능했음.
  const [weightDraft, setWeightDraft] = useState<string | null>(null);
  const [repsDraft, setRepsDraft] = useState<string | null>(null);

  // 완료로 다음 세트가 활성화될 때만 스크롤. 첫 마운트(페이지 진입)에는 스크롤하지 않아
  // 여러 종목이 있을 때 마지막 종목으로 화면이 튀는 것을 방지.
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (isActive) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isActive]);

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

  const canComplete = isBodyweight ? set.reps > 0 : (set.weight > 0 && set.reps > 0);

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
    // canComplete는 렌더 시점 prop(set) 기준이라, 방금 타이핑한 값이 아직 반영 안 됨.
    // 완료 여부는 미확정 draft 값으로 즉석 판단해야 첫 Enter에 바로 완료된다.
    const reps = repsDraft !== null ? Math.floor(Number(repsDraft) || 0) : set.reps;
    const weight = weightDraft !== null ? (Number(weightDraft) || 0) : set.weight;
    const ok = isBodyweight ? reps > 0 : (weight > 0 && reps > 0);
    if (!set.isCompleted && ok) onComplete();
  };

  const handleComplete = () => {
    commitWeight();
    commitReps();
    onComplete();
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

  const weightValue = weightDraft !== null ? weightDraft : (set.weight ? String(set.weight) : '');
  const repsValue = repsDraft !== null ? repsDraft : (set.reps ? String(set.reps) : '');

  const weightPlaceholder = isBodyweight ? '+0'
    : hasSuggestion ? `${suggestion!.weight}`
    : previousSet?.weight ? `${previousSet.weight}` : '0';
  const repsPlaceholder = hasSuggestion ? `${suggestion!.reps}`
    : previousSet?.reps ? `${previousSet.reps}` : '0';

  // 세트 번호 배지 (W/D 타입은 색으로 구분)
  const badgeText = set.setType === 'warmup' ? 'W' : set.setType === 'dropset' ? 'D' : `${set.setNumber}`;
  const badgeClass =
    set.setType === 'warmup' ? 'bg-yellow-500/20 text-yellow-400'
    : set.setType === 'dropset' ? 'bg-purple-500/20 text-purple-400'
    : set.isCompleted ? 'bg-success/20 text-success'
    : isActive ? 'bg-primary/20 text-primary-light'
    : 'bg-surface-light text-text-secondary';

  const inputClass = (active: boolean) =>
    `w-full h-11 text-center text-lg font-mono font-bold rounded-lg outline-none transition-all ${
      set.isCompleted ? 'bg-success/5 text-text'
      : active ? 'bg-surface focus:ring-2 focus:ring-primary'
      : 'bg-surface-light/40'
    }`;

  return (
    <div
      ref={rowRef}
      className={`mb-1.5 rounded-xl transition-colors ${
        isActive ? 'bg-surface-light/60 ring-1 ring-primary/40'
        : set.isCompleted ? 'bg-success/5'
        : 'bg-surface-light/25'
      }`}
    >
      {/* 메인 줄: 번호 · 무게 × 횟수 · 완료 체크 */}
      <div className="flex items-center gap-1.5 p-1.5">
        <button
          onClick={onActivate}
          aria-label={`${set.setNumber}세트`}
          className={`w-7 h-11 shrink-0 flex items-center justify-center text-xs font-mono font-bold rounded-lg ${badgeClass}`}
        >{badgeText}</button>

        <div className="flex-1 min-w-0">
          <input
            type="text" inputMode="decimal" enterKeyHint="next"
            value={weightValue}
            onFocus={(e) => { onActivate?.(); setWeightDraft(set.weight ? String(set.weight) : ''); e.target.select(); }}
            onChange={(e) => setWeightDraft(sanitizeDecimal(e.target.value))}
            onBlur={commitWeight}
            onKeyDown={handleWeightEnter}
            placeholder={weightPlaceholder}
            aria-label="무게"
            className={inputClass(isActive ?? false)}
          />
        </div>
        <span className="text-text-secondary text-xs shrink-0">{isBodyweight ? '+kg' : 'kg'}</span>
        <span className="text-text-secondary text-sm shrink-0">×</span>
        <div className="w-[52px] shrink-0">
          <input
            ref={repsInputRef}
            type="text" inputMode="numeric" enterKeyHint="done"
            value={repsValue}
            onFocus={(e) => { onActivate?.(); setRepsDraft(set.reps ? String(set.reps) : ''); e.target.select(); }}
            onChange={(e) => setRepsDraft(sanitizeInt(e.target.value))}
            onBlur={commitReps}
            onKeyDown={handleRepsEnter}
            placeholder={repsPlaceholder}
            aria-label="횟수"
            className={inputClass(isActive ?? false)}
          />
        </div>
        <span className="text-text-secondary text-xs shrink-0">회</span>

        {/* 완료 체크박스 */}
        <button
          onClick={handleComplete}
          aria-label={set.isCompleted ? '완료 취소' : '세트 완료'}
          className={`w-10 h-11 shrink-0 flex items-center justify-center rounded-lg transition-all active:scale-90 ${
            set.isCompleted
              ? 'text-success'
              : canComplete ? 'text-primary-light' : 'text-text-secondary/40'
          }`}
        >
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 ${
            set.isCompleted ? 'bg-success border-success text-white' : 'border-current'
          }`}>✓</span>
        </button>
      </div>

      {/* 활성 세트 보조줄: 추천/지난번 칩 + 타입 + 삭제 */}
      {isActive && !showDeleteConfirm && (
        <div className="px-1.5 pb-2 space-y-1.5">
          {(hasSuggestion || (previousSet && (previousSet.weight > 0 || previousSet.reps > 0))) && (
            <div className="flex items-center gap-1.5">
              {previousSet && (previousSet.weight > 0 || previousSet.reps > 0) && (
                <button
                  onClick={() => onUpdate({ weight: previousSet.weight, reps: previousSet.reps })}
                  className="flex-1 h-8 rounded-lg bg-surface text-[11px] text-text-secondary font-mono active:bg-border"
                >지난번 {isBodyweight ? `${previousSet.reps}회` : `${previousSet.weight}×${previousSet.reps}`}</button>
              )}
              {hasSuggestion && (
                <button
                  onClick={() => onUpdate({ weight: suggestion!.weight, reps: suggestion!.reps })}
                  className="flex-1 h-8 rounded-lg bg-primary/15 text-[11px] text-primary-light font-mono font-semibold active:bg-primary/25"
                >추천 {isBodyweight ? `${suggestion!.reps}회` : `${suggestion!.weight}×${suggestion!.reps}`}</button>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 bg-surface rounded-lg p-0.5">
              {([['warmup', 'W'], ['normal', '일반'], ['dropset', 'D']] as const).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => onUpdate({ setType: type })}
                  className={`px-2 h-7 text-[11px] font-medium rounded-md transition-colors ${
                    (set.setType || 'normal') === type
                      ? type === 'warmup' ? 'bg-yellow-500/20 text-yellow-400'
                        : type === 'dropset' ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-primary/20 text-primary-light'
                      : 'text-text-secondary'
                  }`}
                >{label}</button>
              ))}
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="세트 삭제"
              className="h-7 px-2.5 text-[11px] text-text-secondary active:text-danger active:bg-danger/10 rounded-lg"
            >세트 삭제</button>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {showDeleteConfirm && (
        <div className="flex items-center gap-2 px-2 pb-2">
          <span className="text-xs text-danger flex-1">이 세트를 삭제할까요?</span>
          <button onClick={() => setShowDeleteConfirm(false)} className="text-xs px-3 h-9 bg-surface rounded-lg">취소</button>
          <button onClick={() => { onRemove(); setShowDeleteConfirm(false); }} className="text-xs px-3 h-9 bg-danger text-white rounded-lg">삭제</button>
        </div>
      )}

      {/* 완료된 세트의 운동 영역 / 목표 불일치 */}
      {zone && !isActive && (
        <div className="flex items-center gap-2 px-3 pb-1.5 text-[10px]">
          <span className={`flex items-center gap-1 ${zone.color}`}>
            <span>{zone.icon}</span><span>{zone.label}</span>
          </span>
          {mismatch && <span className="text-warning">⚠ {mismatch}</span>}
        </div>
      )}
    </div>
  );
}
