import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  defaultTime: number;
  onClose: () => void;
}

export default function RestTimer({ defaultTime, onClose }: Props) {
  const [remaining, setRemaining] = useState(defaultTime);
  const [isRunning, setIsRunning] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
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
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, remaining, vibrate]);

  const adjustTime = (delta: number) => setRemaining((prev) => Math.max(0, prev + delta));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = remaining / defaultTime;

  // 미니 바 모드 (하단에 떠 있는 형태)
  if (!expanded) {
    return (
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[400px] z-40">
        <div className={`rounded-xl p-3 shadow-lg border ${
          remaining === 0 ? 'bg-success/90 border-success' : 'bg-surface border-border'
        }`}>
          {/* 프로그레스 바 */}
          <div className="h-1 bg-surface-light rounded-full mb-2 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progress * 100}%` }} />
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => adjustTime(-15)} className="px-2 py-1 text-xs text-text-secondary active:bg-surface-light rounded">-15</button>

            <button onClick={() => setExpanded(true)} className="flex items-center gap-2">
              <span className={`text-xl font-mono font-bold ${remaining === 0 ? 'text-white' : ''}`}>
                {minutes}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-xs text-text-secondary">{remaining === 0 ? '완료!' : '휴식 중'}</span>
            </button>

            <div className="flex items-center gap-1">
              <button onClick={() => adjustTime(15)} className="px-2 py-1 text-xs text-text-secondary active:bg-surface-light rounded">+15</button>
              <button onClick={onClose} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                remaining === 0 ? 'bg-white/20 text-white' : 'bg-primary text-white'
              }`}>
                {remaining === 0 ? '다음' : '건너뛰기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 확대 모드 (전체 화면)
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setExpanded(false)}>
      <div className="bg-surface rounded-2xl p-8 w-full max-w-[350px] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-6">
          {remaining === 0 ? '휴식 완료!' : '휴식 시간'}
        </h3>

        <div className="relative w-48 h-48 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#334155" strokeWidth="8" />
            <circle cx="100" cy="100" r={radius} fill="none"
              stroke={remaining === 0 ? '#22C55E' : '#6366F1'} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-mono font-bold">{minutes}:{String(seconds).padStart(2, '0')}</span>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button onClick={() => adjustTime(-15)} className="px-4 py-2 bg-surface-light rounded-lg text-sm active:bg-border">-15초</button>
          <button onClick={() => {
            if (isRunning) { setIsRunning(false); if (intervalRef.current) clearInterval(intervalRef.current); }
            else if (remaining > 0) setIsRunning(true);
          }} className="px-4 py-2 bg-surface-light rounded-lg text-sm active:bg-border">
            {isRunning ? '일시정지' : remaining === 0 ? '종료' : '재개'}
          </button>
          <button onClick={() => adjustTime(15)} className="px-4 py-2 bg-surface-light rounded-lg text-sm active:bg-border">+15초</button>
        </div>

        <button onClick={onClose}
          className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-colors">
          {remaining === 0 ? '다음 세트' : '건너뛰기'}
        </button>
      </div>
    </div>
  );
}
