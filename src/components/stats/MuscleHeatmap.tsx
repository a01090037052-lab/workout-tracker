interface Props {
  volumes: Record<string, number>; // muscleGroup -> total volume
}

function getHeatColor(ratio: number): string {
  if (ratio <= 0) return '#334155';
  if (ratio < 0.2) return '#1e40af';
  if (ratio < 0.4) return '#2563eb';
  if (ratio < 0.6) return '#f59e0b';
  if (ratio < 0.8) return '#f97316';
  return '#ef4444';
}

export default function MuscleHeatmap({ volumes }: Props) {
  const maxVolume = Math.max(...Object.values(volumes), 1);
  const ratio = (group: string) => (volumes[group] || 0) / maxVolume;
  const color = (group: string) => getHeatColor(ratio(group));
  const vol = (group: string) => volumes[group] || 0;

  return (
    <div>
      {/* 범례 */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-[10px] text-text-secondary">낮음</span>
        <div className="flex gap-0.5">
          {['#334155', '#1e40af', '#2563eb', '#f59e0b', '#f97316', '#ef4444'].map((c) => (
            <div key={c} className="w-5 h-2.5 rounded-sm" style={{ background: c }} />
          ))}
        </div>
        <span className="text-[10px] text-text-secondary">높음</span>
      </div>

      <div className="flex gap-4 justify-center">
        {/* 전면 */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-text-secondary mb-2">전면</span>
          <svg viewBox="0 0 200 400" className="w-36 h-72">
            {/* 머리 */}
            <circle cx="100" cy="30" r="22" fill="#475569" stroke="#64748b" strokeWidth="1" />

            {/* 목 */}
            <rect x="90" y="52" width="20" height="15" rx="4" fill="#475569" />

            {/* 어깨 */}
            <ellipse cx="55" cy="80" rx="22" ry="16" fill={color('어깨')} />
            <ellipse cx="145" cy="80" rx="22" ry="16" fill={color('어깨')} />

            {/* 가슴 */}
            <path d="M65 75 Q100 65 135 75 L130 115 Q100 125 70 115 Z" fill={color('가슴')} />

            {/* 코어 */}
            <rect x="72" y="118" width="56" height="55" rx="6" fill={color('코어')} />

            {/* 이두 (전면) */}
            <rect x="33" y="90" width="22" height="55" rx="8" fill={color('이두')} />
            <rect x="145" y="90" width="22" height="55" rx="8" fill={color('이두')} />

            {/* 전완 */}
            <rect x="30" y="148" width="18" height="50" rx="6" fill="#475569" />
            <rect x="152" y="148" width="18" height="50" rx="6" fill="#475569" />

            {/* 하체 - 전면 허벅지 */}
            <rect x="62" y="178" width="32" height="75" rx="10" fill={color('하체')} />
            <rect x="106" y="178" width="32" height="75" rx="10" fill={color('하체')} />

            {/* 종아리 */}
            <rect x="66" y="258" width="24" height="60" rx="8" fill="#475569" />
            <rect x="110" y="258" width="24" height="60" rx="8" fill="#475569" />
          </svg>

          {/* 전면 라벨 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px]">
            <Label name="어깨" vol={vol('어깨')} color={color('어깨')} />
            <Label name="가슴" vol={vol('가슴')} color={color('가슴')} />
            <Label name="이두" vol={vol('이두')} color={color('이두')} />
            <Label name="코어" vol={vol('코어')} color={color('코어')} />
          </div>
        </div>

        {/* 후면 */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-text-secondary mb-2">후면</span>
          <svg viewBox="0 0 200 400" className="w-36 h-72">
            {/* 머리 */}
            <circle cx="100" cy="30" r="22" fill="#475569" stroke="#64748b" strokeWidth="1" />

            {/* 목 */}
            <rect x="90" y="52" width="20" height="15" rx="4" fill="#475569" />

            {/* 등 */}
            <path d="M65 72 Q100 62 135 72 L130 130 Q100 140 70 130 Z" fill={color('등')} />

            {/* 삼두 (후면) */}
            <rect x="33" y="90" width="22" height="55" rx="8" fill={color('삼두')} />
            <rect x="145" y="90" width="22" height="55" rx="8" fill={color('삼두')} />

            {/* 전완 */}
            <rect x="30" y="148" width="18" height="50" rx="6" fill="#475569" />
            <rect x="152" y="148" width="18" height="50" rx="6" fill="#475569" />

            {/* 허리/하부 등 */}
            <rect x="72" y="132" width="56" height="40" rx="6" fill={color('등')} opacity="0.7" />

            {/* 하체 - 후면 허벅지 */}
            <rect x="62" y="178" width="32" height="75" rx="10" fill={color('하체')} opacity="0.8" />
            <rect x="106" y="178" width="32" height="75" rx="10" fill={color('하체')} opacity="0.8" />

            {/* 종아리 */}
            <rect x="66" y="258" width="24" height="60" rx="8" fill="#475569" />
            <rect x="110" y="258" width="24" height="60" rx="8" fill="#475569" />
          </svg>

          {/* 후면 라벨 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px]">
            <Label name="등" vol={vol('등')} color={color('등')} />
            <Label name="삼두" vol={vol('삼두')} color={color('삼두')} />
            <Label name="하체" vol={vol('하체')} color={color('하체')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ name, vol, color }: { name: string; vol: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-text-secondary">{name}</span>
      <span className="text-text font-mono">{vol > 0 ? `${(vol / 1000).toFixed(1)}k` : '-'}</span>
    </div>
  );
}
