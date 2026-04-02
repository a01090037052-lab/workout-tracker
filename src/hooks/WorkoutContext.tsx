import { createContext, useContext, type ReactNode } from 'react';
import { useWorkout } from './useWorkout';

type WorkoutContextType = ReturnType<typeof useWorkout>;

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const workout = useWorkout();
  return (
    <WorkoutContext.Provider value={workout}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkoutContext(): WorkoutContextType {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkoutContext must be used within WorkoutProvider');
  return ctx;
}
