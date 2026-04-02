import { useState } from 'react';

const DEFAULT_BAR = 20;
const DEFAULT_PLATES = [20, 15, 10, 5, 2.5];

function calculatePlates(targetWeight: number, barWeight: number, availablePlates: number[]): number[] {
  let remaining = (targetWeight - barWeight) / 2;
  if (remaining <= 0) return [];

  const plates: number[] = [];
  const sorted = [...availablePlates].sort((a, b) => b - a);

  for (const plate of sorted) {
    while (remaining >= plate) {
      plates.push(plate);
      remaining -= plate;
    }
  }
  return plates;
}

interface Props {
  onClose: () => void;
}

export default function PlateCalculator({ onClose }: Props) {
  const [targetWeight, setTargetWeight] = useState(60);

  const plates = calculatePlates(targetWeight, DEFAULT_BAR, DEFAULT_PLATES);
  const actualWeight = DEFAULT_BAR + plates.reduce((a, b) => a + b, 0) * 2;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl p-6 w-full max-w-[350px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">플레이트 계산기</h3>
          <button onClick={onClose} className="text-text-secondary text-2xl leading-none">&times;</button>
        </div>

        {/* 목표 무게 */}
        <div className="mb-4">
          <label className="text-sm text-text-secondary mb-1 block">목표 무게 (kg)</label>
          <input
            type="number"
            value={targetWeight}
            onChange={(e) => setTargetWeight(Number(e.target.value))}
            className="w-full bg-surface-light rounded-lg px-4 py-3 text-center text-xl font-bold outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 바벨 시각화 */}
        <div className="bg-surface-light rounded-xl p-4 mb-4">
          <div className="text-center text-sm text-text-secondary mb-3">
            바벨 ({DEFAULT_BAR}kg) + 양쪽:
          </div>
          {plates.length > 0 ? (
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {plates.map((plate, i) => (
                <span
                  key={i}
                  className="inline-flex items-center justify-center rounded-lg font-bold text-white text-xs"
                  style={{
                    background: plate >= 20 ? '#EF4444' : plate >= 10 ? '#3B82F6' : plate >= 5 ? '#22C55E' : '#F59E0B',
                    width: Math.max(36, plate * 2.5),
                    height: Math.max(28, plate * 2),
                    maxHeight: 48,
                  }}
                >
                  {plate}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-center text-text-secondary text-sm">빈 바벨</div>
          )}
          {actualWeight !== targetWeight && targetWeight > DEFAULT_BAR && (
            <div className="text-center text-xs text-warning mt-2">
              실제 무게: {actualWeight}kg (플레이트 조합 한계)
            </div>
          )}
        </div>

        {/* 빠른 선택 */}
        <div className="grid grid-cols-4 gap-2">
          {[40, 60, 80, 100, 120, 140, 160, 180].map((w) => (
            <button
              key={w}
              onClick={() => setTargetWeight(w)}
              className={`py-2 rounded-lg text-sm transition-colors ${
                targetWeight === w ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'
              }`}
            >
              {w}kg
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
