import { useSyncExternalStore } from 'react';
import { useWorkoutContext } from './WorkoutContext';

// 외부 시계 store: 1초마다 구독자에게 변경 알림
function subscribe(callback: () => void) {
  const id = window.setInterval(callback, 1000);
  return () => window.clearInterval(id);
}
function getSnapshot() {
  return Date.now();
}

/**
 * 운동 경과 시간(초)을 1초 단위로 반환.
 * 이 훅을 사용하는 컴포넌트만 매초 리렌더되며,
 * WorkoutContext 자체는 startTimeMs/isActive 변경 시에만 리렌더된다.
 *
 * useSyncExternalStore를 사용해 React 19의 set-state-in-effect 안티패턴 회피.
 */
export function useWorkoutDuration(): number {
  const { isActive, startTimeMs } = useWorkoutContext();
  const now = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (!isActive || startTimeMs <= 0) return 0;
  return Math.floor((now - startTimeMs) / 1000);
}
