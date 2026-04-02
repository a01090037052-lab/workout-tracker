import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { usePreviousRecord } from '../../hooks/usePreviousRecord';
import { getProgressionMessage } from '../../hooks/useTrainingGuide';
import { useSmartInsight } from '../../hooks/useSmartInsight';
import SetRow from './SetRow';
import WarmupGuide from './WarmupGuide';
import type { WorkoutExercise, WorkoutSet, TrainingGoal, Condition, MuscleGroup } from '../../types';

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
  '가슴': 'bg-red-400', '등': 'bg-blue-400', '어깨': 'bg-orange-400',
  '이두': 'bg-purple-400', '삼두': 'bg-pink-400', '하체': 'bg-green-400', '코어': 'bg-cyan-400',
};

interface Props {
  exercise: WorkoutExercise;
  exerciseIndex: number;
  totalExercises: number;
  trainingGoal: TrainingGoal;
  condition: Condition;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onUpdateSet: (setIndex: number, updates: Partial<WorkoutSet>) => void;
  onCompleteSet: (setIndex: number) => void;
  onRemoveExercise: () => void;
  onMoveExercise: (direction: 'up' | 'down') => void;
  onSetCompleted?: () => void;
  onAddWarmupSets?: (sets: { weight: number; reps: number }[]) => void;
}

export default function ExerciseCard({
  exercise, exerciseIndex, totalExercises,
  trainingGoal, condition,
  onAddSet, onRemoveSet, onUpdateSet, onCompleteSet,
  onRemoveExercise, onMoveExercise, onSetCompleted, onAddWarmupSets,
}: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showWarmup, setShowWarmup] = useState(false);

  const exerciseInfo = useLiveQuery(() => db.exercises.get(exercise.exerciseId), [exercise.exerciseId]);
  const previousSets = usePreviousRecord(exercise.exerciseId);
  const currentPR = useLiveQuery(async () => {
    const prs = await db.personalRecords.where('exerciseId').equals(exercise.exerciseId).sortBy('estimated1RM');
    return prs[prs.length - 1];
  }, [exercise.exerciseId]);
  const estimated1RM = currentPR?.estimated1RM;
  const insight = useSmartInsight(exercise.exerciseId);

  const handleComplete = (setIndex: number) => {
    const set = exercise.sets[setIndex];
    if (!set.isCompleted && set.weight > 0 && set.reps > 0) onSetCompleted?.();
    onCompleteSet(setIndex);
  };

  if (!exerciseInfo) return null;

  const completedSets = exercise.sets.filter((s) => s.isCompleted).length;
  const totalSets = exercise.sets.length;
  const colorClass = muscleColors[exerciseInfo.muscleGroup] || 'from-surface to-surface-light border-border';
  const dotClass = muscleDots[exerciseInfo.muscleGroup] || 'bg-text-secondary';

  // 워밍업 제안 조건: 바벨 운동이고, 첫 세트에 무게가 입력된 경우
  const firstSetWeight = exercise.sets[0]?.weight || 0;
  const isBarbell = exerciseInfo.equipmentType === '바벨';
  const canSuggestWarmup = isBarbell && firstSetWeight >= 40 && !exercise.sets.some(s => s.setType === 'warmup');

  return (
    <div className={`bg-gradient-to-br ${colorClass} border rounded-2xl p-4 mb-3 shadow-sm`}>
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
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
        <div className="flex items-center gap-1">
          {/* 순서 변경 */}
          <button
            onClick={() => onMoveExercise('up')}
            disabled={exerciseIndex === 0}
            className="w-8 h-8 flex items-center justify-center text-text-secondary disabled:opacity-20 active:scale-90"
          >▲</button>
          <button
            onClick={() => onMoveExercise('down')}
            disabled={exerciseIndex === totalExercises - 1}
            className="w-8 h-8 flex items-center justify-center text-text-secondary disabled:opacity-20 active:scale-90"
          >▼</button>
          <span className="text-xs text-text-secondary font-mono mx-1">{completedSets}/{totalSets}</span>
        </div>
      </div>

      {/* 스마트 인사이트 */}
      {insight && (
        <div className={`mx-1 mb-2 px-3 py-2 bg-surface-light/50 rounded-lg text-xs ${insight.color} flex items-start gap-1.5`}>
          <span>{insight.icon}</span>
          <span>{insight.message}</span>
        </div>
      )}

      {/* 워밍업 가이드 */}
      {canSuggestWarmup && !showWarmup && (
        <button
          onClick={() => setShowWarmup(true)}
          className="w-full mb-2 py-2 text-xs text-primary-light/70 hover:bg-primary/10 rounded-lg transition-colors"
        >
          💡 워밍업 추가
        </button>
      )}
      {showWarmup && onAddWarmupSets && (
        <WarmupGuide
          mainWeight={firstSetWeight}
          onApply={(sets) => { onAddWarmupSets(sets); setShowWarmup(false); }}
          onClose={() => setShowWarmup(false)}
        />
      )}

      {/* 헤더 라벨 */}
      <div className="flex items-center gap-2 px-3 mb-1 text-[10px] text-text-secondary uppercase tracking-wider font-medium">
        <span className="w-7 text-center">세트</span>
        <span className="w-16 text-center">이전</span>
        <span className="flex-1 min-w-[80px] text-center">무게</span>
        <span className="flex-1 min-w-[70px] text-center">횟수</span>
        <span className="w-11"></span>
      </div>

      {/* 세트 목록 */}
      {exercise.sets.map((set, i) => (
        <SetRow
          key={i}
          set={set}
          setIndex={i}
          currentSets={exercise.sets}
          previousSessionSets={previousSets}
          estimated1RM={estimated1RM}
          trainingGoal={trainingGoal}
          condition={condition}
          onUpdate={(updates) => onUpdateSet(i, updates)}
          onComplete={() => handleComplete(i)}
          onRemove={() => onRemoveSet(i)}
        />
      ))}

      {/* 증량 메시지 */}
      {(() => {
        const msg = getProgressionMessage(trainingGoal, exercise.sets);
        if (!msg) return null;
        return (
          <div className="mx-3 mt-1 mb-2 px-3 py-2 bg-success/10 border border-success/20 rounded-lg text-xs text-success">
            🎯 {msg}
          </div>
        );
      })()}

      {/* 세트 추가 + 삭제 */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={onAddSet}
          className="flex-1 py-2.5 text-sm text-primary-light hover:bg-primary/10 rounded-xl transition-colors font-medium"
        >
          + 세트 추가
        </button>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="py-2.5 px-3 text-xs text-text-secondary/40 hover:text-danger rounded-xl transition-colors"
          >
            종목 삭제
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={() => setShowDeleteConfirm(false)} className="text-xs px-2 py-1.5 bg-surface-light rounded-lg">취소</button>
            <button onClick={onRemoveExercise} className="text-xs px-2 py-1.5 bg-danger text-white rounded-lg">삭제</button>
          </div>
        )}
      </div>
    </div>
  );
}
