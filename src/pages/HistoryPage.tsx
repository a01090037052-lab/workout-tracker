import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { WorkoutSession } from '../types';

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function SessionDetail({ session, onClose }: { session: WorkoutSession; onClose: () => void }) {
  const exercises = useLiveQuery(async () => {
    const ids = session.exercises.map((e) => e.exerciseId);
    const exList = await db.exercises.where('id').anyOf(ids).toArray();
    const map = new Map(exList.map((e) => [e.id!, e]));
    return session.exercises.map((we) => ({
      ...we,
      info: map.get(we.exerciseId),
    }));
  }, [session]);

  const totalVolume = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).reduce((sum, s) => sum + s.weight * s.reps, 0),
    0
  );
  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl max-h-[85dvh] flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">{session.date}</h2>
            <span className="text-xs text-text-secondary">
              {formatDuration(session.duration)} · {totalSets}세트 · {totalVolume.toLocaleString()}kg
            </span>
          </div>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>

        {/* 운동 상세 */}
        <div className="flex-1 overflow-y-auto p-4">
          {exercises?.map((ex, i) => (
            <div key={i} className="mb-4">
              <h3 className="font-semibold mb-2">
                {ex.info?.name || '알 수 없는 운동'}
                <span className="text-xs text-text-secondary ml-2">{ex.info?.muscleGroup}</span>
              </h3>
              <div className="bg-surface-light rounded-lg overflow-hidden">
                {/* 헤더 */}
                <div className="flex px-3 py-1.5 text-xs text-text-secondary border-b border-border">
                  <span className="w-12 text-center">세트</span>
                  <span className="flex-1 text-center">무게</span>
                  <span className="flex-1 text-center">횟수</span>
                  <span className="flex-1 text-center">볼륨</span>
                </div>
                {ex.sets.filter((s) => s.isCompleted).map((set, j) => (
                  <div key={j} className="flex px-3 py-2 text-sm border-b border-border last:border-b-0">
                    <span className="w-12 text-center text-text-secondary">{set.setNumber}</span>
                    <span className="flex-1 text-center">{set.weight}kg</span>
                    <span className="flex-1 text-center">{set.reps}회</span>
                    <span className="flex-1 text-center text-text-secondary">{set.weight * set.reps}kg</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 삭제 버튼 */}
        <div className="p-4 border-t border-border">
          <button
            onClick={async () => {
              if (session.id) {
                // 관련 PR도 삭제
                await db.personalRecords.where('sessionId').equals(session.id).delete();
                await db.sessions.delete(session.id);
                onClose();
              }
            }}
            className="w-full py-2.5 text-danger bg-danger/10 rounded-lg text-sm"
          >
            기록 삭제
          </button>
        </div>
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

  const sessions = useLiveQuery(async () => {
    const all = await db.sessions.orderBy('date').reverse().toArray();
    return all.filter((s) => s.date.startsWith(selectedMonth));
  }, [selectedMonth]);

  const allSessions = useLiveQuery(() => db.sessions.orderBy('date').reverse().toArray());

  // 사용 가능한 월 목록
  const months = [...new Set(allSessions?.map((s) => s.date.substring(0, 7)) || [])].sort().reverse();
  if (!months.includes(selectedMonth)) months.unshift(selectedMonth);

  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // 캘린더 데이터
  const [year, month] = selectedMonth.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const workoutDates = new Set(sessions?.map((s) => Number(s.date.split('-')[2])));

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">기록</h1>

      {/* 월 선택 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeMonth(-1)} className="px-3 py-1 text-text-secondary">&lt;</button>
        <span className="font-semibold">{year}년 {month}월</span>
        <button onClick={() => changeMonth(1)} className="px-3 py-1 text-text-secondary">&gt;</button>
      </div>

      {/* 캘린더 */}
      <div className="bg-surface rounded-xl p-4 mb-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-secondary mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {Array.from({ length: firstDay }, (_, i) => (
            <span key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const hasWorkout = workoutDates.has(day);
            return (
              <span
                key={day}
                className={`py-1.5 rounded-lg ${
                  hasWorkout ? 'bg-primary text-white font-semibold' : 'text-text-secondary'
                }`}
              >
                {day}
              </span>
            );
          })}
        </div>
      </div>

      {/* 기록 리스트 */}
      <div className="space-y-2">
        {sessions && sessions.length > 0 ? (
          sessions.map((session) => {
            const totalSets = session.exercises.reduce(
              (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0
            );
            const totalVolume = session.exercises.reduce(
              (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).reduce((sum, s) => sum + s.weight * s.reps, 0), 0
            );
            return (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="w-full bg-surface rounded-xl p-4 text-left active:bg-surface-light transition-colors"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{session.date}</span>
                  <span className="text-xs text-text-secondary">{formatDuration(session.duration)}</span>
                </div>
                <div className="text-sm text-text-secondary">
                  {session.exercises.length}종목 · {totalSets}세트 · {totalVolume.toLocaleString()}kg
                </div>
              </button>
            );
          })
        ) : (
          <div className="bg-surface rounded-xl p-6 text-center text-text-secondary">
            이 달의 기록이 없어요
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      {selectedSession && (
        <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}
