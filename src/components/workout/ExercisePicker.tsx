import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { MuscleGroup } from '../../types';

const muscleGroups: MuscleGroup[] = ['가슴', '등', '어깨', '이두', '삼두', '하체', '코어'];

interface Props {
  onSelect: (exerciseId: number) => void;
  onClose: () => void;
}

export default function ExercisePicker({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);

  const exercises = useLiveQuery(() => {
    let query = db.exercises.toCollection();
    if (selectedGroup) {
      query = db.exercises.where('muscleGroup').equals(selectedGroup);
    }
    return query.toArray();
  }, [selectedGroup]);

  const filtered = exercises?.filter((ex) =>
    search ? ex.name.includes(search) : true
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl max-h-[85dvh] flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-lg font-bold">운동 추가</h2>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>

        {/* 검색 */}
        <div className="p-4 pb-2">
          <input
            type="text"
            placeholder="운동 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-light rounded-lg px-4 py-2.5 text-text placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 근육군 필터 */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedGroup(null)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              !selectedGroup ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'
            }`}
          >
            전체
          </button>
          {muscleGroups.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedGroup === group ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        {/* 운동 목록 */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filtered?.map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                onSelect(ex.id!);
                onClose();
              }}
              className="w-full text-left p-3 rounded-lg hover:bg-surface-light active:bg-surface-light transition-colors mb-1"
            >
              <div className="font-medium">{ex.name}</div>
              <div className="text-xs text-text-secondary mt-0.5">
                {ex.muscleGroup} · {ex.equipmentType}
              </div>
            </button>
          ))}
          {filtered?.length === 0 && (
            <div className="text-center text-text-secondary py-8">검색 결과가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}
