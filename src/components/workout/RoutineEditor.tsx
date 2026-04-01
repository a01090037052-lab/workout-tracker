import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Routine, MuscleGroup } from '../../types';

const muscleGroups: MuscleGroup[] = ['가슴', '등', '어깨', '이두', '삼두', '하체', '코어'];

interface Props {
  routine: Routine | null;
  onSave: (routine: Omit<Routine, 'id'> & { id?: number }) => void;
  onClose: () => void;
}

export default function RoutineEditor({ routine, onSave, onClose }: Props) {
  const [name, setName] = useState(routine?.name || '');
  const [selectedExercises, setSelectedExercises] = useState<{ exerciseId: number; sets: number; order: number }[]>(
    routine?.exercises || []
  );
  const [showPicker, setShowPicker] = useState(false);
  const [filterGroup, setFilterGroup] = useState<MuscleGroup | null>(null);
  const [search, setSearch] = useState('');

  const allExercises = useLiveQuery(() => {
    if (filterGroup) return db.exercises.where('muscleGroup').equals(filterGroup).toArray();
    return db.exercises.toArray();
  }, [filterGroup]);

  const selectedInfos = useLiveQuery(async () => {
    const ids = selectedExercises.map((e) => e.exerciseId);
    return db.exercises.where('id').anyOf(ids).toArray();
  }, [selectedExercises]);

  const filtered = allExercises?.filter((ex) => (search ? ex.name.includes(search) : true));

  const addExercise = (exerciseId: number) => {
    if (selectedExercises.some((e) => e.exerciseId === exerciseId)) return;
    setSelectedExercises((prev) => [
      ...prev,
      { exerciseId, sets: 3, order: prev.length },
    ]);
  };

  const removeExercise = (exerciseId: number) => {
    setSelectedExercises((prev) =>
      prev.filter((e) => e.exerciseId !== exerciseId).map((e, i) => ({ ...e, order: i }))
    );
  };

  const updateSets = (exerciseId: number, sets: number) => {
    setSelectedExercises((prev) =>
      prev.map((e) => (e.exerciseId === exerciseId ? { ...e, sets: Math.max(1, sets) } : e))
    );
  };

  const handleSave = () => {
    if (!name.trim() || selectedExercises.length === 0) return;
    onSave({
      ...(routine?.id ? { id: routine.id } : {}),
      name: name.trim(),
      exercises: selectedExercises,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl max-h-[90dvh] flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-lg font-bold">{routine ? '루틴 편집' : '새 루틴'}</h2>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* 루틴 이름 */}
          <input
            type="text"
            placeholder="루틴 이름 (예: 가슴+삼두)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-light rounded-lg px-4 py-3 text-text placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-primary mb-4"
          />

          {/* 선택된 운동 목록 */}
          {selectedExercises.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-text-secondary mb-2">선택한 운동</h3>
              {selectedExercises.map((se) => {
                const info = selectedInfos?.find((e) => e.id === se.exerciseId);
                return (
                  <div key={se.exerciseId} className="flex items-center justify-between bg-surface-light rounded-lg p-3 mb-2">
                    <div>
                      <span className="font-medium text-sm">{info?.name || '...'}</span>
                      <span className="text-xs text-text-secondary ml-2">{info?.muscleGroup}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateSets(se.exerciseId, se.sets - 1)}
                        className="w-7 h-7 bg-border rounded text-sm"
                      >-</button>
                      <span className="text-sm w-8 text-center">{se.sets}세트</span>
                      <button
                        onClick={() => updateSets(se.exerciseId, se.sets + 1)}
                        className="w-7 h-7 bg-border rounded text-sm"
                      >+</button>
                      <button
                        onClick={() => removeExercise(se.exerciseId)}
                        className="text-danger text-xs ml-2"
                      >✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 운동 추가 버튼 */}
          {!showPicker ? (
            <button
              onClick={() => setShowPicker(true)}
              className="w-full py-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:border-primary hover:text-primary transition-colors"
            >
              + 운동 추가
            </button>
          ) : (
            <div>
              {/* 검색 */}
              <input
                type="text"
                placeholder="운동 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-light rounded-lg px-4 py-2.5 text-text placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-primary mb-2"
              />

              {/* 근육군 필터 */}
              <div className="flex gap-2 overflow-x-auto mb-2 pb-1">
                <button
                  onClick={() => setFilterGroup(null)}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${!filterGroup ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'}`}
                >전체</button>
                {muscleGroups.map((g) => (
                  <button
                    key={g}
                    onClick={() => setFilterGroup(g)}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filterGroup === g ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'}`}
                  >{g}</button>
                ))}
              </div>

              {/* 운동 목록 */}
              <div className="max-h-48 overflow-y-auto">
                {filtered?.map((ex) => {
                  const isSelected = selectedExercises.some((se) => se.exerciseId === ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => !isSelected && addExercise(ex.id!)}
                      disabled={isSelected}
                      className={`w-full text-left p-2.5 rounded-lg mb-1 text-sm ${
                        isSelected ? 'opacity-40' : 'hover:bg-surface-light active:bg-surface-light'
                      }`}
                    >
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-xs text-text-secondary ml-2">{ex.muscleGroup} · {ex.equipmentType}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setShowPicker(false)}
                className="w-full mt-2 py-2 text-xs text-text-secondary"
              >
                접기
              </button>
            </div>
          )}
        </div>

        {/* 저장 버튼 */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={!name.trim() || selectedExercises.length === 0}
            className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl font-semibold transition-colors"
          >
            {routine ? '루틴 수정' : '루틴 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
