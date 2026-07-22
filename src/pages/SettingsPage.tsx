import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { storage } from '../lib/storage';
import type { MuscleGroup, EquipmentType, Exercise } from '../types';

const muscleGroups: MuscleGroup[] = ['가슴', '등', '어깨', '이두', '삼두', '하체', '코어'];
const equipmentTypes: EquipmentType[] = ['바벨', '덤벨', '머신', '케이블', '맨몸'];

export default function SettingsPage() {
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
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
      bodyWeightLogs: await db.bodyWeightLogs.toArray(),
      dailyMacroLogs: await db.dailyMacroLogs.toArray(),
      conditionLogs: await db.conditionLogs.toArray(),
      foods: await db.foods.toArray(),
      goals: await db.goals.toArray(),
      mealTemplates: await db.mealTemplates.toArray(),
      settings: { weightSuggestion: storage.weightSuggestion.raw() },
      programProgress: storage.programProgress.exportAll(),
      nutritionProfile: storage.nutritionProfile.get(),
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    storage.lastBackupAt.setNow();
    storage.backupSnoozedUntil.clear();
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

        // Schema validate — 손상된 백업으로 사용자 데이터 깨지는 것 방지
        const checks: { ok: boolean; reason: string }[] = [
          { ok: !!data && typeof data === 'object', reason: '최상위 객체 누락' },
          { ok: Array.isArray(data?.sessions), reason: 'sessions 배열 누락' },
          { ok: Array.isArray(data?.exercises), reason: 'exercises 배열 누락' },
          { ok: !data?.sessions || data.sessions.every((s: { date?: unknown; exercises?: unknown }) =>
              typeof s.date === 'string' && Array.isArray(s.exercises)), reason: 'session 필드 형식 오류' },
          { ok: !data?.exercises || data.exercises.every((e: { name?: unknown }) =>
              typeof e.name === 'string'), reason: 'exercise 필드 형식 오류' },
          { ok: !data?.dailyMacroLogs || (Array.isArray(data.dailyMacroLogs) && data.dailyMacroLogs.every((l: { date?: unknown; entries?: unknown }) =>
              typeof l.date === 'string' && Array.isArray(l.entries))), reason: 'dailyMacroLogs 형식 오류' },
          { ok: !data?.foods || Array.isArray(data.foods), reason: 'foods 배열 형식 오류' },
        ];
        const failed = checks.find((c) => !c.ok);
        if (failed) {
          showToast(`유효하지 않은 백업: ${failed.reason}`);
          return;
        }

        // 가져오기는 기존 데이터를 전부 대체하는 파괴적 동작 → 명시적 확인
        // (초기화엔 확인이 있는데 가져오기엔 없어 실수로 덮어쓰는 위험이 있었음)
        if (!confirm(`현재 데이터를 모두 이 백업으로 대체합니다.\n(운동 ${data.sessions?.length || 0}건 · 종목 ${data.exercises?.length || 0}개)\n계속할까요?`)) {
          return;
        }

        // 안전한 복원: 기존 데이터 백업 후 시도, 실패 시 롤백
        const backup = {
          exercises: await db.exercises.toArray(),
          sessions: await db.sessions.toArray(),
          routines: await db.routines.toArray(),
          personalRecords: await db.personalRecords.toArray(),
          injuryLogs: await db.injuryLogs.toArray(),
          bodyWeightLogs: await db.bodyWeightLogs.toArray(),
          dailyMacroLogs: await db.dailyMacroLogs.toArray(),
          conditionLogs: await db.conditionLogs.toArray(),
          foods: await db.foods.toArray(),
          goals: await db.goals.toArray(),
          mealTemplates: await db.mealTemplates.toArray(),
        };

        try {
          await db.sessions.clear();
          await db.bodyWeightLogs.clear();
          await db.routines.clear();
          await db.personalRecords.clear();
          await db.injuryLogs.clear();
          await db.exercises.clear();
          await db.dailyMacroLogs.clear();
          await db.conditionLogs.clear();
          await db.foods.clear();
          await db.goals.clear();
          await db.mealTemplates.clear();

          if (data.exercises?.length) await db.exercises.bulkAdd(data.exercises);
          if (data.sessions?.length) await db.sessions.bulkAdd(data.sessions);
          if (data.routines?.length) await db.routines.bulkAdd(data.routines);
          if (data.personalRecords?.length) await db.personalRecords.bulkAdd(data.personalRecords);
          if (data.injuryLogs?.length) await db.injuryLogs.bulkAdd(data.injuryLogs);
          if (data.bodyWeightLogs?.length) await db.bodyWeightLogs.bulkAdd(data.bodyWeightLogs);
          if (data.dailyMacroLogs?.length) await db.dailyMacroLogs.bulkAdd(data.dailyMacroLogs);
          if (data.conditionLogs?.length) await db.conditionLogs.bulkAdd(data.conditionLogs);
          if (data.foods?.length) await db.foods.bulkAdd(data.foods);
          if (data.goals?.length) await db.goals.bulkAdd(data.goals);
          if (data.mealTemplates?.length) await db.mealTemplates.bulkAdd(data.mealTemplates);

          // settings 복원
          if (data.settings?.weightSuggestion) {
            storage.weightSuggestion.setRaw(data.settings.weightSuggestion);
          }
          // 프로그램 진행 상태 복원
          if (data.programProgress) {
            storage.programProgress.importAll(data.programProgress as Record<string, string>);
          }
          // 영양 프로필 복원
          if (data.nutritionProfile) {
            storage.nutritionProfile.set(data.nutritionProfile);
          }

          showToast(`복원 완료! (세션 ${data.sessions?.length || 0}개, 식단 ${data.dailyMacroLogs?.length || 0}일)`);
        } catch {
          // 롤백
          await db.exercises.clear();
          await db.sessions.clear();
          await db.routines.clear();
          await db.personalRecords.clear();
          await db.injuryLogs.clear();
          await db.bodyWeightLogs.clear();
          await db.dailyMacroLogs.clear();
          await db.conditionLogs.clear();
          await db.foods.clear();
          await db.goals.clear();
          await db.mealTemplates.clear();
          if (backup.exercises.length) await db.exercises.bulkAdd(backup.exercises);
          if (backup.sessions.length) await db.sessions.bulkAdd(backup.sessions);
          if (backup.routines.length) await db.routines.bulkAdd(backup.routines);
          if (backup.personalRecords.length) await db.personalRecords.bulkAdd(backup.personalRecords);
          if (backup.injuryLogs.length) await db.injuryLogs.bulkAdd(backup.injuryLogs);
          if (backup.bodyWeightLogs.length) await db.bodyWeightLogs.bulkAdd(backup.bodyWeightLogs);
          if (backup.dailyMacroLogs.length) await db.dailyMacroLogs.bulkAdd(backup.dailyMacroLogs);
          if (backup.conditionLogs.length) await db.conditionLogs.bulkAdd(backup.conditionLogs);
          if (backup.foods.length) await db.foods.bulkAdd(backup.foods);
          if (backup.goals.length) await db.goals.bulkAdd(backup.goals);
          if (backup.mealTemplates.length) await db.mealTemplates.bulkAdd(backup.mealTemplates);
          showToast('복원 실패. 기존 데이터를 유지합니다.');
        }
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
  const [weightSuggestion, setWeightSuggestion] = useState(() => storage.weightSuggestion.get());
  const toggleWeightSuggestion = () => {
    const next = !weightSuggestion;
    setWeightSuggestion(next);
    storage.weightSuggestion.set(next);
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

      {/* 커스텀 운동 관리 */}
      <section className="bg-surface rounded-xl p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">운동 종목 관리</h2>
          <button
            onClick={() => setShowAddExercise(true)}
            className="px-3 h-10 bg-primary text-white rounded-lg text-sm active:scale-95"
          >
            + 추가
          </button>
        </div>
        <CustomExerciseList
          onEdit={(ex) => setEditingExercise(ex)}
          onDeleted={(name) => showToast(`'${name}' 삭제됨`)}
        />
        <p className="text-xs text-text-secondary mt-2">전체 {exerciseCount ?? 0}개 종목 (기본 종목은 수정·삭제할 수 없어요)</p>
      </section>

      {/* 부상 이력 관리 */}
      <InjuryHistory />

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

      {/* 커스텀 운동 추가/수정 모달 */}
      {showAddExercise && (
        <AddExerciseModal
          onClose={() => setShowAddExercise(false)}
          onSaved={() => { setShowAddExercise(false); showToast('운동이 추가되었습니다'); }}
        />
      )}
      {editingExercise && (
        <AddExerciseModal
          editExercise={editingExercise}
          onClose={() => setEditingExercise(null)}
          onSaved={() => { setEditingExercise(null); showToast('운동이 수정되었습니다'); }}
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

// 커스텀 운동 목록 (수정·삭제). 기본 종목은 재설치로 복구되므로 관리 대상에서 제외.
function CustomExerciseList({ onEdit, onDeleted }: { onEdit: (ex: Exercise) => void; onDeleted: (name: string) => void }) {
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [usageMsg, setUsageMsg] = useState('');
  const [expanded, setExpanded] = useState(false);

  // isCustom은 boolean이라 인덱스 조회 불가 → toArray 후 필터
  const customExercises = useLiveQuery(async () => {
    try {
      const all = await db.exercises.toArray();
      return all.filter((e) => e.isCustom === true);
    } catch {
      return [];
    }
  }, []);

  // 삭제 전 이 종목이 과거 기록에서 쓰였는지 확인
  const startDelete = async (ex: Exercise) => {
    if (ex.id === undefined) return;
    let count = 0;
    try {
      const sessions = await db.sessions.toArray();
      count = sessions.filter((s) => s.exercises.some((e) => e.exerciseId === ex.id)).length;
    } catch { /* best-effort */ }
    setUsageMsg(count > 0
      ? `'${ex.name}'은(는) ${count}개 기록에서 사용 중이에요. 삭제하면 그 기록에서 '알 수 없는 운동'으로 표시됩니다.`
      : `'${ex.name}'을(를) 삭제할까요?`);
    setConfirmId(ex.id);
  };

  const confirmDelete = async (ex: Exercise) => {
    if (ex.id === undefined) return;
    await db.exercises.delete(ex.id);
    setConfirmId(null);
    onDeleted(ex.name);
  };

  if (!customExercises) return <p className="text-sm text-text-secondary">불러오는 중…</p>;
  if (customExercises.length === 0) {
    return <p className="text-sm text-text-secondary">직접 추가한 종목이 여기에 표시됩니다. 기본 종목은 수정·삭제할 수 없어요.</p>;
  }

  return (
    <div>
      {/* 접기/펴기 토글 (기본 접힘) */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between h-11 px-1 text-sm active:bg-surface-light rounded-lg"
      >
        <span className="font-medium">내 커스텀 종목 {customExercises.length}개</span>
        <span className={`text-text-secondary text-lg transition-transform ${expanded ? 'rotate-90' : ''}`}>›</span>
      </button>

      {expanded && (
    <div className="space-y-2 mt-2">
      {customExercises.map((ex) => (
        <div key={ex.id} className="bg-surface-light rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-sm font-medium">{ex.name}</span>
              <span className="text-xs text-text-secondary ml-2">{ex.muscleGroup} · {ex.equipmentType}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => onEdit(ex)} aria-label="수정"
                className="min-w-11 h-10 px-3 flex items-center justify-center text-sm text-text-secondary active:text-primary active:bg-surface rounded-lg">수정</button>
              <button onClick={() => startDelete(ex)} aria-label="삭제"
                className="min-w-11 h-10 px-3 flex items-center justify-center text-sm text-text-secondary active:text-danger active:bg-danger/10 rounded-lg">삭제</button>
            </div>
          </div>
          {confirmId === ex.id && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-danger mb-2">{usageMsg}</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmId(null)} className="flex-1 h-10 bg-surface rounded-lg text-sm">취소</button>
                <button onClick={() => confirmDelete(ex)} className="flex-1 h-10 bg-danger text-white rounded-lg text-sm font-semibold">삭제</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
      )}
    </div>
  );
}

// 커스텀 운동 추가/수정 모달 (editExercise가 있으면 수정 모드)
function AddExerciseModal({ onClose, onSaved, editExercise }: { onClose: () => void; onSaved: () => void; editExercise?: Exercise }) {
  const isEdit = !!editExercise;
  const [name, setName] = useState(editExercise?.name ?? '');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(editExercise?.muscleGroup ?? '가슴');
  const [equipmentType, setEquipmentType] = useState<EquipmentType>(editExercise?.equipmentType ?? '바벨');
  const [description, setDescription] = useState(editExercise?.description ?? '');

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isEdit && editExercise?.id !== undefined) {
      await db.exercises.update(editExercise.id, {
        name: name.trim(), muscleGroup, equipmentType, description,
      });
    } else {
      await db.exercises.add({
        name: name.trim(),
        muscleGroup,
        secondaryMuscle: [],
        equipmentType,
        description,
        isCustom: true,
      });
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{isEdit ? '운동 수정' : '커스텀 운동 추가'}</h3>
          <button onClick={onClose} aria-label="닫기" className="text-text-secondary text-2xl leading-none w-11 h-11 flex items-center justify-center -mr-2">&times;</button>
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
          className="w-full mt-4 py-3 bg-primary active:bg-primary-dark disabled:opacity-40 text-white rounded-xl font-semibold transition-colors"
        >
          {isEdit ? '저장' : '운동 추가'}
        </button>
      </div>
    </div>
  );
}

// 부상 이력 관리
function InjuryHistory() {
  const injuries = useLiveQuery(() => db.injuryLogs.orderBy('date').reverse().toArray());
  if (!injuries || injuries.length === 0) return null;

  const toggleResolved = async (id: number, current: boolean) => {
    await db.injuryLogs.update(id, { isResolved: !current });
  };

  const deleteInjury = async (id: number) => {
    await db.injuryLogs.delete(id);
  };

  const active = injuries.filter((i) => !i.isResolved);
  const resolved = injuries.filter((i) => i.isResolved);

  return (
    <section className="bg-surface rounded-xl p-4 mb-4">
      <h2 className="font-semibold mb-3">부상/통증 이력 ({active.length}건 진행 중)</h2>

      {active.length > 0 && (
        <div className="mb-3">
          {active.map((inj) => (
            <div key={inj.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    inj.severity === 'severe' ? 'bg-danger' : inj.severity === 'moderate' ? 'bg-warning' : 'bg-yellow-400'
                  }`} />
                  <span className="text-sm font-medium">{inj.bodyPart} ({inj.side === 'left' ? '왼쪽' : inj.side === 'right' ? '오른쪽' : inj.side === 'both' ? '양쪽' : '중앙'})</span>
                </div>
                <div className="text-xs text-text-secondary ml-4">{inj.date} {inj.note && `· ${inj.note}`}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleResolved(inj.id!, inj.isResolved)}
                  className="text-[10px] px-2 py-1 bg-success/20 text-success rounded">해결</button>
                <button onClick={() => deleteInjury(inj.id!)}
                  className="text-[10px] px-2 py-1 bg-danger/10 text-danger rounded">삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <details className="text-sm">
          <summary className="text-xs text-text-secondary cursor-pointer mb-2">해결된 이력 ({resolved.length}건)</summary>
          {resolved.map((inj) => (
            <div key={inj.id} className="flex items-center justify-between py-1.5 opacity-50">
              <div className="text-xs">
                <span className="line-through">{inj.bodyPart}</span>
                <span className="text-text-secondary ml-2">{inj.date}</span>
              </div>
              <button onClick={() => toggleResolved(inj.id!, inj.isResolved)}
                className="text-[10px] px-2 py-1 bg-surface-light rounded">재발</button>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
