import { useEffect, useState } from 'react';
import { useWorkoutContext } from './WorkoutContext';

/**
 * 운동 경과 시간(초)을 1초 단위로 반환.
 * 이 훅을 사용하는 컴포넌트만 매초 리렌더되며,
 * WorkoutContext 자체는 startTimeMs/isActive 변경 시에만 리렌더된다.
 */
export function useWorkoutDuration(): number {
  const { isActive, startTimeMs } = useWorkoutContext();

  const [duration, setDuration] = useState(() =>
    isActive && startTimeMs > 0 ? Math.floor((Date.now() - startTimeMs) / 1000) : 0
  );

  useEffect(() => {
    if (!isActive || startTimeMs <= 0) {
      setDuration(0);
      return;
    }
    setDuration(Math.floor((Date.now() - startTimeMs) / 1000));
    const id = window.setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeMs) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isActive, startTimeMs]);

  return duration;
}
