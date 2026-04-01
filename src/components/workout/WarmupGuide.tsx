interface Props {
  mainWeight: number;
  onApply: (sets: { weight: number; reps: number }[]) => void;
  onClose: () => void;
}

function generateWarmupSets(mainWeight: number): { weight: number; reps: number }[] {
  if (mainWeight <= 20) return [];

  const bar = 20;
  const sets: { weight: number; reps: number }[] = [];

  // 빈 바
  sets.push({ weight: bar, reps: 10 });

  // 50% 정도
  const mid = Math.round(mainWeight * 0.5 / 2.5) * 2.5;
  if (mid > bar) {
    sets.push({ weight: mid, reps: 8 });
  }

  // 75% 정도
  const high = Math.round(mainWeight * 0.75 / 2.5) * 2.5;
  if (high > mid && high < mainWeight) {
    sets.push({ weight: high, reps: 5 });
  }

  return sets;
}

export default function WarmupGuide({ mainWeight, onApply, onClose }: Props) {
  const warmupSets = generateWarmupSets(mainWeight);

  if (warmupSets.length === 0) {
    return null;
  }

  return (
    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-primary-light">💡 워밍업 추천 (본 세트: {mainWeight}kg)</span>
        <button onClick={onClose} className="text-xs text-text-secondary">닫기</button>
      </div>
      <div className="space-y-1 mb-2">
        {warmupSets.map((s, i) => (
          <div key={i} className="text-xs text-text-secondary">
            워밍업 {i + 1}: {s.weight}kg × {s.reps}회
          </div>
        ))}
      </div>
      <button
        onClick={() => onApply(warmupSets)}
        className="w-full py-1.5 bg-primary/20 text-primary-light rounded text-xs font-medium"
      >
        워밍업 세트 추가
      </button>
    </div>
  );
}
