import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  defaultTime: number;
  onClose: () => void;
}

export default function RestTimer({ defaultTime, onClose }: Props) {
  // endTime: 일시정지 아닐 때 만료 시각(epoch ms). 일시정지면 null.
  const [endTime, setEndTime] = useState<number | null>(() => Date.now() + defaultTime * 1000);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  const [notifyPerm, setNotifyPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const notifiedRef = useRef(false);

  const isPaused = pausedRemaining !== null;
  const isRunning = !isPaused && endTime !== null;

  const remaining = isPaused
    ? (pausedRemaining ?? 0)
    : endTime === null
      ? 0
      : Math.max(0, Math.ceil((endTime - now) / 1000));

  const isExpired = remaining === 0;

  const fireExpiry = useCallback(() => {
    if (notifiedRef.current) return;
    notifiedRef.current = true;
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('휴식 완료', {
          body: '다음 세트를 시작하세요',
          tag: 'rest-timer',
        });
      } catch {
        // 일부 브라우저는 SW 미등록 시 throw — 무시
      }
    }
  }, []);

  // 250ms 틱: Date.now() 기반이라 백그라운드 복귀 시에도 정확
  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [isRunning]);

  // 만료 1회 감지
  useEffect(() => {
    if (isRunning && remaining === 0) fireExpiry();
  }, [isRunning, remaining, fireExpiry]);

  // 백그라운드 → 포그라운드 복귀 시 즉시 갱신 (그 사이 만료된 경우 알림 보장)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const adjustTime = (delta: number) => {
    if (isPaused) {
      setPausedRemaining((prev) => Math.max(0, (prev ?? 0) + delta));
    } else if (endTime !== null) {
      const next = endTime + delta * 1000;
      setEndTime(Math.max(Date.now(), next));
      if (delta > 0) notifiedRef.current = false;
    }
  };

  const togglePause = () => {
    if (isPaused) {
      const r = pausedRemaining ?? 0;
      if (r === 0) {
        onClose();
        return;
      }
      setEndTime(Date.now() + r * 1000);
      setPausedRemaining(null);
      notifiedRef.current = false;
    } else {
      setPausedRemaining(remaining);
      setEndTime(null);
    }
  };

  const requestNotify = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const perm = await Notification.requestPermission();
      setNotifyPerm(perm);
    } catch {
      // 권한 요청 실패는 조용히 무시
    }
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = Math.max(0, Math.min(1, remaining / defaultTime));

  // 미니 바 모드
  if (!expanded) {
    return (
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[400px] z-40">
        <div className={`rounded-xl p-3 shadow-lg border ${
          isExpired ? 'bg-success/90 border-success' : 'bg-surface border-border'
        }`}>
          <div className="h-1 bg-surface-light rounded-full mb-2 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => adjustTime(-15)} className="px-2 py-1 text-xs text-text-secondary active:bg-surface-light rounded">-15</button>

            <button onClick={() => setExpanded(true)} className="flex items-center gap-2">
              <span className={`text-xl font-mono font-bold ${isExpired ? 'text-white' : ''}`}>
                {minutes}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-xs text-text-secondary">
                {isExpired ? '완료!' : isPaused ? '일시정지' : '휴식 중'}
              </span>
            </button>

            <div className="flex items-center gap-1">
              <button onClick={() => adjustTime(15)} className="px-2 py-1 text-xs text-text-secondary active:bg-surface-light rounded">+15</button>
              <button onClick={onClose} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                isExpired ? 'bg-white/20 text-white' : 'bg-primary text-white'
              }`}>
                {isExpired ? '다음' : '건너뛰기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 확대 모드
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setExpanded(false)}>
      <div className="bg-surface rounded-2xl p-8 w-full max-w-[350px] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-6">
          {isExpired ? '휴식 완료!' : '휴식 시간'}
        </h3>

        <div className="relative w-48 h-48 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#334155" strokeWidth="8" />
            <circle cx="100" cy="100" r={radius} fill="none"
              stroke={isExpired ? '#22C55E' : '#6366F1'} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300 ease-linear" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-mono font-bold">{minutes}:{String(seconds).padStart(2, '0')}</span>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <button onClick={() => adjustTime(-15)} className="px-4 py-2 bg-surface-light rounded-lg text-sm active:bg-border">-15초</button>
          <button onClick={togglePause} className="px-4 py-2 bg-surface-light rounded-lg text-sm active:bg-border">
            {isPaused ? '재개' : isExpired ? '종료' : '일시정지'}
          </button>
          <button onClick={() => adjustTime(15)} className="px-4 py-2 bg-surface-light rounded-lg text-sm active:bg-border">+15초</button>
        </div>

        {notifyPerm === 'default' && (
          <button onClick={requestNotify} className="mb-4 text-xs text-primary-light underline">
            🔔 화면 꺼져도 알림 받기
          </button>
        )}
        {notifyPerm === 'granted' && (
          <div className="mb-4 text-[10px] text-text-secondary">🔔 알림 켜짐</div>
        )}

        <button onClick={onClose}
          className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-colors">
          {isExpired ? '다음 세트' : '건너뛰기'}
        </button>
      </div>
    </div>
  );
}
