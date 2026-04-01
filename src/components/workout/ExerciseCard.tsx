import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { usePreviousRecord } from '../../hooks/usePreviousRecord';
import SetRow from './SetRow';
import type { WorkoutExercise, WorkoutSet, TrainingGoal, MuscleGroup } from '../../types';

const muscleColors: Record<MuscleGroup, string> = {
  '가슴': 'from-red-500/20 to-red-500/5 border-red-500/20',
  '등': 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
  '어깨': 'from-orange-500/20 to-orange-500/5 border-orange-500/20',
  '이두': 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
  '삼두': 'from-pink-500/20 to-pink-500/5 border-pink-500/20',
  '하체': 'from-green-500/20 to-green-500/5 border-green-500/20',
  '코어': 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20',
};

const muscleDots: Record<MuscleGroup, string> = {
  '가슴': 'bg-red-400',
  '등': 'bg-blue-400',
  '어깨': 'bg-orange-400',
  '이두': 'bg-purple-400',
  '삼두': 'bg-pink-400',
  '하체': 'bg-green-400',
  '코어': 'bg-cyan-400',
};

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

  const completedSets = exercise.sets.filter((s) => s.isCompleted).length;
  const totalSets = exercise.sets.length;
  const colorClass = muscleColors[exerciseInfo.muscleGroup] || 'from-surface to-surface-light border-border';
  const dotClass = muscleDots[exerciseInfo.muscleGroup] || 'bg-text-secondary';

  return (
    <div className={`bg-gradient-to-br ${colorClass} border rounded-2xl p-4 mb-3 shadow-sm`}>
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${dotClass}`} />
            <h3 className="font-bold">{exerciseInfo.name}</h3>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-4">
            <span className="text-xs text-text-secondary">{exerciseInfo.muscleGroup} · {exerciseInfo.equipmentType}</span>
            {estimated1RM && (
              <span className="text-xs text-primary-light font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                1RM {Math.round(estimated1RM)}kg
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-mono">{completedSets}/{totalSets}</span>
          <button onClick={onRemoveExercise} className="text-text-secondary/50 hover:text-danger text-sm transition-colors">
            ✕
          </button>
        </div>
      </div>

      {/* 헤더 라벨 */}
      <div className="flex items-center gap-2 px-3 mb-1.5 text-[10px] text-text-secondary uppercase tracking-wider font-medium">
        <span className="w-7 text-center">세트</span>
        <span className="w-[72px] text-center">이전</span>
        <span className="w-[68px] text-center">무게</span>
        <span className="w-[56px] text-center">횟수</span>
        <span className="w-9"></span>
        <span className="w-5"></span>
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
        className="w-full mt-2 py-2.5 text-sm text-primary-light hover:bg-primary/10 rounded-xl transition-colors font-medium"
      >
        + 세트 추가
      </button>
    </div>
  );
}
