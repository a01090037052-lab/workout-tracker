import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Routine } from '../types';
import RoutineEditor from '../components/workout/RoutineEditor';

export default function RoutinePage() {
  const navigate = useNavigate();
  const [showEditor, setShowEditor] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  const routines = useLiveQuery(async () => {
    const all = await db.routines.toArray();
    return all.sort((a, b) => (b.lastUsed || '').localeCompare(a.lastUsed || ''));
  });

  const handleSave = async (routine: Omit<Routine, 'id'> & { id?: number }) => {
    if (routine.id) {
      await db.routines.update(routine.id, routine);
    } else {
      await db.routines.add(routine as Routine);
    }
    setShowEditor(false);
    setEditingRoutine(null);
  };

  const handleDelete = async (id: number) => {
    await db.routines.delete(id);
  };

  const handleStartWithRoutine = async (routine: Routine) => {
    // lastUsed 업데이트
    if (routine.id) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      await db.routines.update(routine.id, { lastUsed: dateStr });
    }
    navigate('/workout', { state: { routineId: routine.id, exercises: routine.exercises } });
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">루틴</h1>
        <button
          onClick={() => { setEditingRoutine(null); setShowEditor(true); }}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold"
        >
          + 새 루틴
        </button>
      </div>

      {routines && routines.length > 0 ? (
        <div className="space-y-3">
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onStart={() => handleStartWithRoutine(routine)}
              onEdit={() => { setEditingRoutine(routine); setShowEditor(true); }}
              onDelete={() => handleDelete(routine.id!)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-surface rounded-xl p-6 text-center text-text-secondary">
          저장된 루틴이 없어요. 루틴을 만들어보세요!
        </div>
      )}

      {showEditor && (
        <RoutineEditor
          routine={editingRoutine}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditingRoutine(null); }}
        />
      )}
    </div>
  );
}

function RoutineCard({
  routine,
  onStart,
  onEdit,
  onDelete,
}: {
  routine: Routine;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const exerciseInfos = useLiveQuery(async () => {
    const ids = routine.exercises.map((e) => e.exerciseId);
    return db.exercises.where('id').anyOf(ids).toArray();
  }, [routine.exercises]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="bg-surface rounded-xl p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{routine.name}</h3>
        <div className="flex gap-2">
          <button onClick={onEdit} className="text-xs text-text-secondary hover:text-primary">편집</button>
          <button onClick={() => setShowDeleteConfirm(true)} className="text-xs text-text-secondary hover:text-danger">삭제</button>
        </div>
      </div>

      <div className="text-sm text-text-secondary mb-3">
        {exerciseInfos?.map((ex) => ex.name).join(', ') || '운동 로딩 중...'}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs text-text-secondary">
          {routine.exercises.length}종목 · {routine.exercises.reduce((acc, e) => acc + e.sets, 0)}세트
        </span>
        <button
          onClick={onStart}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-colors"
        >
          시작하기
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="mt-3 p-3 bg-danger/10 rounded-lg flex justify-between items-center">
          <span className="text-sm text-danger">정말 삭제할까요?</span>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="text-xs px-3 py-1 bg-surface-light rounded">취소</button>
            <button onClick={onDelete} className="text-xs px-3 py-1 bg-danger text-white rounded">삭제</button>
          </div>
        </div>
      )}
    </div>
  );
}
