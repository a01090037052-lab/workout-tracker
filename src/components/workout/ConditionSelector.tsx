import type { Condition } from '../../types';

interface Props {
  selected: Condition;
  onChange: (condition: Condition) => void;
}

const conditions: { value: Condition; label: string; icon: string; desc: string }[] = [
  { value: 'good', label: '좋음', icon: '🟢', desc: '기본 추천 유지' },
  { value: 'normal', label: '보통', icon: '🟡', desc: '기본 추천 유지' },
  { value: 'tired', label: '피곤함', icon: '🔴', desc: '무게 -5~10%' },
];

export default function ConditionSelector({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 mb-3">
      {conditions.map((c) => (
        <button
          key={c.value}
          onClick={() => onChange(c.value)}
          className={`flex-1 py-2 px-2 rounded-lg text-center transition-colors ${
            selected === c.value
              ? 'bg-surface-light border-2 border-primary'
              : 'bg-surface border-2 border-transparent'
          }`}
        >
          <span className="text-sm">{c.icon}</span>
          <span className="text-xs ml-1">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
