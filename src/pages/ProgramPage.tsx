import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { programTemplates } from '../data/programs';
import type { ProgramTemplate, WeekPlan, DayPlan } from '../data/programs';

export default function ProgramPage() {
  const navigate = useNavigate();
  const [selectedProgram, setSelectedProgram] = useState<ProgramTemplate | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [oneRepMaxes, setOneRepMaxes] = useState<Record<string, number>>({});
  const [setupMode, setSetupMode] = useState(false);

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

  const handleSelectProgram = (prog: ProgramTemplate) => {
    setSelectedProgram(prog);
    setCurrentWeek(1);
    setSetupMode(true);
    // PR 데이터로 1RM 자동 채우기
    const auto: Record<string, number> = {};
    for (const exName of prog.exercises) {
      if (prs?.[exName]) auto[exName] = prs[exName];
    }
    setOneRepMaxes(auto);
  };

  // 프로그램 선택 화면
  if (!selectedProgram) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">프로그램</h1>
        <p className="text-sm text-text-secondary mb-4">
          주차별 자동 증량 프로그램을 선택하세요
        </p>
        <div className="space-y-3">
          {programTemplates.map((prog) => (
            <button
              key={prog.id}
              onClick={() => handleSelectProgram(prog)}
              className="w-full bg-surface rounded-xl p-4 text-left active:bg-surface-light transition-colors border border-border"
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold">{prog.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  prog.type === 'strength' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {prog.type === 'strength' ? '스트렝스' : '근비대'}
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-2">{prog.description}</p>
              <div className="flex gap-3 text-xs text-text-secondary">
                <span>주 {prog.daysPerWeek}일</span>
                <span>{prog.durationWeeks}주</span>
                <span>{prog.exercises.length}종목</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 1RM 설정 화면
  if (setupMode) {
    return (
      <div className="p-4">
        <button onClick={() => { setSelectedProgram(null); setSetupMode(false); }} className="text-text-secondary text-sm mb-4">
          ← 프로그램 선택
        </button>
        <h1 className="text-2xl font-bold mb-1">{selectedProgram.name}</h1>
        <p className="text-sm text-text-secondary mb-4">각 종목의 1RM(최대 무게)을 입력하세요</p>

        <div className="space-y-3 mb-6">
          {selectedProgram.exercises.map((exName) => (
            <div key={exName} className="bg-surface rounded-xl p-4">
              <label className="text-sm font-medium mb-2 block">{exName}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={oneRepMaxes[exName] || ''}
                  onChange={(e) => setOneRepMaxes({ ...oneRepMaxes, [exName]: Math.max(0, Number(e.target.value)) })}
                  placeholder="1RM (kg)"
                  min="0"
                  className="flex-1 bg-surface-light rounded-lg px-4 py-2.5 text-text font-mono outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-text-secondary">kg</span>
                {prs?.[exName] && (
                  <button
                    onClick={() => setOneRepMaxes({ ...oneRepMaxes, [exName]: prs[exName] })}
                    className="text-[10px] px-2 py-1 bg-primary/20 text-primary-light rounded-full whitespace-nowrap"
                  >
                    PR: {prs[exName]}kg
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setSetupMode(false)}
          disabled={Object.values(oneRepMaxes).every((v) => !v)}
          className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl font-semibold transition-colors"
        >
          프로그램 시작
        </button>
      </div>
    );
  }

  const startDayWorkout = async (day: DayPlan) => {
    const allExercises = await db.exercises.toArray();
    const nameMap = new Map(allExercises.map((e) => [e.name, e.id!]));

    const exercises = day.exercises
      .map((ex, i) => {
        const cleanName = ex.exerciseName.replace(/\s*\(보조\)$/, '').replace(/\s*\(AMRAP\)$/, '');
        const id = nameMap.get(cleanName) || nameMap.get(ex.exerciseName);
        if (!id) return null;
        return {
          exerciseId: id,
          sets: ex.sets.length,
          order: i,
          setsDetail: ex.sets.map((s) => ({ weight: s.weight || 0, reps: s.reps })),
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    if (exercises.length > 0) {
      navigate('/workout', { state: { exercises, fromProgram: true } });
    }
  };

  // 주차별 플랜 화면
  const weekPlan: WeekPlan = selectedProgram.getWeekPlan(currentWeek, oneRepMaxes);

  return (
    <div className="p-4">
      <button onClick={() => { setSelectedProgram(null); setSetupMode(false); }} className="text-text-secondary text-sm mb-4">
        ← 프로그램 선택
      </button>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">{selectedProgram.name}</h1>
        <button
          onClick={() => setSetupMode(true)}
          className="text-xs text-primary-light"
        >
          1RM 수정
        </button>
      </div>

      {/* 주차 선택 */}
      <div className="flex items-center justify-between bg-surface rounded-xl p-3 mb-4">
        <button
          onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
          disabled={currentWeek <= 1}
          className="px-3 py-1 text-text-secondary disabled:opacity-30"
        >
          ◀
        </button>
        <div className="text-center">
          <div className="font-bold">{weekPlan.label}</div>
          <div className="text-xs text-text-secondary">
            {currentWeek} / {selectedProgram.durationWeeks}주
          </div>
        </div>
        <button
          onClick={() => setCurrentWeek(Math.min(selectedProgram.durationWeeks, currentWeek + 1))}
          disabled={currentWeek >= selectedProgram.durationWeeks}
          className="px-3 py-1 text-text-secondary disabled:opacity-30"
        >
          ▶
        </button>
      </div>

      {/* 주간 진행 바 */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: selectedProgram.durationWeeks }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i + 1 <= currentWeek ? 'bg-primary' : 'bg-surface-light'
            }`}
          />
        ))}
      </div>

      {/* 일별 플랜 */}
      <div className="space-y-3">
        {weekPlan.days.map((day, di) => (
          <div key={di} className="bg-surface rounded-xl p-4 border border-border">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">{day.label}</h3>
              <button
                onClick={() => startDayWorkout(day)}
                className="text-xs px-3 py-1.5 bg-primary text-white rounded-lg font-medium active:scale-95 transition-transform"
              >
                운동 시작
              </button>
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
                      <span className="flex-1 text-center font-mono font-semibold">
                        {set.weight ? `${set.weight}kg` : '-'}
                      </span>
                      <span className="flex-1 text-center text-text-secondary font-mono">
                        {set.percentage > 0 ? `${set.percentage}%` : '-'}
                      </span>
                      <span className="w-12 text-center font-mono">{set.reps}회</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
