import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkoutContext } from '../../hooks/WorkoutContext';

const tabs = [
  { path: '/', label: '홈', icon: '🏠' },
  { path: '/workout', label: '운동', icon: '💪' },
  { path: '/history', label: '기록', icon: '📋' },
  { path: '/stats', label: '통계', icon: '📊' },
  { path: '/settings', label: '설정', icon: '⚙️' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isActive: workoutIsActive } = useWorkoutContext();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/80 backdrop-blur-xl border-t border-border/50">
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-primary-light scale-105'
                  : 'text-text-secondary active:scale-95'
              }`}
            >
              <span className="relative">
                <span className={`text-xl transition-transform ${workoutIsActive && tab.path === '/workout' ? 'scale-110' : ''}`}>{tab.icon}</span>
                {workoutIsActive && tab.path === '/workout' && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success rounded-full animate-pulse" />
                )}
              </span>
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary-light' : ''}`}>{tab.label}</span>
              {isActive && (
                <div className="w-4 h-0.5 bg-primary-light rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
