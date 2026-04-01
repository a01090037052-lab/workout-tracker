import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export default function HomePage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  const todaySession = useLiveQuery(
    () => db.sessions.where('date').equals(today).first()
  );

  const recentSessions = useLiveQuery(
    () => db.sessions.orderBy('date').reverse().limit(5).toArray()
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">운동 기록</h1>

      {/* 빠른 시작 */}
      <button
        onClick={() => navigate('/workout')}
        className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-4 rounded-xl text-lg transition-colors mb-6"
      >
        운동 시작하기
      </button>

      {/* 오늘의 운동 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">오늘의 운동</h2>
        {todaySession ? (
          <div className="bg-surface rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-text-secondary text-sm">
                {Math.floor(todaySession.duration / 60)}분 운동
              </span>
              <span className="text-primary-light text-sm font-medium">
                {todaySession.exercises.length}개 종목
              </span>
            </div>
            <div className="text-sm text-text-secondary">
              총 {todaySession.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.isCompleted).length, 0)}세트 완료
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-xl p-6 text-center text-text-secondary">
            아직 오늘 운동 기록이 없어요
          </div>
        )}
      </section>

      {/* 최근 기록 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">최근 기록</h2>
        {recentSessions && recentSessions.length > 0 ? (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div key={session.id} className="bg-surface rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{session.date}</span>
                  <span className="text-text-secondary text-sm">
                    {session.exercises.length}개 종목 · {Math.floor(session.duration / 60)}분
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded-xl p-6 text-center text-text-secondary">
            기록이 없어요. 첫 운동을 시작해보세요!
          </div>
        )}
      </section>
    </div>
  );
}
