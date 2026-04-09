import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { parseLocalDate } from '../hooks/useLocalDate';
import MuscleHeatmap from '../components/stats/MuscleHeatmap';
const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function StatsPage() {
  const [tab, setTab] = useState<'exercise' | 'muscle' | 'heatmap' | 'weekly' | 'monthly'>('exercise');
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);

  const exercises = useLiveQuery(() => db.exercises.toArray());
  const sessions = useLiveQuery(() => db.sessions.orderBy('date').toArray());
  const personalRecords = useLiveQuery(() => db.personalRecords.orderBy('date').toArray());

  // 로딩 중 가드
  if (!exercises || !sessions || !personalRecords) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">통계</h1>
        <div className="bg-surface rounded-xl p-8 text-center text-text-secondary">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">통계</h1>

      {/* 탭 (스크롤 가능) */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {([
          { key: 'exercise', label: '📈 종목별' },
          { key: 'muscle', label: '🥧 근육군' },
          { key: 'heatmap', label: '🔥 히트맵' },
          { key: 'weekly', label: '📅 주간' },
          { key: 'monthly', label: '📊 월별' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key ? 'bg-primary text-white shadow-sm' : 'bg-surface text-text-secondary active:scale-95'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'exercise' && (
        <ExerciseStats
          exercises={exercises || []}
          sessions={sessions || []}
          personalRecords={personalRecords || []}
          selectedId={selectedExerciseId}
          onSelectId={setSelectedExerciseId}
        />
      )}
      {tab === 'muscle' && <MuscleStats sessions={sessions || []} exercises={exercises || []} />}
      {tab === 'heatmap' && <HeatmapTab sessions={sessions || []} exercises={exercises || []} />}
      {tab === 'weekly' && <WeeklyStats sessions={sessions || []} exercises={exercises || []} personalRecords={personalRecords || []} />}
      {tab === 'monthly' && <MonthlyStats sessions={sessions || []} exercises={exercises || []} personalRecords={personalRecords || []} />}
    </div>
  );
}

// === 종목별 통계 ===
function ExerciseStats({
  exercises,
  sessions,
  personalRecords,
  selectedId,
  onSelectId,
}: {
  exercises: any[];
  sessions: any[];
  personalRecords: any[];
  selectedId: number | null;
  onSelectId: (id: number) => void;
}) {
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | 'all'>('all');

  const exercisedIds = new Set(sessions.flatMap((s: any) => s.exercises.map((e: any) => e.exerciseId)));
  const availableExercises = exercises.filter((e) => exercisedIds.has(e.id));
  const selected = selectedId || availableExercises[0]?.id;

  // 기간 필터
  const cutoffDate = (() => {
    if (period === 'all') return null;
    const now = new Date();
    const months = period === '1m' ? 1 : period === '3m' ? 3 : 6;
    return new Date(now.getFullYear(), now.getMonth() - months, now.getDate()).toISOString().split('T')[0];
  })();

  const filteredPRs = personalRecords.filter((pr: any) =>
    pr.exerciseId === selected && (!cutoffDate || pr.date >= cutoffDate)
  );
  const rmData = filteredPRs.map((pr: any) => ({ date: pr.date, '1RM': Math.round(pr.estimated1RM) }));

  const filteredSessions = sessions.filter((s: any) =>
    s.exercises.some((e: any) => e.exerciseId === selected) && (!cutoffDate || s.date >= cutoffDate)
  );
  const volumeData = filteredSessions.map((s: any) => {
    const ex = s.exercises.find((e: any) => e.exerciseId === selected);
    const volume = ex?.sets.filter((set: any) => set.isCompleted)
      .reduce((acc: number, set: any) => acc + set.weight * set.reps, 0) || 0;
    return { date: s.date, volume };
  });

  // 성장률 계산
  const allPRsForEx = personalRecords.filter((pr: any) => pr.exerciseId === selected);
  const first1RM = filteredPRs.length > 0 ? filteredPRs[0]?.['1RM'] || filteredPRs[0]?.estimated1RM : 0;
  const last1RM = filteredPRs.length > 0 ? filteredPRs[filteredPRs.length - 1]?.estimated1RM : 0;
  const growth1RM = first1RM > 0 ? Math.round(last1RM - first1RM) : 0;
  const growthPct = first1RM > 0 ? Math.round((growth1RM / first1RM) * 100) : 0;
  const current1RM = allPRsForEx.length > 0 ? Math.round(allPRsForEx[allPRsForEx.length - 1]?.estimated1RM || 0) : 0;

  if (availableExercises.length === 0) {
    return <div className="bg-surface rounded-xl p-6 text-center text-text-secondary">아직 운동 기록이 없어요</div>;
  }

  return (
    <div>
      {/* 종목 선택 */}
      <select
        value={selected || ''}
        onChange={(e) => onSelectId(Number(e.target.value))}
        className="w-full bg-surface rounded-lg px-4 py-2.5 text-text outline-none mb-3"
      >
        {availableExercises.map((ex: any) => (
          <option key={ex.id} value={ex.id}>{ex.name}</option>
        ))}
      </select>

      {/* 기간 필터 */}
      <div className="flex gap-2 mb-3">
        {([
          { key: '1m', label: '1개월' },
          { key: '3m', label: '3개월' },
          { key: '6m', label: '6개월' },
          { key: 'all', label: '전체' },
        ] as const).map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              period === p.key ? 'bg-primary/20 text-primary-light border border-primary/30' : 'bg-surface text-text-secondary'
            }`}
          >{p.label}</button>
        ))}
      </div>

      {/* 성장률 요약 */}
      {current1RM > 0 && (
        <div className="bg-surface rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-text-secondary">현재 추정 1RM</div>
              <div className="text-2xl font-bold font-mono">{current1RM}kg</div>
            </div>
            {growth1RM !== 0 && filteredPRs.length >= 2 && (
              <div className={`text-right ${growth1RM > 0 ? 'text-success' : 'text-danger'}`}>
                <div className="text-lg font-bold font-mono">{growth1RM > 0 ? '+' : ''}{growth1RM}kg</div>
                <div className="text-xs">{growthPct > 0 ? '+' : ''}{growthPct}% {period !== 'all' ? `(${period === '1m' ? '1개월' : period === '3m' ? '3개월' : '6개월'})` : ''}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1RM 그래프 */}
      {rmData.length > 0 && (
        <div className="bg-surface rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold mb-3">추정 1RM 변화</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={rmData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} unit="kg" />
              <Tooltip
                contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Line type="monotone" dataKey="1RM" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 볼륨 그래프 */}
      {volumeData.length > 0 && (
        <div className="bg-surface rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">볼륨 변화</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volumeData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} unit="kg" />
              <Tooltip
                contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Bar dataKey="volume" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {rmData.length === 0 && volumeData.length === 0 && (
        <div className="bg-surface rounded-xl p-6 text-center text-text-secondary">이 종목의 기록이 없어요</div>
      )}
    </div>
  );
}

// === 히트맵 탭 ===
function HeatmapTab({ sessions, exercises }: { sessions: any[]; exercises: any[] }) {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');
  const exerciseMap = new Map(exercises.map((e: any) => [e.id, e]));

  const now = new Date();
  const cutoff = period === 'week'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
    : period === 'month'
      ? new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      : null;

  const filtered = cutoff
    ? sessions.filter((s) => parseLocalDate(s.date) >= cutoff)
    : sessions;

  const volumes: Record<string, number> = {};
  for (const session of filtered) {
    for (const ex of session.exercises) {
      const info = exerciseMap.get(ex.exerciseId);
      if (!info) continue;
      const vol = ex.sets
        .filter((s: any) => s.isCompleted)
        .reduce((acc: number, s: any) => acc + s.weight * s.reps, 0);
      volumes[info.muscleGroup] = (volumes[info.muscleGroup] || 0) + vol;
    }
  }

  if (filtered.length === 0) {
    return (
      <div className="bg-surface rounded-xl p-8 text-center border border-border border-dashed">
        <div className="text-3xl mb-2">🏋️</div>
        <p className="text-text-secondary text-sm">운동 기록이 없어요</p>
      </div>
    );
  }

  return (
    <div>
      {/* 기간 선택 */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'week', label: '최근 1주' },
          { key: 'month', label: '최근 1달' },
          { key: 'all', label: '전체' },
        ] as const).map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              period === p.key ? 'bg-primary/20 text-primary-light border border-primary/30' : 'bg-surface text-text-secondary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-xl p-4">
        <MuscleHeatmap volumes={volumes} />
      </div>
    </div>
  );
}

// === 근육군별 통계 ===
function MuscleStats({ sessions, exercises }: { sessions: any[]; exercises: any[] }) {
  const exerciseMap = new Map(exercises.map((e: any) => [e.id, e]));

  const muscleVolume: Record<string, number> = {};
  for (const session of sessions) {
    for (const ex of session.exercises) {
      const info = exerciseMap.get(ex.exerciseId);
      if (!info) continue;
      const volume = ex.sets
        .filter((s: any) => s.isCompleted)
        .reduce((acc: number, s: any) => acc + s.weight * s.reps, 0);
      muscleVolume[info.muscleGroup] = (muscleVolume[info.muscleGroup] || 0) + volume;
    }
  }

  const data = Object.entries(muscleVolume)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((acc, d) => acc + d.value, 0);

  if (data.length === 0) {
    return <div className="bg-surface rounded-xl p-6 text-center text-text-secondary">아직 운동 기록이 없어요</div>;
  }

  return (
    <div>
      {/* 파이 차트 */}
      <div className="bg-surface rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">근육군별 볼륨 비율</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 12 }}
              formatter={(value) => `${Number(value).toLocaleString()}kg`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 상세 리스트 */}
      <div className="bg-surface rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">부위별 상세</h3>
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-3 py-2">
            <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="flex-1 text-sm">{d.name}</span>
            <span className="text-sm text-text-secondary">{d.value.toLocaleString()}kg</span>
            <span className="text-xs text-text-secondary w-12 text-right">
              {total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// === 주간 리포트 ===
function WeeklyStats({ sessions, exercises, personalRecords }: { sessions: any[]; exercises: any[]; personalRecords: any[] }) {
  const exerciseMap = new Map(exercises.map((e: any) => [e.id, e]));

  // 이번 주 / 지난 주 구분
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const thisWeek = sessions.filter((s) => parseLocalDate(s.date) >= startOfWeek);
  const lastWeek = sessions.filter((s) => {
    const d = parseLocalDate(s.date);
    return d >= startOfLastWeek && d < startOfWeek;
  });

  const calcVolume = (ss: any[]) =>
    ss.reduce((acc, s) => acc + s.exercises.reduce((a: number, e: any) =>
      a + e.sets.filter((set: any) => set.isCompleted).reduce((sum: number, set: any) => sum + set.weight * set.reps, 0), 0), 0);

  const calcDuration = (ss: any[]) =>
    ss.reduce((acc, s) => acc + s.duration, 0);

  const thisVolume = calcVolume(thisWeek);
  const lastVolume = calcVolume(lastWeek);
  const volumeChange = lastVolume > 0 ? ((thisVolume - lastVolume) / lastVolume * 100) : 0;

  const thisDuration = calcDuration(thisWeek);

  // 이번 주 PR
  const weekPRs = personalRecords.filter((pr: any) => parseLocalDate(pr.date) >= startOfWeek);

  // 부위별 볼륨 (이번 주)
  const muscleVolume: Record<string, number> = {};
  for (const session of thisWeek) {
    for (const ex of session.exercises) {
      const info = exerciseMap.get(ex.exerciseId);
      if (!info) continue;
      const volume = ex.sets
        .filter((s: any) => s.isCompleted)
        .reduce((acc: number, s: any) => acc + s.weight * s.reps, 0);
      muscleVolume[info.muscleGroup] = (muscleVolume[info.muscleGroup] || 0) + volume;
    }
  }

  const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <div>
      {/* 주간 요약 카드 */}
      <div className="bg-surface rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold mb-1">
          이번 주 리포트 ({formatDate(startOfWeek)} ~ {formatDate(now)})
        </h3>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-surface-light rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{thisWeek.length}</div>
            <div className="text-xs text-text-secondary">운동 횟수</div>
            <div className="text-xs mt-1">
              {thisWeek.length > lastWeek.length ? (
                <span className="text-success">▲ {thisWeek.length - lastWeek.length}</span>
              ) : thisWeek.length < lastWeek.length ? (
                <span className="text-danger">▼ {lastWeek.length - thisWeek.length}</span>
              ) : (
                <span className="text-text-secondary">동일</span>
              )}
            </div>
          </div>

          <div className="bg-surface-light rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{thisVolume.toLocaleString()}</div>
            <div className="text-xs text-text-secondary">총 볼륨 (kg)</div>
            <div className="text-xs mt-1">
              {volumeChange > 0 ? (
                <span className="text-success">▲ {volumeChange.toFixed(1)}%</span>
              ) : volumeChange < 0 ? (
                <span className="text-danger">▼ {Math.abs(volumeChange).toFixed(1)}%</span>
              ) : (
                <span className="text-text-secondary">-</span>
              )}
            </div>
          </div>

          <div className="bg-surface-light rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{Math.floor(thisDuration / 60)}</div>
            <div className="text-xs text-text-secondary">총 운동 시간 (분)</div>
          </div>

          <div className="bg-surface-light rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{weekPRs.length}</div>
            <div className="text-xs text-text-secondary">PR 달성</div>
          </div>
        </div>
      </div>

      {/* PR 목록 */}
      {weekPRs.length > 0 && (
        <div className="bg-surface rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold mb-3">🏆 이번 주 PR</h3>
          {weekPRs.map((pr: any, i: number) => {
            const ex = exerciseMap.get(pr.exerciseId);
            return (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                <span className="text-sm">{ex?.name || '알 수 없음'}</span>
                <span className="text-sm text-primary-light">
                  {pr.maxWeight}kg × {pr.maxReps}회 (1RM: {Math.round(pr.estimated1RM)}kg)
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 부위별 볼륨 */}
      {Object.keys(muscleVolume).length > 0 && (
        <div className="bg-surface rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">부위별 볼륨</h3>
          {Object.entries(muscleVolume)
            .sort(([, a], [, b]) => b - a)
            .map(([muscle, vol], i) => {
              const maxVol = Math.max(...Object.values(muscleVolume), 1);
              return (
                <div key={muscle} className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{muscle}</span>
                    <span className="text-text-secondary">{vol.toLocaleString()}kg</span>
                  </div>
                  <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(vol / maxVol) * 100}%`,
                        background: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {thisWeek.length === 0 && lastWeek.length === 0 && (
        <div className="bg-surface rounded-xl p-6 text-center text-text-secondary">아직 운동 기록이 없어요</div>
      )}
    </div>
  );
}

// === 월별 통계 ===
function MonthlyStats({ sessions, exercises, personalRecords }: { sessions: any[]; exercises: any[]; personalRecords: any[] }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const exerciseMap = new Map(exercises.map((e: any) => [e.id, e]));

  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthSessions = sessions.filter((s) => s.date.startsWith(selectedMonth));

  // 이전 달
  const prevMonthDate = new Date(year, month - 2, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthSessions = sessions.filter((s) => s.date.startsWith(prevMonthKey));

  const calcStats = (ss: any[]) => {
    const totalVolume = ss.reduce((acc, s) => acc + s.exercises.reduce((a: number, e: any) =>
      a + e.sets.filter((set: any) => set.isCompleted).reduce((sum: number, set: any) => sum + set.weight * set.reps, 0), 0), 0);
    const totalDuration = ss.reduce((acc, s) => acc + s.duration, 0);
    const totalSets = ss.reduce((acc, s) => acc + s.exercises.reduce((a: number, e: any) =>
      a + e.sets.filter((set: any) => set.isCompleted).length, 0), 0);
    return { count: ss.length, totalVolume, totalDuration, totalSets };
  };

  const current = calcStats(monthSessions);
  const prev = calcStats(prevMonthSessions);
  const volumeChange = prev.totalVolume > 0 ? ((current.totalVolume - prev.totalVolume) / prev.totalVolume * 100) : 0;

  // 월간 PR
  const monthPRs = personalRecords.filter((pr: any) => pr.date.startsWith(selectedMonth));

  // 부위별 볼륨
  const muscleVolume: Record<string, number> = {};
  for (const session of monthSessions) {
    for (const ex of session.exercises) {
      const info = exerciseMap.get(ex.exerciseId);
      if (!info) continue;
      const vol = ex.sets
        .filter((s: any) => s.isCompleted)
        .reduce((acc: number, s: any) => acc + s.weight * s.reps, 0);
      muscleVolume[info.muscleGroup] = (muscleVolume[info.muscleGroup] || 0) + vol;
    }
  }

  // 주차별 볼륨 (그래프용)
  const weeklyData: { week: string; volume: number; count: number }[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
    const startDay = w * 7 + 1;
    const endDay = Math.min(startDay + 6, daysInMonth);
    const weekSessions = monthSessions.filter((s) => {
      const day = Number(s.date.split('-')[2]);
      return day >= startDay && day <= endDay;
    });
    const vol = weekSessions.reduce((acc, s) => acc + s.exercises.reduce((a: number, e: any) =>
      a + e.sets.filter((set: any) => set.isCompleted).reduce((sum: number, set: any) => sum + set.weight * set.reps, 0), 0), 0);
    weeklyData.push({ week: `${startDay}-${endDay}일`, volume: vol, count: weekSessions.length });
  }

  return (
    <div>
      {/* 월 선택 */}
      <div className="flex items-center justify-between bg-surface rounded-xl p-3 mb-4">
        <button onClick={() => changeMonth(-1)} className="px-3 py-1 text-text-secondary">&lt;</button>
        <span className="font-bold">{year}년 {month}월</span>
        <button onClick={() => changeMonth(1)} className="px-3 py-1 text-text-secondary">&gt;</button>
      </div>

      {monthSessions.length === 0 ? (
        <div className="bg-surface rounded-xl p-8 text-center border border-border border-dashed">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-text-secondary text-sm">이 달의 운동 기록이 없어요</p>
        </div>
      ) : (
        <>
          {/* 월간 요약 */}
          <div className="bg-surface rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold mb-3">{month}월 요약</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-light rounded-lg p-3 text-center">
                <div className="text-2xl font-bold font-mono">{current.count}</div>
                <div className="text-xs text-text-secondary">운동 횟수</div>
                <div className="text-xs mt-1">
                  {current.count > prev.count ? <span className="text-success">▲ {current.count - prev.count}</span>
                    : current.count < prev.count ? <span className="text-danger">▼ {prev.count - current.count}</span>
                    : <span className="text-text-secondary">-</span>}
                </div>
              </div>
              <div className="bg-surface-light rounded-lg p-3 text-center">
                <div className="text-2xl font-bold font-mono">{(current.totalVolume / 1000).toFixed(1)}</div>
                <div className="text-xs text-text-secondary">총 볼륨 (톤)</div>
                <div className="text-xs mt-1">
                  {volumeChange > 0 ? <span className="text-success">▲ {volumeChange.toFixed(1)}%</span>
                    : volumeChange < 0 ? <span className="text-danger">▼ {Math.abs(volumeChange).toFixed(1)}%</span>
                    : <span className="text-text-secondary">-</span>}
                </div>
              </div>
              <div className="bg-surface-light rounded-lg p-3 text-center">
                <div className="text-2xl font-bold font-mono">{Math.floor(current.totalDuration / 60)}</div>
                <div className="text-xs text-text-secondary">총 운동 시간 (분)</div>
              </div>
              <div className="bg-surface-light rounded-lg p-3 text-center">
                <div className="text-2xl font-bold font-mono">{current.totalSets}</div>
                <div className="text-xs text-text-secondary">총 세트</div>
              </div>
            </div>
          </div>

          {/* 주차별 볼륨 그래프 */}
          <div className="bg-surface rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold mb-3">주차별 볼륨</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => `${Number(value).toLocaleString()}kg`}
                />
                <Bar dataKey="volume" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* PR 달성 */}
          {monthPRs.length > 0 && (
            <div className="bg-surface rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold mb-3">🏆 {month}월 PR ({monthPRs.length}개)</h3>
              {monthPRs.map((pr: any, i: number) => {
                const ex = exerciseMap.get(pr.exerciseId);
                return (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                    <span className="text-sm">{ex?.name || '알 수 없음'}</span>
                    <span className="text-sm text-primary-light font-mono">
                      {pr.maxWeight}kg × {pr.maxReps}회 (1RM: {Math.round(pr.estimated1RM)}kg)
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 부위별 볼륨 */}
          {Object.keys(muscleVolume).length > 0 && (
            <div className="bg-surface rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">부위별 볼륨</h3>
              {Object.entries(muscleVolume)
                .sort(([, a], [, b]) => b - a)
                .map(([muscle, vol], i) => {
                  const maxVol = Math.max(...Object.values(muscleVolume), 1);
                  return (
                    <div key={muscle} className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{muscle}</span>
                        <span className="text-text-secondary font-mono">{(vol / 1000).toFixed(1)}톤</span>
                      </div>
                      <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${(vol / maxVol) * 100}%`,
                          background: COLORS[i % COLORS.length],
                        }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
