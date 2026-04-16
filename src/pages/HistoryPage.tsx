import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatDateKr } from '../hooks/useLocalDate';
import { recalculatePRs } from '../hooks/useRecalculatePR';
import type { WorkoutSession, WorkoutExercise } from '../types';

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function SessionSets({ ex, isEditing, exIdx, updateSetField, removeSet }: {
  ex: any; isEditing: boolean; exIdx: number;
  updateSetField: (ei: number, si: number, f: 'weight' | 'reps', v: number) => void;
  removeSet: (ei: number, si: number) => void;
}) {
  const isBw = ex.info?.equipmentType === '맨몸';
  return (
    <div className="bg-surface-light rounded-lg overflow-hidden">
      <div className="flex px-3 py-1.5 text-xs text-text-secondary border-b border-border">
        <span className="w-10 text-center">세트</span>
        {!isBw && <span className="flex-1 text-center">무게</span>}
        <span className="flex-1 text-center">횟수</span>
        {!isEditing && !isBw && <span className="flex-1 text-center">볼륨</span>}
        {isEditing && <span className="w-10"></span>}
      </div>
      {(isEditing ? ex.sets : ex.sets.filter((s: any) => s.isCompleted)).map((set: any, setIdx: number) => (
        <div key={setIdx} className="flex px-3 py-2 text-sm border-b border-border last:border-b-0 items-center">
          <span className="w-10 text-center text-text-secondary font-mono">{set.setNumber}</span>
          {isEditing ? (
            <>
              {!isBw && <input type="number" inputMode="decimal"
                value={set.weight || ''} onChange={(e: any) => updateSetField(exIdx, setIdx, 'weight', Number(e.target.value))}
                className="flex-1 bg-surface rounded px-2 py-1 text-center font-mono outline-none focus:ring-1 focus:ring-primary mx-1" />}
              <input type="number" inputMode="numeric"
                value={set.reps || ''} onChange={(e: any) => updateSetField(exIdx, setIdx, 'reps', Number(e.target.value))}
                className="flex-1 bg-surface rounded px-2 py-1 text-center font-mono outline-none focus:ring-1 focus:ring-primary mx-1" />
              <button onClick={() => removeSet(exIdx, setIdx)} className="w-10 text-center text-danger/50 text-xs">✕</button>
            </>
          ) : isBw ? (
            <span className="flex-1 text-center font-semibold">{set.reps}회{set.weight > 0 ? ` (+${set.weight}kg)` : ''}</span>
          ) : (
            <>
              <span className="flex-1 text-center">{set.weight}kg</span>
              <span className="flex-1 text-center">{set.reps}회</span>
              <span className="flex-1 text-center text-text-secondary">{set.weight * set.reps}kg</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function SessionDetail({ session: initialSession, onClose }: { session: WorkoutSession; onClose: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editExercises, setEditExercises] = useState<WorkoutExercise[]>(initialSession.exercises);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState('');

  const exercises = useLiveQuery(async () => {
    const ids = editExercises.map((e) => e.exerciseId);
    const exList = await db.exercises.where('id').anyOf(ids).toArray();
    const map = new Map(exList.map((e) => [e.id!, e]));
    return editExercises.map((we) => ({ ...we, info: map.get(we.exerciseId) }));
  }, [editExercises]);

  const displayExercises = isEditing ? editExercises : initialSession.exercises;
  const totalVolume = displayExercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted && s.setType !== 'warmup').reduce((sum, s) => sum + s.weight * s.reps, 0), 0
  );
  const totalSets = displayExercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0);

  const handleSave = async () => {
    if (!initialSession.id) return;
    const validExercises = editExercises
      .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.isCompleted && s.reps > 0) }))
      .filter((ex) => ex.sets.length > 0);

    await db.sessions.update(initialSession.id, { exercises: validExercises });
    const exerciseIds = validExercises.map((e) => e.exerciseId);
    await recalculatePRs(exerciseIds);
    setIsEditing(false);
    setToast('저장 완료');
    setTimeout(() => setToast(''), 2000);
  };

  const handleDelete = async () => {
    if (!initialSession.id) return;
    const exerciseIds = initialSession.exercises.map((e) => e.exerciseId);
    await db.personalRecords.where('sessionId').equals(initialSession.id).delete();
    await db.sessions.delete(initialSession.id);
    await recalculatePRs(exerciseIds);
    onClose();
  };

  const updateSetField = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: number) => {
    setEditExercises((prev) => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: Math.max(0, value) } : s) };
    }));
  };

  const addSet = (exIdx: number) => {
    setEditExercises((prev) => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, {
        setNumber: ex.sets.length + 1, weight: lastSet?.weight || 0, reps: lastSet?.reps || 0,
        setType: 'normal', isCompleted: true, isPR: false,
      }]};
    }));
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setEditExercises((prev) => prev.map((ex, ei) => {
      if (ei !== exIdx || ex.sets.length <= 1) return ex;
      return { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx).map((s, i) => ({ ...s, setNumber: i + 1 })) };
    }));
  };

  const removeExercise = (exIdx: number) => {
    setEditExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl max-h-[85dvh] flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">{formatDateKr(initialSession.date)}</h2>
            <span className="text-xs text-text-secondary">
              {formatDuration(initialSession.duration)} · {totalSets}세트 · {totalVolume.toLocaleString()}kg
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button onClick={() => { setEditExercises(initialSession.exercises); setIsEditing(false); }}
                  className="text-xs px-3 py-1.5 bg-surface-light rounded-lg">취소</button>
                <button onClick={handleSave}
                  className="text-xs px-3 py-1.5 bg-primary text-white rounded-lg font-medium">저장</button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)}
                className="text-xs px-3 py-1.5 bg-primary/10 text-primary-light rounded-lg">편집</button>
            )}
            <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
          </div>
        </div>

        {/* 운동 상세 */}
        <div className="flex-1 overflow-y-auto p-4">
          {exercises?.map((ex, exIdx) => (
            <div key={exIdx} className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">
                  {ex.info?.name || '알 수 없는 운동'}
                  <span className="text-xs text-text-secondary ml-2">{ex.info?.muscleGroup}</span>
                </h3>
                {isEditing && (
                  <button onClick={() => removeExercise(exIdx)} className="text-xs text-danger">종목 삭제</button>
                )}
              </div>
              <SessionSets ex={ex} isEditing={isEditing} exIdx={exIdx}
                updateSetField={updateSetField} removeSet={removeSet} />
              {isEditing && (
                <button onClick={() => addSet(exIdx)}
                  className="w-full mt-1 py-2 text-xs text-primary-light hover:bg-primary/10 rounded-lg">+ 세트 추가</button>
              )}
            </div>
          ))}
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 border-t border-border">
          {!isEditing && (
            <>
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 text-danger bg-danger/10 rounded-lg text-sm">기록 삭제</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 bg-surface-light rounded-lg text-sm">취소</button>
                  <button onClick={handleDelete}
                    className="flex-1 py-2.5 bg-danger text-white rounded-lg text-sm font-semibold">삭제 확인</button>
                </div>
              )}
            </>
          )}
        </div>

        {toast && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-success/90 text-white px-4 py-2 rounded-lg text-sm z-[60]">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterExerciseId, setFilterExerciseId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const exercises = useLiveQuery(() => db.exercises.toArray());

  const sessions = useLiveQuery(async () => {
    const all = await db.sessions.orderBy('date').reverse().toArray();
    let filtered = all.filter((s) => s.date.startsWith(selectedMonth));
    if (selectedDate) filtered = filtered.filter((s) => s.date === selectedDate);
    if (filterExerciseId) filtered = filtered.filter((s) => s.exercises.some((e) => e.exerciseId === filterExerciseId));
    return filtered;
  }, [selectedMonth, filterExerciseId, selectedDate]);

  const allSessions = useLiveQuery(() => db.sessions.orderBy('date').reverse().toArray());

  const usedExerciseIds = new Set(allSessions?.flatMap((s) => s.exercises.map((e) => e.exerciseId)) || []);
  const usedExercises = exercises?.filter((e) => usedExerciseIds.has(e.id!)) || [];

  // 검색 필터
  const filteredUsedExercises = searchText
    ? usedExercises.filter((e) => e.name.includes(searchText))
    : usedExercises;

  const changeMonth = (delta: number) => {
    setSelectedDate(null);
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const [year, month] = selectedMonth.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const workoutDates = new Set(sessions?.map((s) => Number(s.date.split('-')[2])));

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">기록</h1>

      {/* 검색 */}
      <div className="mb-3">
        <input
          type="text"
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); if (e.target.value) setFilterExerciseId(null); }}
          placeholder="종목 검색..."
          className="w-full bg-surface rounded-lg px-4 py-2.5 text-text placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-primary text-sm"
        />
      </div>

      {/* 종목별 히스토리 (검색 시) */}
      {searchText && filteredUsedExercises.length > 0 && (
        <div className="mb-4 space-y-2">
          {filteredUsedExercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => { setFilterExerciseId(ex.id!); setSearchText(''); }}
              className="w-full bg-surface rounded-xl p-3 text-left active:bg-surface-light"
            >
              <span className="font-medium text-sm">{ex.name}</span>
              <span className="text-xs text-text-secondary ml-2">{ex.muscleGroup} · {ex.equipmentType}</span>
            </button>
          ))}
        </div>
      )}

      {/* 월 선택 */}
      {!searchText && (
        <>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="px-3 py-1 text-text-secondary">&lt;</button>
            <span className="font-semibold">{year}년 {month}월</span>
            <button onClick={() => changeMonth(1)} className="px-3 py-1 text-text-secondary">&gt;</button>
          </div>

          {/* 캘린더 */}
          <div className="bg-surface rounded-xl p-4 mb-4">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-secondary mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {Array.from({ length: firstDay }, (_, i) => <span key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const hasWorkout = workoutDates.has(day);
                const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                return (
                  <button
                    key={day}
                    onClick={() => {
                      if (!hasWorkout) return;
                      setSelectedDate(selectedDate === dateStr ? null : dateStr);
                    }}
                    className={`py-1.5 rounded-lg transition-all ${
                      hasWorkout
                        ? selectedDate === dateStr
                          ? 'bg-primary text-white font-semibold ring-2 ring-primary-light scale-110'
                          : 'bg-primary text-white font-semibold active:scale-95'
                        : 'text-text-secondary'
                    }`}
                  >{day}</button>
                );
              })}
            </div>
          </div>

          {/* 활성 필터 표시 */}
          {(filterExerciseId || selectedDate) && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-text-secondary">필터:</span>
              {filterExerciseId && (
                <span className="text-[10px] bg-primary/20 text-primary-light px-2 py-0.5 rounded-full">
                  {exercises?.find((e) => e.id === filterExerciseId)?.name}
                </span>
              )}
              {selectedDate && (
                <span className="text-[10px] bg-primary/20 text-primary-light px-2 py-0.5 rounded-full">
                  {formatDateKr(selectedDate)}
                </span>
              )}
              <button onClick={() => { setFilterExerciseId(null); setSelectedDate(null); }}
                className="text-[10px] text-text-secondary ml-auto">초기화</button>
            </div>
          )}

          {/* 종목 필터 */}
          {usedExercises.length > 0 && (
            <div className="mb-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                <button onClick={() => setFilterExerciseId(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    !filterExerciseId ? 'bg-primary text-white' : 'bg-surface text-text-secondary'
                  }`}>전체</button>
                {usedExercises.slice(0, 10).map((ex) => (
                  <button key={ex.id}
                    onClick={() => setFilterExerciseId(filterExerciseId === ex.id! ? null : ex.id!)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      filterExerciseId === ex.id! ? 'bg-primary text-white' : 'bg-surface text-text-secondary'
                    }`}>{ex.name}</button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 기록 리스트 */}
      <div className="space-y-2">
        {sessions && sessions.length > 0 ? (
          sessions.map((session) => {
            const sets = session.exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0);
            const vol = session.exercises.reduce((acc, ex) =>
              acc + ex.sets.filter((s) => s.isCompleted && s.setType !== 'warmup').reduce((sum, s) => sum + s.weight * s.reps, 0), 0);
            return (
              <button key={session.id}
                onClick={() => setSelectedSession(session)}
                className="w-full bg-surface rounded-xl p-4 text-left active:bg-surface-light transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{formatDateKr(session.date)}</span>
                  <span className="text-xs text-text-secondary bg-surface-light px-2 py-0.5 rounded-full">{formatDuration(session.duration)}</span>
                </div>
                <div className="text-sm text-text-secondary">
                  {session.exercises.length}종목 · {sets}세트 · {vol.toLocaleString()}kg
                </div>
              </button>
            );
          })
        ) : (
          <div className="bg-surface rounded-xl p-6 text-center text-text-secondary">
            {searchText ? '검색 결과가 없어요' : '이 달의 기록이 없어요'}
          </div>
        )}
      </div>

      {selectedSession && (
        <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}
