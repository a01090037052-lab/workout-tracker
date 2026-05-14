import { Component, type ReactNode, type ErrorInfo } from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: ReactNode;
}

/**
 * 최상위 ErrorBoundary — React 트리에서 발생한 에러로 인한 빈 화면 방지.
 * 새로고침 버튼과 에러 메시지 제공.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center min-h-screen flex flex-col items-center justify-center">
          <div className="text-5xl mb-4">⚠</div>
          <h2 className="text-lg font-bold mb-2">화면을 표시할 수 없어요</h2>
          <p className="text-sm text-text-secondary mb-1">{this.state.error?.message || '알 수 없는 오류'}</p>
          <p className="text-[10px] text-text-secondary/70 mb-6">
            백그라운드 → 포그라운드 전환 직후 발생했다면 PWA 캐시 갱신 문제일 가능성이 있어요
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold mb-2"
          >새로고침</button>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-2 text-text-secondary text-sm"
          >에러 무시하고 계속</button>
        </div>
      );
    }
    return this.props.children;
  }
}
