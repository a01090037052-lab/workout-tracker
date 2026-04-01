import { useLocation, useNavigate } from 'react-router-dom';

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

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface border-t border-border">
      <div className="flex justify-around items-center h-14">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 text-xs transition-colors ${
                isActive ? 'text-primary-light' : 'text-text-secondary'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
