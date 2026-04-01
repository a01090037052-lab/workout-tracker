import type { WorkoutSet, TrainingGoal } from '../../types';
import { getTrainingZone, checkGoalMismatch, suggestNextWeight } from '../../hooks/useTrainingGuide';

interface Props {
  set: WorkoutSet;
  previousSet?: WorkoutSet;
  estimated1RM?: number;
  trainingGoal?: TrainingGoal;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onComplete: () => void;
  onRemove: () => void;
}

export default function SetRow({ set, previousSet, estimated1RM, trainingGoal, onUpdate, onComplete, onRemove }: Props) {
  const zone = set.isCompleted && estimated1RM
    ? getTrainingZone(set.weight, set.reps, estimated1RM)
    : null;

  const mismatch = zone && trainingGoal ? checkGoalMismatch(trainingGoal, zone) : null;

  const suggestion = !set.isCompleted && estimated1RM && trainingGoal && previousSet
    ? suggestNextWeight(trainingGoal, previousSet.weight, previousSet.reps, estimated1RM)
    : null;

  return (
    <div>
      <div className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${set.isCompleted ? 'bg-primary/10' : ''}`}>
        {/* 세트 번호 */}
        <span className="text-sm text-text-secondary w-8 text-center">{set.setNumber}</span>

        {/* 이전 기록 */}
        <div className="w-20 text-xs text-text-secondary text-center">
          {previousSet ? `${previousSet.weight}kg×${previousSet.reps}` : '-'}
        </div>

        {/* 무게 입력 */}
        <input
          type="number"
          value={set.weight || ''}
          onChange={(e) => onUpdate({ weight: Number(e.target.value) })}
          placeholder={suggestion ? `${suggestion.weight}` : 'kg'}
          className="w-16 bg-surface-light rounded px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-primary"
        />

        {/* 횟수 입력 */}
        <input
          type="number"
          value={set.reps || ''}
          onChange={(e) => onUpdate({ reps: Number(e.target.value) })}
          placeholder={suggestion ? `${suggestion.reps}` : '회'}
          className="w-14 bg-surface-light rounded px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-primary"
        />

        {/* 완료 체크 */}
        <button
          onClick={onComplete}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
            set.isCompleted
              ? 'bg-success text-white'
              : 'bg-surface-light text-text-secondary'
          }`}
        >
          ✓
        </button>

        {/* 삭제 */}
        <button
          onClick={onRemove}
          className="text-text-secondary text-xs hover:text-danger transition-colors"
        >
          ✕
        </button>
      </div>

      {/* 운동 영역 표시 (완료 시) */}
      {zone && (
        <div className={`flex items-center gap-1 px-3 pb-1 text-xs ${zone.color}`}>
          <span>{zone.icon}</span>
          <span>{zone.label}</span>
          {mismatch && <span className="text-warning ml-1">⚠ {mismatch}</span>}
        </div>
      )}

      {/* 무게 추천 (미완료 시) */}
      {suggestion && !set.isCompleted && !set.weight && (
        <div className="flex items-center gap-2 px-3 pb-1">
          <span className="text-xs text-primary-light">{suggestion.message}</span>
          <button
            onClick={() => onUpdate({ weight: suggestion.weight, reps: suggestion.reps })}
            className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary-light rounded"
          >
            적용
          </button>
        </div>
      )}
    </div>
  );
}
