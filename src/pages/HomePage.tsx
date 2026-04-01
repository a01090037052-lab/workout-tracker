import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

function getStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function getWeekDays(): string[] {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function HomePage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  const todaySessions = useLiveQuery(
    () => db.sessions.where('date').equals(today).toArray()
  );

  const allSessions = useLiveQuery(
    () => db.sessions.orderBy('date').reverse().toArray()
  );

  const recentSessions = allSessions?.slice(0, 5);
  const allDates = allSessions?.map((s) => s.date) || [];
  const streak = getStreak(allDates);
  const weekDays = getWeekDays();
  const workoutDatesSet = new Set(allDates);

  const weekCount = weekDays.filter((d) => workoutDatesSet.has(d)).length;

  const todaySession = todaySessions?.[0];
  const todayVolume = todaySession
    ? todaySession.exercises.reduce(
        (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).reduce((sum, s) => sum + s.weight * s.reps, 0), 0)
    : 0;
  const todaySets = todaySession
    ? todaySession.exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0)
    : 0;

  const exerciseNames = useLiveQuery(async () => {
    if (!recentSessions) return new Map();
    const ids = new Set(recentSessions.flatMap((s) => s.exercises.map((e) => e.exerciseId)));
    const exList = await db.exercises.where('id').anyOf([...ids]).toArray();
    return new Map(exList.map((e) => [e.id!, e.name]));
  }, [recentSessions]);

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">운동 기록</h1>
          <p className="text-sm text-text-secondary mt-0.5">{today}</p>
        </div>
        {streak > 0 && (
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl px-3 py-2 text-center">
            <div className="text-xl font-bold text-white leading-none">{streak}</div>
            <div className="text-[10px] text-white/80">일 연속</div>
          </div>
        )}
      </div>

      {/* 이번 주 진행률 */}
      <div className="bg-surface rounded-xl p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold">이번 주</span>
          <span className="text-xs text-text-secondary">{weekCount}/7일</span>
        </div>
        <div className="flex justify-between gap-1">
          {weekDays.map((date, i) => {
            const done = workoutDatesSet.has(date);
            const isToday = date === today;
            return (
              <div key={date} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-[10px] text-text-secondary">{DAY_LABELS[i]}</span>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    done
                      ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/30'
                      : isToday
                        ? 'border-2 border-primary text-primary'
                        : 'bg-surface-light text-text-secondary'
                  }`}
                >
                  {done ? '✓' : Number(date.split('-')[2])}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 빠른 시작 */}
      <button
        onClick={() => navigate('/workout')}
        className="w-full bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold py-4 rounded-xl text-lg transition-all shadow-lg shadow-primary/25 active:scale-[0.98] mb-4"
      >
        운동 시작하기
      </button>

      {/* 오늘의 운동 */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">오늘의 운동</h2>
        {todaySession ? (
          <div className="bg-gradient-to-br from-surface to-surface-light rounded-xl p-4 border border-border">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xl font-bold font-mono">{todaySession.exercises.length}</div>
                <div className="text-[10px] text-text-secondary mt-0.5">종목</div>
              </div>
              <div>
                <div className="text-xl font-bold font-mono">{todaySets}</div>
                <div className="text-[10px] text-text-secondary mt-0.5">세트</div>
              </div>
              <div>
                <div className="text-xl font-bold font-mono">{todayVolume.toLocaleString()}</div>
                <div className="text-[10px] text-text-secondary mt-0.5">볼륨(kg)</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border text-xs text-text-secondary text-center">
              {Math.floor(todaySession.duration / 60)}분 운동 완료
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-xl p-8 text-center border border-border border-dashed">
            <div className="text-3xl mb-2">🏋️</div>
            <p className="text-text-secondary text-sm">아직 오늘 운동을 안 했어요</p>
            <p className="text-text-secondary text-xs mt-1">위 버튼을 눌러 시작해보세요!</p>
          </div>
        )}
      </section>

      {/* 최근 기록 */}
      <section>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">최근 기록</h2>
        {recentSessions && recentSessions.length > 0 ? (
          <div className="space-y-2">
            {recentSessions.map((session) => {
              const volume = session.exercises.reduce(
                (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).reduce((sum, s) => sum + s.weight * s.reps, 0), 0
              );
              const sets = session.exercises.reduce(
                (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0
              );
              const names = session.exercises
                .slice(0, 3)
                .map((e) => exerciseNames?.get(e.exerciseId) || '')
                .filter(Boolean)
                .join(', ');
              const extra = session.exercises.length > 3 ? ` 외 ${session.exercises.length - 3}개` : '';

              return (
                <div
                  key={session.id}
                  className="bg-surface rounded-xl p-4 border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-medium">{session.date}</span>
                    <span className="text-xs text-text-secondary bg-surface-light px-2 py-0.5 rounded-full">
                      {Math.floor(session.duration / 60)}분
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mb-2 truncate">{names}{extra}</p>
                  <div className="flex gap-4 text-xs">
                    <span className="text-text-secondary">{session.exercises.length}종목</span>
                    <span className="text-text-secondary">{sets}세트</span>
                    <span className="text-primary-light font-medium">{volume.toLocaleString()}kg</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface rounded-xl p-8 text-center border border-border border-dashed">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-text-secondary text-sm">기록이 없어요</p>
            <p className="text-text-secondary text-xs mt-1">첫 운동을 시작해보세요!</p>
          </div>
        )}
      </section>
    </div>
  );
}
