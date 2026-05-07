import { useEffect, useRef } from 'react';

export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!('wakeLock' in navigator)) return;

    let cancelled = false;

    const acquire = async () => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;
      if (sentinelRef.current) return;
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        });
      } catch {
        // 배터리 부족·권한 거부 등은 조용히 무시
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [active]);
}
