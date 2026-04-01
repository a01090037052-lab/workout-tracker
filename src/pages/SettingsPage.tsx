import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { MuscleGroup, EquipmentType } from '../types';

const muscleGroups: MuscleGroup[] = ['가슴', '등', '어깨', '이두', '삼두', '하체', '코어'];
const equipmentTypes: EquipmentType[] = ['바벨', '덤벨', '머신', '케이블', '맨몸'];

export default function SettingsPage() {
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // 백업
  const handleExport = async () => {
    const data = {
      exercises: await db.exercises.toArray(),
      sessions: await db.sessions.toArray(),
      routines: await db.routines.toArray(),
      personalRecords: await db.personalRecords.toArray(),
      injuryLogs: await db.injuryLogs.toArray(),
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('백업 파일 다운로드 완료!');
  };

  // 복원
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.sessions || !data.exercises) {
          showToast('유효하지 않은 백업 파일입니다');
          return;
        }

        // 기존 데이터 삭제 후 복원
        await db.sessions.clear();
        await db.routines.clear();
        await db.personalRecords.clear();
        await db.injuryLogs.clear();
        await db.exercises.clear();

        if (data.exercises?.length) await db.exercises.bulkAdd(data.exercises);
        if (data.sessions?.length) await db.sessions.bulkAdd(data.sessions);
        if (data.routines?.length) await db.routines.bulkAdd(data.routines);
        if (data.personalRecords?.length) await db.personalRecords.bulkAdd(data.personalRecords);
        if (data.injuryLogs?.length) await db.injuryLogs.bulkAdd(data.injuryLogs);

        showToast('데이터 복원 완료!');
      } catch {
        showToast('파일 읽기 실패');
      }
    };
    input.click();
  };

  // 전체 초기화
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const handleReset = async () => {
    await db.sessions.clear();
    await db.routines.clear();
    await db.personalRecords.clear();
    await db.injuryLogs.clear();
    setShowResetConfirm(false);
    showToast('모든 기록이 초기화되었습니다');
  };

  // 무게 추천 설정
  const [weightSuggestion, setWeightSuggestion] = useState(() =>
    localStorage.getItem('weightSuggestion') !== 'off'
  );
  const toggleWeightSuggestion = () => {
    const next = !weightSuggestion;
    setWeightSuggestion(next);
    localStorage.setItem('weightSuggestion', next ? 'on' : 'off');
    showToast(next ? '무게 추천 켜짐' : '무게 추천 꺼짐');
  };

  // 통계
  const sessionCount = useLiveQuery(() => db.sessions.count());
  const exerciseCount = useLiveQuery(() => db.exercises.count());
  const prCount = useLiveQuery(() => db.personalRecords.count());

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">설정</h1>

      {/* 데이터 현황 */}
      <section className="bg-surface rounded-xl p-4 mb-4">
        <h2 className="font-semibold mb-3">데이터 현황</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xl font-bold">{sessionCount ?? 0}</div>
            <div className="text-xs text-text-secondary">운동 기록</div>
          </div>
          <div>
            <div className="text-xl font-bold">{exerciseCount ?? 0}</div>
            <div className="text-xs text-text-secondary">운동 종목</div>
          </div>
          <div>
            <div className="text-xl font-bold">{prCount ?? 0}</div>
            <div className="text-xs text-text-secondary">PR 기록</div>
          </div>
        </div>
      </section>

      {/* 운동 설정 */}
      <section className="bg-surface rounded-xl p-4 mb-4">
        <h2 className="font-semibold mb-3">운동 설정</h2>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm">무게 추천</div>
            <div className="text-xs text-text-secondary">세트별 무게/횟수 추천 메시지 표시</div>
          </div>
          <button
            onClick={toggleWeightSuggestion}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              weightSuggestion ? 'bg-primary' : 'bg-surface-light'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${
              weightSuggestion ? 'right-1' : 'left-1'
            }`} />
          </button>
        </div>
      </section>

      {/* 커스텀 운동 추가 */}
      <section className="bg-surface rounded-xl p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">운동 종목 관리</h2>
          <button
            onClick={() => setShowAddExercise(true)}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm"
          >
            + 추가
          </button>
        </div>
        <p className="text-sm text-text-secondary">기본 {exerciseCount ?? 0}개 종목이 등록되어 있습니다</p>
      </section>

      {/* 데이터 관리 */}
      <section className="bg-surface rounded-xl p-4 mb-4">
        <h2 className="font-semibold mb-3">데이터 관리</h2>
        <div className="space-y-2">
          <button
            onClick={handleExport}
            className="w-full py-3 bg-surface-light rounded-lg text-sm text-left px-4 active:bg-border transition-colors"
          >
            📥 데이터 백업 (JSON 내보내기)
          </button>
          <button
            onClick={handleImport}
            className="w-full py-3 bg-surface-light rounded-lg text-sm text-left px-4 active:bg-border transition-colors"
          >
            📤 데이터 복원 (JSON 가져오기)
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-3 bg-danger/10 rounded-lg text-sm text-left px-4 text-danger active:bg-danger/20 transition-colors"
          >
            🗑️ 전체 기록 초기화
          </button>
        </div>
      </section>

      {/* 앱 정보 */}
      <section className="bg-surface rounded-xl p-4">
        <h2 className="font-semibold mb-2">앱 정보</h2>
        <p className="text-sm text-text-secondary">운동 기록 v1.0</p>
        <p className="text-xs text-text-secondary mt-1">데이터는 기기에 로컬로 저장됩니다</p>
      </section>

      {/* 커스텀 운동 추가 모달 */}
      {showAddExercise && (
        <AddExerciseModal
          onClose={() => setShowAddExercise(false)}
          onSaved={() => { setShowAddExercise(false); showToast('운동이 추가되었습니다'); }}
        />
      )}

      {/* 초기화 확인 */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-[350px]">
            <h3 className="text-lg font-bold mb-2">전체 초기화</h3>
            <p className="text-text-secondary text-sm mb-4">
              모든 운동 기록, 루틴, PR이 삭제됩니다. 되돌릴 수 없어요. 먼저 백업하세요!
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2.5 bg-surface-light rounded-lg text-sm">취소</button>
              <button onClick={handleReset} className="flex-1 py-2.5 bg-danger text-white rounded-lg text-sm font-semibold">초기화</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-surface-light px-4 py-2 rounded-lg text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// 커스텀 운동 추가 모달
function AddExerciseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('가슴');
  const [equipmentType, setEquipmentType] = useState<EquipmentType>('바벨');
  const [description, setDescription] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    await db.exercises.add({
      name: name.trim(),
      muscleGroup,
      secondaryMuscle: [],
      equipmentType,
      description,
      isCustom: true,
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">커스텀 운동 추가</h3>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-text-secondary mb-1 block">운동 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 인클라인 덤벨 컬"
              className="w-full bg-surface-light rounded-lg px-4 py-2.5 text-text placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary mb-1 block">근육군</label>
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map((g) => (
                <button
                  key={g}
                  onClick={() => setMuscleGroup(g)}
                  className={`px-3 py-1.5 rounded-full text-sm ${
                    muscleGroup === g ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-text-secondary mb-1 block">장비</label>
            <div className="flex flex-wrap gap-2">
              {equipmentTypes.map((e) => (
                <button
                  key={e}
                  onClick={() => setEquipmentType(e)}
                  className={`px-3 py-1.5 rounded-full text-sm ${
                    equipmentType === e ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-text-secondary mb-1 block">설명 (선택)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="간단한 설명"
              className="w-full bg-surface-light rounded-lg px-4 py-2.5 text-text placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full mt-4 py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl font-semibold transition-colors"
        >
          운동 추가
        </button>
      </div>
    </div>
  );
}
