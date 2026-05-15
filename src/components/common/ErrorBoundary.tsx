import { Component, type ReactNode, type ErrorInfo } from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
  recoveryCount: number;
}

interface Props {
  children: ReactNode;
}

/**
 * 최상위 ErrorBoundary.
 * - visibility=visible 전환 시 자동 reset (백그라운드 → 포그라운드 흰 화면 자동 복구)
 * - 같은 세션에서 에러 재발 시 무한 loop 방지 (recoveryCount 3 초과 시 reload 요구)
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, recoveryCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidMount() {
    document.addEventListener('visibilitychange', this.handleVisibility);
    window.addEventListener('pageshow', this.handlePageShow);
  }

  componentWillUnmount() {
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('pageshow', this.handlePageShow);
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  /** 백그라운드 → 포그라운드 전환 시 자동 reset */
  handleVisibility = () => {
    if (document.visibilityState === 'visible' && this.state.hasError) {
      this.tryRecover();
    }
  };

  /** iOS Safari bfcache 복귀 처리 (pageshow.persisted=true) */
  handlePageShow = (e: PageTransitionEvent) => {
    if (e.persisted && this.state.hasError) {
      this.tryRecover();
    }
  };

  tryRecover = () => {
    // 같은 세션에서 3번 이상 자동 복구 실패 시 reload 강제
    if (this.state.recoveryCount >= 3) {
      window.location.reload();
      return;
    }
    this.setState((s) => ({ hasError: false, error: null, recoveryCount: s.recoveryCount + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center min-h-screen flex flex-col items-center justify-center">
          <div className="text-5xl mb-4">⚠</div>
          <h2 className="text-lg font-bold mb-2">화면 복구 중…</h2>
          <p className="text-sm text-text-secondary mb-1">{this.state.error?.message || '일시적 오류'}</p>
          <p className="text-[10px] text-text-secondary/70 mb-6">
            앱으로 다시 돌아오면 자동으로 복구를 시도합니다
          </p>
          <button
            onClick={this.tryRecover}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold mb-2"
          >지금 복구</button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 text-text-secondary text-sm"
          >전체 새로고침</button>
        </div>
      );
    }
    return this.props.children;
  }
}
