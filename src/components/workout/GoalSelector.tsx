import type { TrainingGoal } from '../../types';

interface Props {
  selected: TrainingGoal;
  onChange: (goal: TrainingGoal) => void;
}

const goals: { value: TrainingGoal; label: string; icon: string; desc: string }[] = [
  { value: 'hypertrophy', label: '근비대', icon: '🔥', desc: '8~12회 · 휴식 60~90초' },
  { value: 'strength', label: '스트렝스', icon: '💪', desc: '1~5회 · 휴식 3~5분' },
  { value: 'endurance', label: '근지구력', icon: '⚡', desc: '15~20회 · 휴식 30~60초' },
];

export default function GoalSelector({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 mb-4">
      {goals.map((g) => (
        <button
          key={g.value}
          onClick={() => onChange(g.value)}
          className={`flex-1 p-3 rounded-xl text-center transition-colors ${
            selected === g.value
              ? 'bg-primary/20 border-2 border-primary'
              : 'bg-surface border-2 border-transparent'
          }`}
        >
          <div className="text-lg">{g.icon}</div>
          <div className="text-sm font-semibold mt-1">{g.label}</div>
          <div className="text-[10px] text-text-secondary mt-0.5">{g.desc}</div>
        </button>
      ))}
    </div>
  );
}
