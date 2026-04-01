import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { usePreviousRecord } from '../../hooks/usePreviousRecord';
import SetRow from './SetRow';
import type { WorkoutExercise, WorkoutSet, TrainingGoal } from '../../types';

interface Props {
  exercise: WorkoutExercise;
  trainingGoal: TrainingGoal;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onUpdateSet: (setIndex: number, updates: Partial<WorkoutSet>) => void;
  onCompleteSet: (setIndex: number) => void;
  onRemoveExercise: () => void;
  onSetCompleted?: () => void;
}

export default function ExerciseCard({
  exercise,
  trainingGoal,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onCompleteSet,
  onRemoveExercise,
  onSetCompleted,
}: Props) {
  const exerciseInfo = useLiveQuery(() => db.exercises.get(exercise.exerciseId), [exercise.exerciseId]);
  const previousSets = usePreviousRecord(exercise.exerciseId);

  // 현재 종목의 PR 1RM 가져오기
  const currentPR = useLiveQuery(async () => {
    const prs = await db.personalRecords
      .where('exerciseId')
      .equals(exercise.exerciseId)
      .sortBy('estimated1RM');
    return prs[prs.length - 1];
  }, [exercise.exerciseId]);

  const estimated1RM = currentPR?.estimated1RM;

  const handleComplete = (setIndex: number) => {
    const set = exercise.sets[setIndex];
    if (!set.isCompleted && set.weight > 0 && set.reps > 0) {
      onSetCompleted?.();
    }
    onCompleteSet(setIndex);
  };

  if (!exerciseInfo) return null;

  return (
    <div className="bg-surface rounded-xl p-4 mb-3">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="font-semibold">{exerciseInfo.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">{exerciseInfo.muscleGroup} · {exerciseInfo.equipmentType}</span>
            {estimated1RM && (
              <span className="text-xs text-primary-light">1RM: {Math.round(estimated1RM)}kg</span>
            )}
          </div>
        </div>
        <button onClick={onRemoveExercise} className="text-text-secondary hover:text-danger text-sm transition-colors">
          삭제
        </button>
      </div>

      {/* 헤더 라벨 */}
      <div className="flex items-center gap-2 px-3 mb-1 text-xs text-text-secondary">
        <span className="w-8 text-center">세트</span>
        <span className="w-20 text-center">이전</span>
        <span className="w-16 text-center">kg</span>
        <span className="w-14 text-center">회</span>
        <span className="w-8"></span>
        <span className="w-4"></span>
      </div>

      {/* 세트 목록 */}
      {exercise.sets.map((set, i) => (
        <SetRow
          key={i}
          set={set}
          previousSet={previousSets?.[i]}
          estimated1RM={estimated1RM}
          trainingGoal={trainingGoal}
          onUpdate={(updates) => onUpdateSet(i, updates)}
          onComplete={() => handleComplete(i)}
          onRemove={() => onRemoveSet(i)}
        />
      ))}

      {/* 세트 추가 */}
      <button
        onClick={onAddSet}
        className="w-full mt-2 py-2 text-sm text-primary-light hover:bg-surface-light rounded-lg transition-colors"
      >
        + 세트 추가
      </button>
    </div>
  );
}
