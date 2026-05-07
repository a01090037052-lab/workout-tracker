import { useRef, useState } from 'react';
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
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onComplete: () => void;
  onRemove: () => void;
}

export default function SetRow({
  set, setIndex, currentSets, previousSessionSets,
  estimated1RM, trainingGoal, condition, isBodyweight, equipmentType, isCompound,
  onUpdate, onComplete, onRemove,
}: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const repsInputRef = useRef<HTMLInputElement>(null);

  const handleWeightEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    repsInputRef.current?.focus();
  };

  const handleRepsEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.currentTarget.blur();
    if (set.isCompleted) return;
    const canComplete = isBodyweight ? set.reps > 0 : (set.weight > 0 && set.reps > 0);
    if (canComplete) onComplete();
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

  // 장비 + 복합/고립별 -/+ 증감 단위 (무게 추천 로직과 동일)
  const incFromGuide = getIncrement(equipmentType, isCompound);
  const weightStep = incFromGuide > 0 ? incFromGuide : 1;

  // placeholder 우선순위: 추천 > 이전 기록 > 0
  const weightPlaceholder = hasSuggestion
    ? `${suggestion!.weight}`
    : previousSet?.weight
      ? `${previousSet.weight}`
      : '0';
  const repsPlaceholder = hasSuggestion
    ? `${suggestion!.reps}`
    : previousSet?.reps
      ? `${previousSet.reps}`
      : '0';

  return (
    <div className="mb-1.5">
      <div className={`flex items-center gap-1.5 py-3 px-3 rounded-xl transition-all duration-200 ${
        set.isCompleted
          ? 'bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20'
          : 'hover:bg-surface-light/50'
      }`}>
        {/* 세트 번호 + 타입 (탭: 타입 전환) */}
        <button
          onClick={() => {
            const types: ('normal' | 'warmup' | 'dropset')[] = ['normal', 'warmup', 'dropset'];
            const idx = types.indexOf(set.setType || 'normal');
            onUpdate({ setType: types[(idx + 1) % types.length] });
          }}
          className={`text-[10px] w-8 text-center font-mono font-bold rounded py-1 ${
            set.setType === 'warmup' ? 'bg-yellow-500/20 text-yellow-400'
            : set.setType === 'dropset' ? 'bg-purple-500/20 text-purple-400'
            : set.isCompleted ? 'text-primary-light' : 'text-text-secondary'
          }`}
        >
          {set.setType === 'warmup' ? 'W' : set.setType === 'dropset' ? 'D' : set.setNumber}
        </button>

        {/* 무게 입력 (맨몸이 아닐 때) / 추가 무게 (맨몸일 때) */}
        {!isBodyweight ? (
          <div className="flex-1 min-w-[80px]">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onUpdate({ weight: Math.max(0, (set.weight || 0) - weightStep) })}
                className="w-8 h-11 rounded-l-xl bg-surface-light text-text-secondary text-sm active:bg-border"
              >−</button>
              <div className="relative flex-1">
                <input
                  type="number"
                  inputMode="decimal"
                  enterKeyHint="next"
                  value={set.weight || ''}
                  onChange={(e) => onUpdate({ weight: Math.max(0, Number(e.target.value)) })}
                  onKeyDown={handleWeightEnter}
                  min="0" max="999"
                  placeholder={weightPlaceholder}
                  className={`w-full h-11 text-center text-base font-mono font-semibold outline-none transition-all ${
                    set.isCompleted ? 'bg-primary/10 text-primary-light' : 'bg-surface-light focus:ring-2 focus:ring-primary focus:bg-surface'
                  }`}
                />
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-text-secondary">kg</span>
              </div>
              <button
                onClick={() => onUpdate({ weight: Math.min(999, (set.weight || 0) + weightStep) })}
                className="w-8 h-11 rounded-r-xl bg-surface-light text-text-secondary text-sm active:bg-border"
              >+</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-[60px]">
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                enterKeyHint="next"
                value={set.weight || ''}
                onChange={(e) => onUpdate({ weight: Math.max(0, Number(e.target.value)) })}
                onKeyDown={handleWeightEnter}
                min="0" max="999"
                placeholder={weightPlaceholder}
                className={`w-full rounded-xl h-11 text-center text-sm font-mono outline-none transition-all ${
                  set.isCompleted ? 'bg-primary/10 text-primary-light' : 'bg-surface-light focus:ring-2 focus:ring-primary focus:bg-surface'
                }`}
              />
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-text-secondary">+kg</span>
            </div>
          </div>
        )}

        {/* 횟수 입력 */}
        <div className="relative flex-1 min-w-[70px]">
          <input
            ref={repsInputRef}
            type="number"
            inputMode="numeric"
            enterKeyHint="done"
            value={set.reps || ''}
            onChange={(e) => onUpdate({ reps: Math.max(0, Math.floor(Number(e.target.value))) })}
            onKeyDown={handleRepsEnter}
            min="0"
            max="999"
            placeholder={repsPlaceholder}
            className={`w-full rounded-xl px-3 h-11 text-center text-base font-mono font-semibold outline-none transition-all ${
              set.isCompleted
                ? 'bg-primary/10 text-primary-light'
                : 'bg-surface-light focus:ring-2 focus:ring-primary focus:bg-surface'
            }`}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary">회</span>
        </div>

        {/* 완료 체크 - 44px 터치 타겟 */}
        <button
          onClick={onComplete}
          className={`w-11 h-11 rounded-full flex items-center justify-center text-base transition-all duration-200 shrink-0 ${
            set.isCompleted
              ? 'bg-gradient-to-br from-success to-green-600 text-white shadow-md shadow-success/30 scale-105'
              : 'bg-surface-light text-text-secondary hover:bg-border active:scale-95'
          }`}
        >
          ✓
        </button>

        {/* 삭제 버튼 */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-5 h-11 flex items-center justify-center text-text-secondary/30 hover:text-danger text-xs shrink-0"
        >
          ✕
        </button>
      </div>

      {/* 이전 기록 + 운동 영역 표시 */}
      {(previousSet || zone) && (
        <div className="flex items-center gap-2 px-4 py-1 text-[10px]">
          {previousSet && (
            <span className="text-text-secondary/60 font-mono">
              지난번 {isBodyweight ? `${previousSet.reps}회` : `${previousSet.weight}×${previousSet.reps}`}
            </span>
          )}
          {zone && (
            <span className={`flex items-center gap-1 ${zone.color}`}>
              <span>{zone.icon}</span>
              <span>{zone.label}</span>
              {mismatch && <span className="text-warning ml-1">⚠ {mismatch}</span>}
            </span>
          )}
        </div>
      )}

      {/* 무게 추천 (미완료 시) */}
      {suggestion && !set.isCompleted && (
        <div className="flex items-center gap-2 px-4 py-1">
          <span className="text-xs text-primary-light/80 flex-1">{suggestion.message}</span>
          {hasSuggestion && !set.weight && (
            <button
              onClick={() => onUpdate({ weight: suggestion.weight, reps: suggestion.reps })}
              className="text-[10px] px-2.5 py-1 bg-primary/20 text-primary-light rounded-full font-medium whitespace-nowrap"
            >
              적용
            </button>
          )}
        </div>
      )}

      {/* 삭제 확인 */}
      {showDeleteConfirm && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-danger/10 rounded-lg mx-1 mt-1">
          <span className="text-xs text-danger flex-1">이 세트를 삭제할까요?</span>
          <button onClick={() => setShowDeleteConfirm(false)} className="text-xs px-2 py-1 bg-surface-light rounded">취소</button>
          <button onClick={() => { onRemove(); setShowDeleteConfirm(false); }} className="text-xs px-2 py-1 bg-danger text-white rounded">삭제</button>
        </div>
      )}
    </div>
  );
}
