'use client';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { DEFAULT_SYMBOLS } from '@/src/domain/constants';

function statCls(color?: string) {
  if (!color) return '';
  if (color.includes('buy') || color === '#26a69a') return 'up';
  if (color.includes('sell') || color === '#ef5350') return 'down';
  if (color.includes('neutral')) return 'neutral';
  return '';
}

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
    { label: 'Total Trades',   value: result.totalTrades,      color: undefined },
    { label: 'Win Rate',       value: `${result.winRate}%`,    color: result.winRate >= 50 ? 'var(--buy)' : 'var(--sell)' },
    { label: 'Total PnL',      value: `$${result.totalPnl}`,   color: result.totalPnl >= 0 ? 'var(--buy)' : 'var(--sell)' },
    { label: 'PnL %',          value: `${result.totalPnlPct}%`,color: result.totalPnlPct >= 0 ? 'var(--buy)' : 'var(--sell)' },
    { label: 'Max Drawdown',   value: `${result.maxDrawdown}%`,color: 'var(--sell)' },
    { label: 'Profit Factor',  value: result.profitFactor,     color: result.profitFactor >= 1.5 ? 'var(--buy)' : result.profitFactor >= 1 ? 'var(--neutral)' : 'var(--sell)' },
    { label: 'Sharpe Ratio',   value: result.sharpeRatio,      color: undefined },
    { label: 'Sortino Ratio',  value: result.sortinoRatio,     color: undefined },
    { label: 'Expectancy',     value: `$${result.expectancy}`, color: undefined },
    { label: 'Best Trade',     value: `$${result.bestTrade}`,  color: 'var(--buy)' },
    { label: 'Worst Trade',    value: `$${result.worstTrade}`, color: 'var(--sell)' },
    { label: 'Run Time',       value: `${result.runDuration}ms`,color: undefined },
  ] : [];

  return (
    <div className="page-wrap">
      <h1 className="page-title">Backtesting Engine</h1>

      <div className="card card-mb-lg">
        <div className="form-grid-3 card-mb">
          <div>
            <label htmlFor="bt-symbol" className="form-label">Symbol</label>
            <select id="bt-symbol" value={config.symbol} onChange={e => setConfig({ ...config, symbol: e.target.value })}
              className="form-input" title="Symbol">
              {DEFAULT_SYMBOLS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="bt-tf" className="form-label">Timeframe</label>
            <select id="bt-tf" value={config.timeframe} onChange={e => setConfig({ ...config, timeframe: e.target.value })}
              className="form-input" title="Timeframe">
              {['1m','5m','15m','1h','4h','1d'].map(tf => <option key={tf}>{tf}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="bt-capital" className="form-label">Capital ($)</label>
            <input id="bt-capital" type="number" value={config.initialCapital}
              onChange={e => setConfig({ ...config, initialCapital: +e.target.value })}
              className="form-input" title="Initial capital in USD" />
          </div>
          <div>
            <label htmlFor="bt-risk" className="form-label">Risk / Trade (%)</label>
            <input id="bt-risk" type="number" step="0.1" value={config.riskPerTradePct}
              onChange={e => setConfig({ ...config, riskPerTradePct: +e.target.value })}
              className="form-input" title="Risk per trade as percentage" />
          </div>
        </div>

        <button type="button" onClick={handleRun} disabled={loading} className="btn-primary-lg">
          {loading ? 'Running...' : '▶ Run Backtest'}
        </button>
        {error && <div className="error-msg">Error: {error}</div>}
      </div>

      {result && (
        <>
          <div className="stats-grid-4">
            {stats.map(s => (
              <div key={s.label} className="card stat-card">
                <div className="stat-label-sm">{s.label}</div>
                <div className={`stat-value mono ${statCls(s.color)}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">Equity Curve</div>
            <div className="equity-curve-wrap">
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
