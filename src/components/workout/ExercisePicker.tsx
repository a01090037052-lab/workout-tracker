import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { MuscleGroup, EquipmentType } from '../../types';

// 근육군 → 부상 부위 매핑
const muscleToInjuryParts: Record<MuscleGroup, string[]> = {
  '가슴': ['가슴', '어깨'],
  '등': ['등', '허리'],
  '어깨': ['어깨', '목'],
  '이두': ['팔꿈치', '손목'],
  '삼두': ['팔꿈치', '손목'],
  '하체': ['무릎', '발목', '고관절', '허리'],
  '코어': ['허리'],
};

const muscleGroups: MuscleGroup[] = ['가슴', '등', '어깨', '이두', '삼두', '하체', '코어'];
const equipmentTypes: EquipmentType[] = ['바벨', '덤벨', '머신', '케이블', '맨몸'];

const muscleIcons: Record<MuscleGroup, string> = {
  '가슴': '🔴', '등': '🔵', '어깨': '🟠', '이두': '🟣',
  '삼두': '🩷', '하체': '🟢', '코어': '🩵',
};

interface Props {
  onSelect: (exerciseId: number) => void;
  onClose: () => void;
}

export default function ExercisePicker({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  const [selectedEquip, setSelectedEquip] = useState<EquipmentType | null>(null);

  const exercises = useLiveQuery(() => db.exercises.toArray(), []);

  // 미해결 부상 조회
  const activeInjuries = useLiveQuery(() =>
    db.injuryLogs.where('isResolved').equals(0).toArray()
  );

  const getInjuryWarning = (muscleGroup: MuscleGroup): string | null => {
    if (!activeInjuries || activeInjuries.length === 0) return null;
    const relatedParts = muscleToInjuryParts[muscleGroup] || [];
    const found = activeInjuries.find((inj) => relatedParts.includes(inj.bodyPart));
    if (found) return `⚠️ ${found.bodyPart} 통증 기록 있음 (${found.severity === 'severe' ? '심함' : found.severity === 'moderate' ? '보통' : '가벼움'})`;
    return null;
  };

  const filtered = exercises?.filter((ex) => {
    if (selectedGroup && ex.muscleGroup !== selectedGroup) return false;
    if (selectedEquip && ex.equipmentType !== selectedEquip) return false;
    if (search && !ex.name.includes(search)) return false;
    return true;
  });

  // 근육군별 그룹핑
  const grouped = new Map<string, typeof filtered>();
  if (filtered) {
    for (const ex of filtered) {
      const group = ex.muscleGroup;
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group)!.push(ex);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-surface w-full max-w-[430px] rounded-t-2xl max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 바 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="flex justify-between items-center px-4 pb-3">
          <h2 className="text-lg font-bold">운동 추가</h2>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>

        {/* 검색 */}
        <div className="px-4 pb-2">
          <input
            type="text"
            placeholder="운동 이름 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-light rounded-xl px-4 py-2.5 text-text placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 근육군 필터 */}
        <div className="px-4 pb-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedGroup(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                !selectedGroup ? 'bg-primary text-white shadow-sm' : 'bg-surface-light text-text-secondary active:scale-95'
              }`}
            >
              전체
            </button>
            {muscleGroups.map((group) => (
              <button
                key={group}
                onClick={() => setSelectedGroup(selectedGroup === group ? null : group)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedGroup === group ? 'bg-primary text-white shadow-sm' : 'bg-surface-light text-text-secondary active:scale-95'
                }`}
              >
                {muscleIcons[group]} {group}
              </button>
            ))}
          </div>
        </div>

        {/* 장비 필터 */}
        <div className="px-4 pb-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedEquip(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                !selectedEquip ? 'bg-primary/20 text-primary-light border border-primary/30' : 'bg-surface-light text-text-secondary active:scale-95'
              }`}
            >
              전체 장비
            </button>
            {equipmentTypes.map((equip) => (
              <button
                key={equip}
                onClick={() => setSelectedEquip(selectedEquip === equip ? null : equip)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedEquip === equip ? 'bg-primary/20 text-primary-light border border-primary/30' : 'bg-surface-light text-text-secondary active:scale-95'
                }`}
              >
                {equip}
              </button>
            ))}
          </div>
        </div>

        {/* 활성 필터 표시 */}
        {(selectedGroup || selectedEquip) && (
          <div className="px-4 pb-2 flex items-center gap-2">
            <span className="text-[10px] text-text-secondary">필터:</span>
            {selectedGroup && (
              <span className="text-[10px] bg-primary/20 text-primary-light px-2 py-0.5 rounded-full">
                {muscleIcons[selectedGroup]} {selectedGroup}
              </span>
            )}
            {selectedEquip && (
              <span className="text-[10px] bg-primary/20 text-primary-light px-2 py-0.5 rounded-full">
                {selectedEquip}
              </span>
            )}
            <button
              onClick={() => { setSelectedGroup(null); setSelectedEquip(null); }}
              className="text-[10px] text-text-secondary hover:text-danger ml-auto"
            >
              초기화
            </button>
          </div>
        )}

        {/* 운동 목록 */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {!selectedGroup && !search ? (
            // 근육군별 그룹 표시
            [...grouped.entries()].map(([group, exList]) => (
              <div key={group} className="mb-3">
                <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 px-1">
                  {muscleIcons[group as MuscleGroup]} {group}
                </div>
                {exList!.map((ex) => (
                  <ExerciseItem
                    key={ex.id}
                    name={ex.name}
                    equipmentType={ex.equipmentType}
                    description={ex.description}
                    guide={ex.guide}
                    tips={ex.tips}
                    injuryWarning={getInjuryWarning(ex.muscleGroup)}
                    onSelect={() => { onSelect(ex.id!); onClose(); }}
                  />
                ))}
              </div>
            ))
          ) : (
            // 필터/검색 결과
            filtered?.map((ex) => (
              <ExerciseItem
                key={ex.id}
                name={ex.name}
                equipmentType={ex.equipmentType}
                description={ex.description}
                guide={ex.guide}
                tips={ex.tips}
                injuryWarning={getInjuryWarning(ex.muscleGroup)}
                onSelect={() => { onSelect(ex.id!); onClose(); }}
              />
            ))
          )}
          {filtered?.length === 0 && (
            <div className="text-center py-12">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-text-secondary text-sm">검색 결과가 없습니다</p>
              {search && (
                <p className="text-text-secondary text-xs mt-1">다른 키워드로 검색해보세요</p>
              )}
            </div>
          )}
          <div className="text-center text-[10px] text-text-secondary pt-2">
            {filtered?.length || 0}개 종목
          </div>
        </div>
      </div>
    </div>
  );
}

function ExerciseItem({ name, equipmentType, description, guide, tips, injuryWarning, onSelect }: {
  name: string;
  equipmentType: string;
  description: string;
  guide?: string;
  tips?: string;
  injuryWarning?: string | null;
  onSelect: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="mb-0.5">
      <div className="flex items-center gap-1">
        <button
          onClick={onSelect}
          className="flex-1 text-left p-3 rounded-xl hover:bg-surface-light active:bg-surface-light active:scale-[0.98] transition-all"
        >
          <div className="flex justify-between items-start">
            <div className="font-medium text-sm">{name}</div>
            <span className="text-[10px] text-text-secondary bg-surface-light px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
              {equipmentType}
            </span>
          </div>
          {description && (
            <div className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">{description}</div>
          )}
          {injuryWarning && (
            <div className="text-[10px] text-warning mt-0.5">{injuryWarning}</div>
          )}
        </button>
        {(guide || tips) && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowDetail(!showDetail); }}
            className="w-8 h-8 flex items-center justify-center text-text-secondary/50 hover:text-primary text-xs rounded-lg"
          >
            ℹ️
          </button>
        )}
      </div>
      {showDetail && (
        <div className="mx-2 mb-2 p-3 bg-surface-light/50 rounded-lg text-xs text-text-secondary space-y-2">
          {guide && (
            <div>
              <div className="font-semibold text-text mb-1">수행 방법</div>
              <div className="whitespace-pre-line">{guide}</div>
            </div>
          )}
          {tips && (
            <div>
              <div className="font-semibold text-text mb-1">주의사항</div>
              <div className="whitespace-pre-line">{tips}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
