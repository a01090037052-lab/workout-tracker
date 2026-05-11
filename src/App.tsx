import { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { seedExercises, seedFoods } from './db/seed';
import { WorkoutProvider } from './hooks/WorkoutContext';
import BottomNav from './components/common/BottomNav';
import HomePage from './pages/HomePage';
import WorkoutPage from './pages/WorkoutPage';

// 자주 안 쓰는 페이지는 lazy load (첫 진입 번들 크기 ↓)
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const RoutinePage = lazy(() => import('./pages/RoutinePage'));
const ProgramPage = lazy(() => import('./pages/ProgramPage'));
const NutritionPage = lazy(() => import('./pages/NutritionPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));

function App() {
  useEffect(() => {
    seedExercises();
    seedFoods();
  }, []);

  return (
    <HashRouter>
      <WorkoutProvider>
        <div className="flex flex-col min-h-[100dvh]">
          <main className="flex-1 pb-16 overflow-y-auto">
            <Suspense fallback={<div className="p-8 text-center text-text-secondary text-sm">로딩 중…</div>}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/workout" element={<WorkoutPage />} />
                <Route path="/routines" element={<RoutinePage />} />
                <Route path="/programs" element={<ProgramPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/nutrition" element={<NutritionPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          <BottomNav />
        </div>
      </WorkoutProvider>
    </HashRouter>
  );
}

export default App;
