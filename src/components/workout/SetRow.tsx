import type { WorkoutSet, TrainingGoal, Condition } from '../../types';
import { getTrainingZone, checkGoalMismatch, suggestForSet } from '../../hooks/useTrainingGuide';

interface Props {
  set: WorkoutSet;
  setIndex: number;
  currentSets: WorkoutSet[];
  previousSessionSets?: WorkoutSet[];
  estimated1RM?: number;
  trainingGoal?: TrainingGoal;
  condition?: Condition;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onComplete: () => void;
  onRemove: () => void;
}

export default function SetRow({
  set, setIndex, currentSets, previousSessionSets,
  estimated1RM, trainingGoal, condition,
  onUpdate, onComplete, onRemove,
}: Props) {
  const zone = set.isCompleted && estimated1RM
    ? getTrainingZone(set.weight, set.reps, estimated1RM)
    : null;

  const mismatch = zone && trainingGoal ? checkGoalMismatch(trainingGoal, zone) : null;

  // 무게 추천 on/off 설정
  const weightSuggestionEnabled = localStorage.getItem('weightSuggestion') !== 'off';

  // 새 추천 시스템
  const suggestion = weightSuggestionEnabled && !set.isCompleted && trainingGoal
    ? suggestForSet({
        goal: trainingGoal,
        setIndex,
        currentSets,
        previousSessionSets,
        estimated1RM,
        condition,
      })
    : null;

  const hasSuggestion = suggestion && suggestion.weight > 0;
  const previousSet = previousSessionSets?.[setIndex];

  return (
    <div className="mb-1">
      <div className={`flex items-center gap-2 py-2.5 px-3 rounded-xl transition-all duration-200 ${
        set.isCompleted
          ? 'bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20'
          : 'hover:bg-surface-light/50'
      }`}>
        {/* 세트 번호 */}
        <span className={`text-sm w-7 text-center font-mono font-bold ${
          set.isCompleted ? 'text-primary-light' : 'text-text-secondary'
        }`}>
          {set.setNumber}
        </span>

        {/* 이전 기록 */}
        <div className="w-[72px] text-xs text-text-secondary text-center font-mono">
          {previousSet ? `${previousSet.weight}×${previousSet.reps}` : '-'}
        </div>

        {/* 무게 입력 */}
        <div className="relative w-[68px]">
          <input
            type="number"
            value={set.weight || ''}
            onChange={(e) => onUpdate({ weight: Math.max(0, Number(e.target.value)) })}
            min="0"
            max="999"
            placeholder={hasSuggestion ? `${suggestion.weight}` : '0'}
            className={`w-full rounded-lg px-2 py-2 text-center text-sm font-mono font-semibold outline-none transition-all ${
              set.isCompleted
                ? 'bg-primary/10 text-primary-light'
                : 'bg-surface-light focus:ring-2 focus:ring-primary focus:bg-surface'
            }`}
          />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-text-secondary">kg</span>
        </div>

        {/* 횟수 입력 */}
        <div className="relative w-[56px]">
          <input
            type="number"
            value={set.reps || ''}
            onChange={(e) => onUpdate({ reps: Math.max(0, Math.floor(Number(e.target.value))) })}
            min="0"
            max="999"
            placeholder={hasSuggestion ? `${suggestion.reps}` : '0'}
            className={`w-full rounded-lg px-2 py-2 text-center text-sm font-mono font-semibold outline-none transition-all ${
              set.isCompleted
                ? 'bg-primary/10 text-primary-light'
                : 'bg-surface-light focus:ring-2 focus:ring-primary focus:bg-surface'
            }`}
          />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-text-secondary">회</span>
        </div>

        {/* 완료 체크 */}
        <button
          onClick={onComplete}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${
            set.isCompleted
              ? 'bg-gradient-to-br from-success to-green-600 text-white shadow-md shadow-success/30 scale-105'
              : 'bg-surface-light text-text-secondary hover:bg-border active:scale-95'
          }`}
        >
          ✓
        </button>

        {/* 삭제 */}
        <button
          onClick={onRemove}
          className="text-text-secondary/50 text-xs hover:text-danger transition-colors w-5 text-center"
        >
          ✕
        </button>
      </div>

      {/* 운동 영역 표시 (완료 시) */}
      {zone && (
        <div className={`flex items-center gap-1 px-4 py-1 text-xs ${zone.color}`}>
          <span>{zone.icon}</span>
          <span>{zone.label}</span>
          {mismatch && <span className="text-warning ml-1">⚠ {mismatch}</span>}
        </div>
      )}

      {/* 무게 추천 (미완료 시, 항상 표시) */}
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
    </div>
  );
}
