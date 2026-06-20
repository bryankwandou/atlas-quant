'use client';
import React from 'react';

/**
 * ChartErrorBoundary — last line of defence against the "eternal white screen".
 *
 * lightweight-charts manipulates DOM/canvas imperatively; if its internal state ever
 * corrupts (bad data, race on symbol switch, disposed chart reused) a render-phase
 * throw would normally unmount the WHOLE React tree → blank page. This boundary catches
 * any error in the chart subtree, shows a recoverable fallback, and auto-remounts a
 * FRESH ChartContainer (new `key`) so corrupted chart state is discarded — never a
 * permanent blank. After `maxAutoRetries` it stops hammering and waits for a manual click.
 */
interface Props {
  children: React.ReactNode;
  label?: string;
  autoRetryMs?: number;
  maxAutoRetries?: number;
}
interface State { error: Error | null; retryKey: number; autoRetries: number; }

export default class ChartErrorBoundary extends React.Component<Props, State> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  state: State = { error: null, retryKey: 0, autoRetries: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log, never propagate — the app stays alive.
    console.error('[ATLAS] chart subtree crashed — recovering, not blanking the app:', error, info?.componentStack);
    const autoRetryMs = this.props.autoRetryMs ?? 1200;
    const maxAutoRetries = this.props.maxAutoRetries ?? 3;
    if (autoRetryMs > 0 && this.state.autoRetries < maxAutoRetries) {
      this.timer = setTimeout(() => this.recover(true), autoRetryMs);
    }
  }

  componentWillUnmount() { if (this.timer) clearTimeout(this.timer); }

  recover = (auto: boolean) => {
    this.setState((s) => ({
      error: null,
      retryKey: s.retryKey + 1,          // forces a fresh mount of children
      autoRetries: auto ? s.autoRetries + 1 : 0, // manual retry resets the counter
    }));
  };

  render() {
    const { error, retryKey, autoRetries } = this.state;
    if (error) {
      const exhausted = autoRetries >= (this.props.maxAutoRetries ?? 3);
      return (
        <div className="chart-crash-fallback">
          <div className="chart-crash-icon">⚠️</div>
          <div className="chart-crash-title">{this.props.label ?? 'Chart'} mengalami error</div>
          <div className="chart-crash-msg">{error.message || 'Render error tak terduga'}</div>
          {exhausted
            ? <button type="button" className="chart-crash-btn" onClick={() => this.recover(false)}>Muat ulang chart</button>
            : <div className="chart-crash-sub">Memulihkan otomatis…</div>}
        </div>
      );
    }
    return <React.Fragment key={retryKey}>{this.props.children}</React.Fragment>;
  }
}
