'use client';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { DEFAULT_SYMBOLS } from '@/src/domain/constants';

export default function BacktestPage() {
  const { t } = useLanguage();
  const [config, setConfig] = useState({
    symbol: 'BTCUSDT', timeframe: '15m', initialCapital: 10000,
    riskPerTradePct: 1, commissionPct: 0.05, strategies: ['EMA_CROSS', 'BB_SQUEEZE'],
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/quant/backtest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backtest failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = result ? [
    { label: 'Total Trades', value: result.totalTrades },
    { label: 'Win Rate', value: `${result.winRate}%`, color: result.winRate >= 50 ? 'var(--buy)' : 'var(--sell)' },
    { label: 'Total PnL', value: `$${result.totalPnl}`, color: result.totalPnl >= 0 ? 'var(--buy)' : 'var(--sell)' },
    { label: 'PnL %', value: `${result.totalPnlPct}%`, color: result.totalPnlPct >= 0 ? 'var(--buy)' : 'var(--sell)' },
    { label: 'Max Drawdown', value: `${result.maxDrawdown}%`, color: 'var(--sell)' },
    { label: 'Profit Factor', value: result.profitFactor, color: result.profitFactor >= 1.5 ? 'var(--buy)' : result.profitFactor >= 1 ? 'var(--neutral)' : 'var(--sell)' },
    { label: 'Sharpe Ratio', value: result.sharpeRatio },
    { label: 'Sortino Ratio', value: result.sortinoRatio },
    { label: 'Expectancy', value: `$${result.expectancy}` },
    { label: 'Best Trade', value: `$${result.bestTrade}`, color: 'var(--buy)' },
    { label: 'Worst Trade', value: `$${result.worstTrade}`, color: 'var(--sell)' },
    { label: 'Run Time', value: `${result.runDuration}ms` },
  ] : [];

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Backtesting Engine</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Symbol</label>
            <select value={config.symbol} onChange={e => setConfig({ ...config, symbol: e.target.value })}
              style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12 }}>
              {DEFAULT_SYMBOLS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Timeframe</label>
            <select value={config.timeframe} onChange={e => setConfig({ ...config, timeframe: e.target.value })}
              style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12 }}>
              {['1m','5m','15m','1h','4h','1d'].map(tf => <option key={tf}>{tf}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Capital ($)</label>
            <input type="number" value={config.initialCapital} onChange={e => setConfig({ ...config, initialCapital: +e.target.value })}
              style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Risk / Trade (%)</label>
            <input type="number" step="0.1" value={config.riskPerTradePct} onChange={e => setConfig({ ...config, riskPerTradePct: +e.target.value })}
              style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12 }} />
          </div>
        </div>

        <button onClick={handleRun} disabled={loading}
          style={{ padding: '7px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          {loading ? 'Running...' : '▶ Run Backtest'}
        </button>
        {error && <div style={{ marginTop: 8, color: 'var(--sell)', fontSize: 12 }}>Error: {error}</div>}
      </div>

      {result && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            {stats.map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: s.color || 'var(--text-primary)', fontFamily: 'monospace' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Equity Curve (mini) */}
          <div className="card">
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Equity Curve</div>
            <div style={{ overflowX: 'auto' }}>
              <svg width="100%" height="80" viewBox={`0 0 ${result.equityCurve.length} 80`} preserveAspectRatio="none">
                {(() => {
                  const pts = result.equityCurve;
                  if (pts.length < 2) return null;
                  const min = Math.min(...pts.map((p: any) => p.equity));
                  const max = Math.max(...pts.map((p: any) => p.equity));
                  const range = max - min || 1;
                  const d = pts.map((p: any, i: number) =>
                    `${i},${80 - ((p.equity - min) / range) * 70}`
                  ).join(' L ');
                  const color = pts[pts.length - 1].equity >= pts[0].equity ? '#26a69a' : '#ef5350';
                  return <polyline points={d.replace('L', 'M').replace(/ L /g, ' ')} fill="none" stroke={color} strokeWidth="1.5" />;
                })()}
              </svg>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
