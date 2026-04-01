import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  defaultTime: number; // 초
  onClose: () => void;
}

export default function RestTimer({ defaultTime, onClose }: Props) {
  const [remaining, setRemaining] = useState(defaultTime);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<number | null>(null);

  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }, []);

  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            vibrate();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, remaining, vibrate]);

  const adjustTime = (delta: number) => {
    setRemaining((prev) => Math.max(0, prev + delta));
  };

  const progress = remaining / defaultTime;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  // 원형 프로그레스 바 계산
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-surface rounded-2xl p-8 w-full max-w-[350px] flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-6">
          {remaining === 0 ? '휴식 완료!' : '휴식 시간'}
        </h3>

        {/* 원형 타이머 */}
        <div className="relative w-48 h-48 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            {/* 배경 원 */}
            <circle
              cx="100" cy="100" r={radius}
              fill="none" stroke="#334155" strokeWidth="8"
            />
            {/* 프로그레스 원 */}
            <circle
              cx="100" cy="100" r={radius}
              fill="none"
              stroke={remaining === 0 ? '#22C55E' : '#6366F1'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          {/* 시간 표시 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-mono font-bold">
              {minutes}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* 시간 조절 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => adjustTime(-15)}
            className="px-4 py-2 bg-surface-light rounded-lg text-sm active:bg-border transition-colors"
          >
            -15초
          </button>
          <button
            onClick={() => {
              if (isRunning) {
                setIsRunning(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
              } else if (remaining > 0) {
                setIsRunning(true);
              }
            }}
            className="px-4 py-2 bg-surface-light rounded-lg text-sm active:bg-border transition-colors"
          >
            {isRunning ? '일시정지' : remaining === 0 ? '종료' : '재개'}
          </button>
          <button
            onClick={() => adjustTime(15)}
            className="px-4 py-2 bg-surface-light rounded-lg text-sm active:bg-border transition-colors"
          >
            +15초
          </button>
        </div>

        {/* 건너뛰기 */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-colors"
        >
          {remaining === 0 ? '다음 세트' : '건너뛰기'}
        </button>
      </div>
    </div>
  );
}
