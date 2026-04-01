import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkout } from '../hooks/useWorkout';
import ExerciseCard from '../components/workout/ExerciseCard';
import ExercisePicker from '../components/workout/ExercisePicker';
import RestTimer from '../components/timer/RestTimer';
import PRNotification from '../components/workout/PRNotification';
import GoalSelector from '../components/workout/GoalSelector';
import ConditionSelector from '../components/workout/ConditionSelector';
import PlateCalculator from '../components/workout/PlateCalculator';
import InjuryLogger from '../components/workout/InjuryLogger';
import { getRecommendedRestTime } from '../hooks/useTrainingGuide';

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WorkoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const workout = useWorkout();
  const [showPicker, setShowPicker] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [showInjuryLog, setShowInjuryLog] = useState(false);
  const [toast, setToast] = useState('');

  // 루틴으로 운동 시작
  useEffect(() => {
    const state = location.state as { routineId?: number; exercises?: { exerciseId: number; sets: number; order: number }[] } | null;
    if (state?.exercises && !workout.isActive) {
      workout.startWorkout();
      // 루틴의 세트 수를 반영하여 운동 추가
      const sorted = [...state.exercises].sort((a, b) => a.order - b.order);
      setTimeout(() => {
        for (const ex of sorted) {
          workout.addExercise(ex.exerciseId, ex.sets);
        }
      }, 0);
      navigate('/workout', { replace: true, state: null });
    }
  }, [location.state]);

  // 운동 시작 전 화면
  if (!workout.isActive) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">운동 시작</h1>
        <button
          onClick={workout.startWorkout}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-4 rounded-xl text-lg transition-colors mb-3"
        >
          새 운동 시작
        </button>
        <button
          onClick={() => navigate('/routines')}
          className="w-full bg-surface hover:bg-surface-light text-text font-semibold py-4 rounded-xl text-lg transition-colors mb-3"
        >
          루틴으로 시작
        </button>
        <button
          onClick={() => navigate('/programs')}
          className="w-full bg-surface hover:bg-surface-light text-text-secondary font-semibold py-4 rounded-xl text-lg transition-colors"
        >
          프로그램 보기
        </button>
      </div>
    );
  }

  const totalSets = workout.exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0);
  const totalVolume = workout.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).reduce((sum, s) => sum + s.weight * s.reps, 0),
    0
  );

  return (
    <div className="p-4">
      {/* 상단 운동 정보 */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-2xl font-bold font-mono">{formatTime(workout.duration)}</div>
          <div className="text-xs text-text-secondary mt-1">
            {totalSets}세트 · {totalVolume.toLocaleString()}kg
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="px-3 py-2 text-sm text-danger bg-danger/10 rounded-lg"
          >
            취소
          </button>
          <button
            onClick={() => setShowFinishConfirm(true)}
            className="px-3 py-2 text-sm text-white bg-success rounded-lg"
          >
            완료
          </button>
        </div>
      </div>

      {/* 컨디션 & 운동 목적 */}
      <ConditionSelector selected={workout.condition} onChange={workout.setCondition} />
      <GoalSelector selected={workout.trainingGoal} onChange={workout.setTrainingGoal} />

      {/* 도구 버튼 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowPlateCalc(true)}
          className="flex-1 py-2 bg-surface rounded-lg text-sm text-text-secondary hover:text-primary transition-colors"
        >
          🔢 플레이트 계산
        </button>
        <button
          onClick={() => setShowInjuryLog(true)}
          className="flex-1 py-2 bg-surface rounded-lg text-sm text-text-secondary hover:text-danger transition-colors"
        >
          🩹 통증 기록
        </button>
      </div>

      {/* 운동 목록 */}
      {workout.exercises.map((ex) => (
        <ExerciseCard
          key={ex.exerciseId}
          exercise={ex}
          trainingGoal={workout.trainingGoal}
          condition={workout.condition}
          onAddSet={() => workout.addSet(ex.exerciseId)}
          onRemoveSet={(i) => workout.removeSet(ex.exerciseId, i)}
          onUpdateSet={(i, updates) => workout.updateSet(ex.exerciseId, i, updates)}
          onCompleteSet={(i) => workout.completeSet(ex.exerciseId, i)}
          onRemoveExercise={() => workout.removeExercise(ex.exerciseId)}
          onSetCompleted={() => setShowRestTimer(true)}
        />
      ))}

      {/* 운동 추가 버튼 */}
      <button
        onClick={() => setShowPicker(true)}
        className="w-full py-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:border-primary hover:text-primary transition-colors"
      >
        + 운동 추가
      </button>

      {/* PR 알림 */}
      {workout.prAlert && (
        <PRNotification
          exerciseName={workout.prAlert.exerciseName}
          weight={workout.prAlert.weight}
          reps={workout.prAlert.reps}
          estimated1RM={workout.prAlert.estimated1RM}
          onClose={() => workout.setPRAlert(null)}
        />
      )}

      {/* 휴식 타이머 */}
      {showRestTimer && (
        <RestTimer
          defaultTime={getRecommendedRestTime(workout.trainingGoal)}
          onClose={() => setShowRestTimer(false)}
        />
      )}

      {/* 플레이트 계산기 */}
      {showPlateCalc && <PlateCalculator onClose={() => setShowPlateCalc(false)} />}

      {/* 부상 기록 */}
      {showInjuryLog && <InjuryLogger onClose={() => setShowInjuryLog(false)} />}

      {/* 운동 선택 모달 */}
      {showPicker && (
        <ExercisePicker
          onSelect={workout.addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* 완료 확인 */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-[350px]">
            <h3 className="text-lg font-bold mb-2">운동 완료</h3>
            <p className="text-text-secondary text-sm mb-4">
              {formatTime(workout.duration)} 동안 {totalSets}세트를 완료했어요. 저장할까요?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 py-2.5 bg-surface-light rounded-lg text-sm"
              >
                계속 운동
              </button>
              <button
                onClick={async () => {
                  const id = await workout.finishWorkout();
                  if (id) {
                    navigate('/');
                  } else {
                    setShowFinishConfirm(false);
                    setToast('완료된 세트가 없어요. 무게와 횟수를 입력하고 체크해주세요.');
                    setTimeout(() => setToast(''), 3000);
                  }
                }}
                className="flex-1 py-2.5 bg-success text-white rounded-lg text-sm font-semibold"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 취소 확인 */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-[350px]">
            <h3 className="text-lg font-bold mb-2">운동 취소</h3>
            <p className="text-text-secondary text-sm mb-4">
              기록이 저장되지 않아요. 정말 취소할까요?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 bg-surface-light rounded-lg text-sm"
              >
                돌아가기
              </button>
              <button
                onClick={() => {
                  workout.cancelWorkout();
                  setShowCancelConfirm(false);
                }}
                className="flex-1 py-2.5 bg-danger text-white rounded-lg text-sm font-semibold"
              >
                취소하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-surface-light px-4 py-2 rounded-lg text-sm shadow-lg z-[60] max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
