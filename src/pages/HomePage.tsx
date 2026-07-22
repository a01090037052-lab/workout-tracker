import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getLocalDate, formatDateKr } from '../hooks/useLocalDate';
import { useWorkoutContext } from '../hooks/WorkoutContext';
import { useWorkoutDuration } from '../hooks/useWorkoutDuration';
import { storage } from '../lib/storage';
import { generateInsights } from '../lib/insights';

function BodyWeightWidget() {
  const today = getLocalDate();
  const [inputWeight, setInputWeight] = useState('');
  const [inputBodyFat, setInputBodyFat] = useState('');
  const [inputMuscle, setInputMuscle] = useState('');
  const [showInput, setShowInput] = useState(false);

  const todayLog = useLiveQuery(() => db.bodyWeightLogs.where('date').equals(today).first());
  const recentLogs = useLiveQuery(() => db.bodyWeightLogs.orderBy('date').reverse().limit(7).toArray());

  const handleSave = async () => {
    const w = Number(inputWeight);
    if (w <= 0) return;
    const bf = Number(inputBodyFat);
    const mm = Number(inputMuscle);
    const patch: Partial<{ weight: number; bodyFat: number; muscleMass: number }> = { weight: w };
    if (bf > 0 && bf < 60) patch.bodyFat = bf;
    if (mm > 0 && mm < 100) patch.muscleMass = mm;

    if (todayLog) {
      await db.bodyWeightLogs.update(todayLog.id!, patch);
    } else {
      await db.bodyWeightLogs.add({ date: today, ...patch } as { date: string; weight: number });
    }
    setShowInput(false);
    setInputWeight('');
    setInputBodyFat('');
    setInputMuscle('');
  };

  const prevWeight = recentLogs && recentLogs.length >= 2 ? recentLogs.find((l) => l.date !== today)?.weight : null;
  const diff = todayLog && prevWeight ? todayLog.weight - prevWeight : null;

  return (
    <section className="mb-4">
      <div className="bg-surface rounded-xl p-4 border border-border">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">체중</span>
            {todayLog ? (
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold font-mono">{todayLog.weight}kg</span>
                {diff !== null && diff !== 0 && (
                  <span className={`text-xs font-mono ${diff > 0 ? 'text-danger' : 'text-success'}`}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-text-secondary">오늘 기록 없음</span>
            )}
          </div>
          <button
            onClick={() => {
              setShowInput(!showInput);
              setInputWeight(todayLog ? String(todayLog.weight) : '');
              setInputBodyFat(todayLog?.bodyFat ? String(todayLog.bodyFat) : '');
              setInputMuscle(todayLog?.muscleMass ? String(todayLog.muscleMass) : '');
            }}
            className="text-xs px-3 py-1.5 bg-primary/10 text-primary-light rounded-lg"
          >
            {todayLog ? '수정' : '기록'}
          </button>
        </div>
        {showInput && (
          <div className="mt-3 space-y-2">
            <input
              type="number"
              inputMode="decimal"
              value={inputWeight}
              onChange={(e) => setInputWeight(e.target.value)}
              placeholder="체중 (kg) *필수"
              className="w-full bg-surface-light rounded-lg px-3 py-2 text-text font-mono outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number" inputMode="decimal" step="0.1"
                value={inputBodyFat}
                onChange={(e) => setInputBodyFat(e.target.value)}
                placeholder="체지방률 % (선택)"
                className="bg-surface-light rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="number" inputMode="decimal" step="0.1"
                value={inputMuscle}
                onChange={(e) => setInputMuscle(e.target.value)}
                placeholder="골격근 kg (선택)"
                className="bg-surface-light rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button onClick={handleSave} className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
              저장
            </button>
            <p className="text-[10px] text-text-secondary text-center">체지방률·근육량은 InBody/가정용 체중계 데이터 (있을 때만)</p>
          </div>
        )}
      </div>
    </section>
  );
}

const MUSCLE_GROUPS = ['가슴', '등', '어깨', '이두', '삼두', '하체', '코어'] as const;

function ConditionWidget() {
  const today = getLocalDate();
  const log = useLiveQuery(() => db.conditionLogs.where('date').equals(today).first(), [today]);
  // null = 편집 안 함(저장값 표시), 문자열 = 편집 중. defaultValue+value 혼용으로
  // 값을 비울 수 없던 문제 + controlled/uncontrolled 경고 제거
  const [sleepInput, setSleepInput] = useState<string | null>(null);

  // 초기값 동기화 (log 변경 시)
  const sleepValue = log?.sleepHours;
  const sorePartsList = log?.soreParts || [];

  const updateLog = async (changes: Partial<{ sleepHours: number; soreParts: typeof sorePartsList }>) => {
    if (log?.id) {
      await db.conditionLogs.update(log.id, changes);
    } else {
      await db.conditionLogs.add({ date: today, ...changes });
    }
  };

  const handleSleepBlur = async () => {
    if (sleepInput === null) return;
    const h = Number(sleepInput);
    if (h > 0 && h <= 24 && h !== sleepValue) {
      await updateLog({ sleepHours: h });
    }
    setSleepInput(null);
  };

  const toggleSore = async (m: typeof MUSCLE_GROUPS[number]) => {
    const cur = sorePartsList;
    const next = cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m];
    await updateLog({ soreParts: next });
  };

  return (
    <section className="mb-4">
      <div className="bg-surface rounded-xl p-4 border border-border">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold">😴 오늘 컨디션</span>
          {sleepValue !== undefined && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              sleepValue >= 7 ? 'bg-success/15 text-success' :
              sleepValue >= 6 ? 'bg-warning/15 text-warning' :
              'bg-danger/15 text-danger'
            }`}>
              {sleepValue >= 7 ? '충분' : sleepValue >= 6 ? '부족' : '심각'}
            </span>
          )}
        </div>

        {/* 수면 */}
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-text-secondary w-20">어젯밤 수면</label>
          <input
            type="text" inputMode="decimal"
            value={sleepInput !== null ? sleepInput : (sleepValue !== undefined ? String(sleepValue) : '')}
            onFocus={() => setSleepInput(sleepValue !== undefined ? String(sleepValue) : '')}
            onChange={(e) => setSleepInput(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
            onBlur={handleSleepBlur}
            placeholder="0"
            className="flex-1 bg-surface-light rounded-lg px-3 py-3 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-xs text-text-secondary">시간</span>
        </div>

        {/* 근육통 chips */}
        <div>
          <label className="text-[10px] text-text-secondary mb-1.5 block">근육통 부위 (탭으로 토글)</label>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map((m) => {
              const active = sorePartsList.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => toggleSore(m)}
                  className={`px-3.5 min-h-[40px] rounded-full text-xs transition-colors active:scale-95 ${
                    active ? 'bg-warning/20 text-warning border border-warning/40' : 'bg-surface-light text-text-secondary border border-transparent'
                  }`}
                >{m}</button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function getStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = getLocalDate();
  const yesterday = getLocalDate(new Date(Date.now() - 86400000));

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    // 날짜 문자열 기반 비교 (DST 영향 없음)
    const prevDate = new Date(sorted[i - 1] + 'T12:00:00');
    prevDate.setDate(prevDate.getDate() - 1);
    const expectedPrev = getLocalDate(prevDate);
    if (sorted[i] === expectedPrev) streak++;
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
    // toISOString()은 UTC라 KST 오전엔 하루 밀린다 → 로컬 포맷터 사용
    return getLocalDate(d);
  });
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function HomePage() {
  const navigate = useNavigate();
  const { isActive: workoutActive, exercises: workoutExercises } = useWorkoutContext();
  const workoutDuration = useWorkoutDuration();
  const today = getLocalDate();

  const todaySessions = useLiveQuery(
    () => db.sessions.where('date').equals(today).toArray()
  );

  // 최근 60일치만 가져옴 — streak/이번주/최근5개/추천 모두 60일이면 충분, 장기 누적 시 첫 진입 비용 방지
  const allSessions = useLiveQuery(
    () => db.sessions.orderBy('date').reverse().limit(60).toArray()
  );

  // 운동/영양/체중/PR 교차 분석 — 우선순위 내림차순 정렬된 인사이트 목록
  const insights = useLiveQuery(() => generateInsights(), []);

  // 진행 중 목표
  const activeGoals = useLiveQuery(async () => {
    const all = await db.goals.toArray();
    return all.filter((g) => !g.completedAt);
  }, []);

  // 백업 리마인더 스냅샷 (1회 평가)
  // 페이지 진입 시점을 1회 캡처 (Date.now()를 렌더 중 호출하지 않기 위함)
  const [pageOpenedMs] = useState(() => Date.now());

  const [bannerSnapshot] = useState(() => {
    const lastBackupAt = storage.lastBackupAt.get();
    const snoozedUntil = storage.backupSnoozedUntil.get();
    const now = Date.now();
    const isSnoozed = snoozedUntil > now;
    const daysSinceBackup = lastBackupAt > 0 ? Math.floor((now - lastBackupAt) / 86400000) : null;
    return { isSnoozed, daysSinceBackup };
  });
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const snoozeBackupReminder = () => {
    storage.backupSnoozedUntil.set(Date.now() + 30 * 86400000);
    setBannerDismissed(true);
  };

  const recentSessions = allSessions?.slice(0, 5);
  const allDates = allSessions?.map((s) => s.date) || [];
  const streak = getStreak(allDates);
  const weekDays = getWeekDays();
  const workoutDatesSet = new Set(allDates);

  const weekCount = weekDays.filter((d) => workoutDatesSet.has(d)).length;

  const hasTodaySessions = todaySessions && todaySessions.length > 0;
  const todayExerciseCount = todaySessions?.reduce((acc, s) => acc + s.exercises.length, 0) || 0;
  const todayVolume = todaySessions?.reduce((acc, s) =>
    acc + s.exercises.reduce((a, ex) => a + ex.sets.filter((set) => set.isCompleted).reduce((sum, set) => sum + set.weight * set.reps, 0), 0), 0) || 0;
  const todaySets = todaySessions?.reduce((acc, s) =>
    acc + s.exercises.reduce((a, ex) => a + ex.sets.filter((set) => set.isCompleted).length, 0), 0) || 0;
  const todayDuration = todaySessions?.reduce((acc, s) => acc + s.duration, 0) || 0;

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
          <p className="text-sm text-text-secondary mt-0.5">
            {(() => {
              const [y, m, d] = today.split('-');
              const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
              return `${y}년 ${Number(m)}월 ${Number(d)}일 (${dayOfWeek})`;
            })()}
          </p>
        </div>
        {streak > 0 && (
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl px-3 py-2 text-center">
            <div className="text-xl font-bold text-white leading-none">{streak}</div>
            <div className="text-[10px] text-white/80">일 연속</div>
          </div>
        )}
      </div>

      {/* 백업 리마인더 */}
      {!bannerDismissed && !bannerSnapshot.isSnoozed && allSessions && allSessions.length > 0 &&
        (bannerSnapshot.daysSinceBackup === null || bannerSnapshot.daysSinceBackup >= 14) && (
          <section className="mb-4">
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none mt-0.5">💾</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold mb-1">
                    {bannerSnapshot.daysSinceBackup === null ? '백업이 한 번도 없어요' : '백업한 지 오래됐어요'}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {bannerSnapshot.daysSinceBackup === null
                      ? '브라우저 데이터가 삭제되면 운동 기록이 모두 사라져요. 한 번만 백업해두세요.'
                      : `백업한 지 ${bannerSnapshot.daysSinceBackup}일 됐어요. 그동안의 기록을 잃지 않으려면 백업이 필요해요.`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => navigate('/settings')}
                  className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                >
                  지금 백업
                </button>
                <button
                  onClick={snoozeBackupReminder}
                  className="px-3 py-2 text-text-secondary text-xs"
                >
                  30일 후
                </button>
              </div>
            </div>
          </section>
        )}

      {/* 오늘의 인사이트 (운동/영양/체중/PR 교차 분석) */}
      {insights && insights.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">오늘의 인사이트</h2>
          <div className="space-y-2">
            {insights.slice(0, 3).map((ins) => (
              <div
                key={ins.id}
                className={`rounded-xl p-3 border ${
                  ins.tone === 'success' ? 'bg-success/10 border-success/30' :
                  ins.tone === 'warning' ? 'bg-warning/10 border-warning/30' :
                  'bg-primary/10 border-primary/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg leading-none mt-0.5">{ins.icon}</span>
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${
                      ins.tone === 'success' ? 'text-success' :
                      ins.tone === 'warning' ? 'text-warning' :
                      'text-primary-light'
                    }`}>{ins.title}</div>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{ins.text}</p>
                  </div>
                </div>
              </div>
            ))}
            {insights.length > 3 && (
              <div className="text-[10px] text-text-secondary text-center">…외 {insights.length - 3}건</div>
            )}
          </div>
        </section>
      )}

      {/* 목표 + 주간 리포트 진입 (가로 2분할) */}
      <section className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate('/goals')}
          className={`rounded-xl p-3 text-left transition-colors ${
            activeGoals && activeGoals.length > 0
              ? 'bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 active:bg-primary/15'
              : 'bg-surface border border-border border-dashed active:bg-surface-light'
          }`}
        >
          <div className="text-sm font-semibold">🎯 목표</div>
          <div className="text-[10px] text-text-secondary mt-0.5">
            {activeGoals && activeGoals.length > 0
              ? `${activeGoals.length}개 진행 중`
              : 'PR/체중/횟수 목표'}
          </div>
        </button>
        <button
          onClick={() => navigate('/weekly')}
          className="rounded-xl p-3 text-left bg-gradient-to-br from-success/10 to-success/5 border border-success/20 active:bg-success/15 transition-colors"
        >
          <div className="text-sm font-semibold">📊 주간 리포트</div>
          <div className="text-[10px] text-text-secondary mt-0.5">코치 평가 + 다음 주 행동</div>
        </button>
      </section>

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

      {/* 빠른 시작 / 이어하기 */}
      {workoutActive ? (
        <button
          onClick={() => navigate('/workout')}
          className="w-full bg-gradient-to-r from-success to-green-600 text-white font-semibold py-4 rounded-xl text-lg transition-all shadow-lg shadow-success/25 active:scale-[0.98] mb-4"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            운동 이어하기 ({Math.floor(workoutDuration / 60)}분 · {workoutExercises.length}종목)
          </div>
        </button>
      ) : (
        <button
          onClick={() => navigate('/workout')}
          className="w-full bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold py-4 rounded-xl text-lg transition-all shadow-lg shadow-primary/25 active:scale-[0.98] mb-4"
        >
          운동 시작하기
        </button>
      )}

      {/* 온보딩 (첫 사용자) */}
      {!workoutActive && allSessions && allSessions.length === 0 && (
        <section className="mb-4">
          <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 rounded-xl p-5">
            <div className="text-center mb-3">
              <div className="text-3xl mb-2">🏋️</div>
              <h3 className="font-bold text-lg">첫 운동을 시작해보세요!</h3>
            </div>
            <p className="text-sm text-text-secondary text-center mb-4">
              벤치프레스, 스쿼트, 데드리프트부터 시작하는 걸 추천해요
            </p>
            <div className="flex gap-2">
              <button onClick={() => navigate('/workout')} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
                바로 시작
              </button>
              <button onClick={() => navigate('/programs')} className="flex-1 py-2.5 bg-surface text-text rounded-xl text-sm font-semibold">
                프로그램 선택
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 오늘 운동 추천 */}
      {!workoutActive && !hasTodaySessions && allSessions && allSessions.length > 0 && (
        <section className="mb-4">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="text-xs text-primary-light font-semibold mb-2">💡 오늘의 추천</div>
            {(() => {
              const activeProgId = storage.activeProgramId.get();
              if (activeProgId) {
                return <p className="text-sm text-text-secondary">진행 중인 프로그램이 있어요. 운동 탭 → 프로그램 보기에서 확인하세요!</p>;
              }
              const lastDate = allSessions[0]?.date || '';
              const daysSince = lastDate ? Math.floor((pageOpenedMs - new Date(lastDate + 'T12:00:00').getTime()) / 86400000) : 0;
              if (daysSince >= 3) {
                return <p className="text-sm text-text-secondary">마지막 운동이 {daysSince}일 전이에요. 오늘 다시 시작해보세요! 💪</p>;
              }
              if (daysSince >= 1) {
                return <p className="text-sm text-text-secondary">어제 쉬었으니 오늘은 운동하기 좋은 날이에요!</p>;
              }
              return null;
            })()}
          </div>
        </section>
      )}

      {/* 체중 기록 */}
      <BodyWeightWidget />

      {/* 오늘 컨디션 (수면 + 근육통) */}
      <ConditionWidget />

      {/* 오늘의 운동 */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">오늘의 운동</h2>
        {hasTodaySessions ? (
          <div className="bg-gradient-to-br from-surface to-surface-light rounded-xl p-4 border border-border">
            {todaySessions!.length > 1 && (
              <div className="text-xs text-primary-light mb-2 text-center">{todaySessions!.length}회 운동</div>
            )}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xl font-bold font-mono">{todayExerciseCount}</div>
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
              {Math.floor(todayDuration / 60)}분 운동 완료
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
                    <span className="font-medium">{formatDateKr(session.date)}</span>
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
