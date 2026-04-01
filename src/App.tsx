import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { seedExercises } from './db/seed';
import BottomNav from './components/common/BottomNav';
import HomePage from './pages/HomePage';
import WorkoutPage from './pages/WorkoutPage';
import HistoryPage from './pages/HistoryPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import RoutinePage from './pages/RoutinePage';
import ProgramPage from './pages/ProgramPage';

function App() {
  useEffect(() => {
    seedExercises();
  }, []);

  return (
    <HashRouter>
      <div className="flex flex-col min-h-[100dvh]">
        <main className="flex-1 pb-16 overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/workout" element={<WorkoutPage />} />
            <Route path="/routines" element={<RoutinePage />} />
            <Route path="/programs" element={<ProgramPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </HashRouter>
  );
}

export default App;
