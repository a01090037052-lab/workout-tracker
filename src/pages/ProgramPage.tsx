import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { storage } from '../lib/storage';
import { programTemplates } from '../data/programs';
import type { ProgramTemplate, WeekPlan, DayPlan } from '../data/programs';

interface ProgramProgress {
  programId: string;
  currentWeek: number;
  oneRepMaxes: Record<string, number>;
  startOneRepMaxes: Record<string, number>; // 시작 시점 1RM (성과 비교용)
  completedDays: { week: number; dayIndex: number; date: string }[];
}

function saveProgress(prog: ProgramProgress) {
  storage.programProgress.set(prog.programId, prog);
}
function loadProgress(programId: string): ProgramProgress | null {
  return storage.programProgress.get<ProgramProgress>(programId);
}
function getActiveId(): string | null {
  return storage.activeProgramId.get();
}
function setActiveId(id: string | null) {
  storage.activeProgramId.set(id);
}

export default function ProgramPage() {
  const navigate = useNavigate();

  const activeId = getActiveId();
  const [selectedProgram, setSelectedProgram] = useState<ProgramTemplate | null>(() => {
    if (activeId) return programTemplates.find((p) => p.id === activeId) || null;
    return null;
  });
  const [progress, setProgress] = useState<ProgramProgress | null>(() => {
    if (activeId) return loadProgress(activeId);
    return null;
  });
  const [setupMode, setSetupMode] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [autoPR, setAutoPR] = useState(() => storage.programAutoApplyPR.get());

  // PR에서 1RM 자동 로드
  const prs = useLiveQuery(async () => {
    const allPRs = await db.personalRecords.toArray();
    const exercises = await db.exercises.toArray();
    const exMap = new Map(exercises.map((e) => [e.id!, e.name]));
    const best: Record<string, number> = {};
    for (const pr of allPRs) {
      const name = exMap.get(pr.exerciseId);
      if (name && (!best[name] || pr.estimated1RM > best[name])) {
        best[name] = Math.round(pr.estimated1RM);
      }
    }
    return best;
  });

  // day complete를 실제 운동 세션 기반으로 판정 (cancel/실패해도 정확)
  const programSessions = useLiveQuery(
    async () => {
      if (!selectedProgram) return [];
      const all = await db.sessions.toArray();
      return all.filter((s) => s.programId === selectedProgram.id);
    },
    [selectedProgram?.id]
  );

  // PR 변경 감지 → 1RM 자동 반영 (옵션 ON일 때만; OFF면 사용자가 setupMode에서 수동 반영)
  // progress/selectedProgram은 의도적으로 deps 제외 — setProgress 후 재트리거 시 updated=false라 안전한 종료, deps에 넣으면 사이클당 1번만 도는 흐름이 깨짐
  useEffect(() => {
    if (!autoPR) return;
    if (!prs || !progress || !selectedProgram) return;
    let updated = false;
    const newMaxes = { ...progress.oneRepMaxes };
    for (const exName of selectedProgram.exercises) {
      if (prs[exName] && prs[exName] > (newMaxes[exName] || 0)) {
        newMaxes[exName] = prs[exName];
        updated = true;
      }
    }
    if (updated) {
      const newProgress = { ...progress, oneRepMaxes: newMaxes };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(newProgress);
      saveProgress(newProgress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prs, autoPR]);

  // 진행 상태 자동 저장
  useEffect(() => {
    if (progress && selectedProgram && !setupMode) {
      saveProgress(progress);
      setActiveId(selectedProgram.id);
    }
  }, [progress, selectedProgram, setupMode]);

  const handleSelectProgram = (prog: ProgramTemplate) => {
    const saved = loadProgress(prog.id);
    if (saved) {
      setSelectedProgram(prog);
      setProgress(saved);
      setSetupMode(false);
      setActiveId(prog.id);
      return;
    }
    setSelectedProgram(prog);
    setSetupMode(true);
    const auto: Record<string, number> = {};
    for (const exName of prog.exercises) {
      if (prs?.[exName]) auto[exName] = prs[exName];
    }
    setProgress({ programId: prog.id, currentWeek: 1, oneRepMaxes: auto, startOneRepMaxes: { ...auto }, completedDays: [] });
  };

  const handleResetProgram = () => {
    setSelectedProgram(null);
    setSetupMode(false);
    setShowGuide(false);
  };

  // sessions 기반: 실제 완료된 운동만 인정 (cancel/저장 안 된 day는 미완료로 표시)
  const isDayCompleted = (dayIndex: number) => {
    if (!progress || !programSessions) return false;
    return programSessions.some(
      (s) => s.programWeek === progress.currentWeek && s.programDay === dayIndex
    );
  };

  const weekCompletedCount = () => {
    if (!progress || !programSessions) return 0;
    const days = new Set(
      programSessions
        .filter((s) => s.programWeek === progress.currentWeek)
        .map((s) => s.programDay)
    );
    return days.size;
  };

  // 프로그램 선택 화면
  if (!selectedProgram || !progress) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">프로그램</h1>
        <p className="text-sm text-text-secondary mb-4">주차별 자동 증량 프로그램을 선택하세요</p>
        <div className="space-y-3">
          {programTemplates.map((prog) => {
            const saved = loadProgress(prog.id);
            const isActive = activeId === prog.id;
            return (
              <button
                key={prog.id}
                onClick={() => handleSelectProgram(prog)}
                className={`w-full bg-surface rounded-xl p-4 text-left active:bg-surface-light transition-colors border ${
                  isActive ? 'border-primary' : 'border-border'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold">{prog.name}</h3>
                  <div className="flex gap-1">
                    {saved && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-primary/20 text-primary-light' : 'bg-surface-light text-text-secondary'
                      }`}>
                        {isActive ? '진행 중' : `${saved.currentWeek}주차 저장됨`}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      prog.type === 'strength' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {prog.type === 'strength' ? '스트렝스' : '근비대'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-secondary mb-2">{prog.description}</p>
                <div className="flex gap-3 text-xs text-text-secondary">
                  <span>주 {prog.daysPerWeek}일</span>
                  <span>{prog.durationWeeks}주</span>
                  <span>{prog.exercises.length}종목</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 1RM 설정 화면
  if (setupMode) {
    const allFilled = selectedProgram.exercises.some((ex) => (progress.oneRepMaxes[ex] || 0) > 0);
    return (
      <div className="p-4">
        <button onClick={() => { setSelectedProgram(null); setSetupMode(false); }} className="text-text-secondary text-sm mb-4">
          ← 프로그램 선택
        </button>
        <h1 className="text-2xl font-bold mb-1">{selectedProgram.name}</h1>
        <p className="text-sm text-text-secondary mb-4">각 종목의 1RM을 입력하세요. PR 기록이 있으면 자동으로 채워집니다.</p>

        <div className="space-y-3 mb-6">
          {selectedProgram.exercises.map((exName) => (
            <div key={exName} className="bg-surface rounded-xl p-4">
              <label className="text-sm font-medium mb-2 block">{exName}</label>
              <div className="flex items-center gap-2">
                <input type="number" inputMode="decimal"
                  value={progress.oneRepMaxes[exName] || ''}
                  onChange={(e) => setProgress({ ...progress, oneRepMaxes: { ...progress.oneRepMaxes, [exName]: Math.max(0, Number(e.target.value)) } })}
                  placeholder="1RM (kg)" min="0"
                  className="flex-1 bg-surface-light rounded-lg px-4 py-2.5 text-text font-mono outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-text-secondary">kg</span>
                {prs?.[exName] && (
                  <button
                    onClick={() => setProgress({ ...progress, oneRepMaxes: { ...progress.oneRepMaxes, [exName]: prs[exName] } })}
                    className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${
                      progress.oneRepMaxes[exName] === prs[exName] ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary-light'
                    }`}
                  >PR: {prs[exName]}kg</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {prs && Object.keys(prs).length > 0 && (
          <button
            onClick={() => {
              const auto: Record<string, number> = { ...progress.oneRepMaxes };
              for (const exName of selectedProgram.exercises) {
                if (prs[exName] && !auto[exName]) auto[exName] = prs[exName];
              }
              setProgress({ ...progress, oneRepMaxes: auto });
            }}
            className="w-full mb-3 py-2.5 bg-surface text-primary-light rounded-xl text-sm font-medium"
          >PR로 전체 자동 채우기</button>
        )}

        <button
          onClick={() => setSetupMode(false)}
          disabled={!allFilled}
          className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl font-semibold transition-colors"
        >프로그램 시작</button>
        {!allFilled && <p className="text-xs text-text-secondary text-center mt-2">최소 1개 종목의 1RM을 입력하세요</p>}
      </div>
    );
  }

  const startDayWorkout = async (day: DayPlan, dayIndex: number) => {
    const allExercises = await db.exercises.toArray();
    const nameMap = new Map(allExercises.map((e) => [e.name, e.id!]));
    const exercises = day.exercises
      .map((ex, i) => {
        const cleanName = ex.exerciseName.replace(/\s*\(보조\)$/, '').replace(/\s*\(AMRAP\)$/, '');
        const id = nameMap.get(cleanName) || nameMap.get(ex.exerciseName);
        if (!id) return null;
        return { exerciseId: id, sets: ex.sets.length, order: i,
          setsDetail: ex.sets.map((s) => ({ weight: s.weight || 0, reps: s.reps })),
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    if (exercises.length > 0) {
      // day complete는 finishWorkout 후 sessions에 programDay가 저장될 때 자동 인식 (cancel 시 미완료 유지)
      navigate('/workout', { state: {
        exercises, fromProgram: true,
        programId: selectedProgram.id, programWeek: progress.currentWeek, programDay: dayIndex,
      }});
    }
  };

  const weekPlan: WeekPlan = selectedProgram.getWeekPlan(progress.currentWeek, progress.oneRepMaxes);
  const isLastWeek = progress.currentWeek >= selectedProgram.durationWeeks;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={handleResetProgram} className="text-text-secondary text-sm">← 프로그램 선택</button>
      </div>

      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold">{selectedProgram.name}</h1>
        <div className="flex gap-1.5">
          <button
            onClick={() => { const next = !autoPR; storage.programAutoApplyPR.set(next); setAutoPR(next); }}
            className={`text-xs px-3 min-h-[40px] rounded-lg active:scale-95 ${autoPR ? 'bg-success/15 text-success' : 'bg-surface-light text-text-secondary'}`}
            title={autoPR ? 'PR 갱신 시 1RM 자동 반영 (사이클 도중 무게 점프 가능)' : '1RM 수동 갱신 (사이클 시작 시 직접)'}
          >PR자동 {autoPR ? 'ON' : 'OFF'}</button>
          <button onClick={() => setShowGuide(!showGuide)} className="text-xs text-primary-light px-3 min-h-[40px] bg-primary/10 rounded-lg active:scale-95">
            {showGuide ? '접기' : '📖 가이드'}
          </button>
          <button onClick={() => setSetupMode(true)} className="text-xs text-text-secondary px-3 min-h-[40px] bg-surface-light rounded-lg active:scale-95">
            1RM 수정
          </button>
        </div>
      </div>

      {showGuide && (
        <div className="bg-surface rounded-xl p-4 mb-4 border border-primary/20">
          <div className="text-sm whitespace-pre-line text-text-secondary leading-relaxed">{selectedProgram.guide}</div>
        </div>
      )}

      {/* 1RM 요약 (PR 자동 반영 표시) */}
      <div className="flex gap-2 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {selectedProgram.exercises.map((exName) => {
          const prValue = prs?.[exName] || 0;
          const currentValue = progress.oneRepMaxes[exName] || 0;
          const isUpdated = prValue > 0 && prValue === currentValue;
          return (
            <div key={exName} className={`bg-surface rounded-lg px-3 py-1.5 flex-shrink-0 ${isUpdated ? 'border border-success/30' : ''}`}>
              <span className="text-[10px] text-text-secondary">{exName}</span>
              <span className="text-xs font-mono font-bold ml-1">{currentValue || '?'}kg</span>
              {isUpdated && <span className="text-[10px] text-success ml-1 font-semibold">PR</span>}
            </div>
          );
        })}
      </div>

      {/* 주차 선택 */}
      <div className="flex items-center justify-between bg-surface rounded-xl p-3 mb-2">
        <button onClick={() => setProgress({ ...progress, currentWeek: Math.max(1, progress.currentWeek - 1) })}
          disabled={progress.currentWeek <= 1} aria-label="이전 주" className="w-11 h-11 flex items-center justify-center text-text-secondary disabled:opacity-30 active:bg-surface-light rounded-lg">◀</button>
        <div className="text-center">
          <div className="font-bold">{weekPlan.label}</div>
          <div className="text-xs text-text-secondary">{progress.currentWeek} / {selectedProgram.durationWeeks}주 · {weekCompletedCount()}/{weekPlan.days.length}일 완료</div>
        </div>
        <button onClick={() => setProgress({ ...progress, currentWeek: Math.min(selectedProgram.durationWeeks, progress.currentWeek + 1) })}
          disabled={isLastWeek} aria-label="다음 주" className="w-11 h-11 flex items-center justify-center text-text-secondary disabled:opacity-30 active:bg-surface-light rounded-lg">▶</button>
      </div>

      {/* 주간 진행 바 */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: selectedProgram.durationWeeks }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
            i + 1 < progress.currentWeek ? 'bg-success'
            : i + 1 === progress.currentWeek ? 'bg-primary'
            : 'bg-surface-light'
          }`} />
        ))}
      </div>

      {/* 일별 플랜 */}
      <div className="space-y-3">
        {weekPlan.days.map((day, di) => {
          const completed = isDayCompleted(di);
          return (
            <div key={di} className={`bg-surface rounded-xl p-4 border ${completed ? 'border-success/30' : 'border-border'}`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  {completed && <span className="w-5 h-5 bg-success rounded-full flex items-center justify-center text-white text-[10px]">✓</span>}
                  <h3 className={`font-semibold ${completed ? 'text-text-secondary' : ''}`}>{day.label}</h3>
                </div>
                <button
                  onClick={() => startDayWorkout(day, di)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium active:scale-95 transition-transform ${
                    completed ? 'bg-surface-light text-text-secondary' : 'bg-primary text-white'
                  }`}
                >{completed ? '다시 하기' : '운동 시작'}</button>
              </div>
              {day.exercises.map((ex, ei) => (
                <div key={ei} className="mb-3 last:mb-0">
                  <div className="text-sm font-medium text-primary-light mb-1.5">{ex.exerciseName}</div>
                  <div className="bg-surface-light rounded-lg overflow-hidden">
                    <div className="flex px-3 py-1.5 text-[10px] text-text-secondary border-b border-border">
                      <span className="w-10 text-center">세트</span>
                      <span className="flex-1 text-center">무게</span>
                      <span className="flex-1 text-center">강도</span>
                      <span className="w-12 text-center">횟수</span>
                    </div>
                    {ex.sets.map((set, si) => (
                      <div key={si} className="flex px-3 py-2 text-sm border-b border-border last:border-b-0">
                        <span className="w-10 text-center text-text-secondary font-mono">{si + 1}</span>
                        <span className="flex-1 text-center font-mono font-semibold">{set.weight ? `${set.weight}kg` : '-'}</span>
                        <span className="flex-1 text-center text-text-secondary font-mono">{set.percentage > 0 ? `${set.percentage}%` : '-'}</span>
                        <span className="w-12 text-center font-mono">
                          {set.reps}{set.isAMRAP && <span className="text-orange-400 font-bold">+</span>}회
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* 프로그램 완료 */}
      {isLastWeek && weekCompletedCount() >= weekPlan.days.length && (
        <div className="mt-4 bg-gradient-to-br from-success/20 to-success/5 border border-success/30 rounded-xl p-6">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="font-bold text-xl mb-1">프로그램 완료!</h3>
            <p className="text-sm text-text-secondary">{selectedProgram.name} {selectedProgram.durationWeeks}주를 마쳤습니다</p>
          </div>

          {/* 1RM 성과 비교 */}
          {progress.startOneRepMaxes && (
            <div className="bg-surface rounded-xl p-4 mb-4">
              <h4 className="text-sm font-semibold mb-3 text-center">📊 1RM 성장 비교</h4>
              <div className="space-y-2">
                {selectedProgram.exercises.map((exName) => {
                  const start = progress.startOneRepMaxes?.[exName] || 0;
                  const end = progress.oneRepMaxes[exName] || 0;
                  const diff = end - start;
                  const pct = start > 0 ? Math.round((diff / start) * 100) : 0;
                  return (
                    <div key={exName} className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0">
                      <span className="text-sm">{exName}</span>
                      <div className="flex items-center gap-2 font-mono text-sm">
                        <span className="text-text-secondary">{start || '?'}kg</span>
                        <span className="text-text-secondary">→</span>
                        <span className="font-bold">{end || '?'}kg</span>
                        {diff > 0 && <span className="text-success text-xs">+{diff}kg ({pct}%↑)</span>}
                        {diff === 0 && start > 0 && <span className="text-text-secondary text-xs">유지</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {(() => {
                const totalStart = Object.values(progress.startOneRepMaxes || {}).reduce((a, b) => a + b, 0);
                const totalEnd = selectedProgram.exercises.reduce((a, ex) => a + (progress.oneRepMaxes[ex] || 0), 0);
                const totalDiff = totalEnd - totalStart;
                if (totalDiff > 0) {
                  return <p className="text-center text-success text-sm font-semibold mt-3">총 +{totalDiff}kg 성장! 💪</p>;
                }
                return null;
              })()}
            </div>
          )}

          {/* 다음 사이클 (TM 자동 증량) */}
          <button
            onClick={async () => {
              const upperExercises = ['벤치프레스', '오버헤드 프레스', '덤벨 숄더 프레스', '덤벨 벤치프레스'];
              const is531 = selectedProgram.id === '531' || selectedProgram.id === '531bbb';
              const allExercises = await db.exercises.toArray();
              const exMap = new Map(allExercises.map((e) => [e.id!, e.name]));
              const newMaxes: Record<string, number> = {};

              for (const exName of selectedProgram.exercises) {
                const current = progress.oneRepMaxes[exName] || 0;
                if (current === 0) { newMaxes[exName] = 0; continue; }
                const isUpper = upperExercises.includes(exName);

                let increment: number;
                if (is531) {
                  // 5/3/1 정통: AMRAP 결과 기반 TM 증량 결정
                  const recent = (programSessions || [])
                    .filter((s) => s.exercises.some((e) => exMap.get(e.exerciseId) === exName))
                    .sort((a, b) => b.date.localeCompare(a.date))[0];
                  const ex = recent?.exercises.find((e) => exMap.get(e.exerciseId) === exName);
                  const lastSet = ex?.sets[ex.sets.length - 1];
                  const amrapReps = lastSet?.reps || 0;

                  if (amrapReps >= 11) increment = isUpper ? 5 : 10;       // 탁월
                  else if (amrapReps >= 4) increment = isUpper ? 2.5 : 5;  // 정상
                  else if (amrapReps >= 1) increment = 0;                  // 유지 (다음 사이클 도전)
                  else increment = isUpper ? -2.5 : -5;                    // 데이터 없음 → 약간 감량
                } else {
                  increment = isUpper ? 5 : 10;
                }
                newMaxes[exName] = Math.max(0, current + increment);
              }

              const newProgress: ProgramProgress = {
                ...progress,
                currentWeek: 1,
                oneRepMaxes: newMaxes,
                startOneRepMaxes: { ...newMaxes },
                completedDays: [],
              };
              setProgress(newProgress);
              saveProgress(newProgress);
            }}
            className="w-full px-4 py-3 bg-success text-white rounded-xl text-sm font-semibold mb-2"
          >
            🔄 다음 사이클 시작
            <div className="text-[10px] font-normal mt-0.5 opacity-90">
              {selectedProgram.id === '531' || selectedProgram.id === '531bbb'
                ? 'AMRAP 결과 기반 자동 증량 (정통 5/3/1)'
                : '상체 +5kg / 하체 +10kg'}
            </div>
          </button>

          <button
            onClick={() => { setActiveId(null); setSelectedProgram(null); }}
            className="w-full px-4 py-3 bg-surface text-text-secondary rounded-xl text-sm font-semibold"
          >다른 프로그램 선택하기</button>
        </div>
      )}
    </div>
  );
}
