import { useState } from 'react';
import { db } from '../../db';
import type { InjuryLog } from '../../types';

const bodyParts = ['어깨', '팔꿈치', '손목', '허리', '무릎', '발목', '목', '가슴', '등', '고관절'];

interface Props {
  onClose: () => void;
}

export default function InjuryLogger({ onClose }: Props) {
  const [bodyPart, setBodyPart] = useState('');
  const [side, setSide] = useState<InjuryLog['side']>('both');
  const [severity, setSeverity] = useState<InjuryLog['severity']>('mild');
  const [note, setNote] = useState('');

  const handleSave = async () => {
    if (!bodyPart) return;
    await db.injuryLogs.add({
      date: new Date().toISOString().split('T')[0],
      bodyPart,
      side,
      severity,
      note,
      isResolved: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-surface w-full max-w-[430px] rounded-t-2xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">통증 기록</h3>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>

        {/* 부위 선택 */}
        <div className="mb-3">
          <label className="text-sm text-text-secondary mb-1 block">부위</label>
          <div className="flex flex-wrap gap-2">
            {bodyParts.map((part) => (
              <button
                key={part}
                onClick={() => setBodyPart(part)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  bodyPart === part ? 'bg-danger text-white' : 'bg-surface-light text-text-secondary'
                }`}
              >
                {part}
              </button>
            ))}
          </div>
        </div>

        {/* 좌우 */}
        <div className="mb-3">
          <label className="text-sm text-text-secondary mb-1 block">위치</label>
          <div className="flex gap-2">
            {([
              { value: 'left', label: '왼쪽' },
              { value: 'right', label: '오른쪽' },
              { value: 'both', label: '양쪽' },
              { value: 'center', label: '중앙' },
            ] as const).map((s) => (
              <button
                key={s.value}
                onClick={() => setSide(s.value)}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  side === s.value ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 강도 */}
        <div className="mb-3">
          <label className="text-sm text-text-secondary mb-1 block">통증 강도</label>
          <div className="flex gap-2">
            {([
              { value: 'mild', label: '가벼움', color: 'bg-yellow-500' },
              { value: 'moderate', label: '보통', color: 'bg-orange-500' },
              { value: 'severe', label: '심함', color: 'bg-red-500' },
            ] as const).map((s) => (
              <button
                key={s.value}
                onClick={() => setSeverity(s.value)}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  severity === s.value ? `${s.color} text-white` : 'bg-surface-light text-text-secondary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 메모 */}
        <div className="mb-4">
          <label className="text-sm text-text-secondary mb-1 block">메모</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 벤치프레스 4세트에서 느낌"
            className="w-full bg-surface-light rounded-lg px-4 py-2.5 text-text placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!bodyPart}
          className="w-full py-3 bg-danger hover:bg-red-600 disabled:opacity-40 text-white rounded-xl font-semibold transition-colors"
        >
          기록 저장
        </button>
      </div>
    </div>
  );
}
