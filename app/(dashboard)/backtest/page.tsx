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

  // ── T1MO Verify — audit sinyal T1MO historis (endpoint /api/backtest/verify) ──
  const [vResult, setVResult] = useState<any>(null);
  const [vLoading, setVLoading] = useState(false);
  const [vError, setVError] = useState('');
  const handleVerify = async () => {
    setVLoading(true); setVError(''); setVResult(null);
    try {
      const res = await fetch(`/api/backtest/verify?symbol=${config.symbol}&tf=${config.timeframe}&limit=1500&horizon=100`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verify failed');
      setVResult(data);
    } catch (e: any) { setVError(e.message); } finally { setVLoading(false); }
  };
  const fmtT = (ms: number) => new Date(ms).toISOString().replace('T', ' ').slice(0, 16);

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
    { label: 'Total Trades',  value: result.totalTrades,       color: undefined },
    { label: 'Win Rate',      value: `${result.winRate}%`,     color: result.winRate >= 50 ? 'var(--buy)' : 'var(--sell)' },
    { label: 'Total PnL',     value: `$${result.totalPnl}`,    color: result.totalPnl >= 0 ? 'var(--buy)' : 'var(--sell)' },
    { label: 'PnL %',         value: `${result.totalPnlPct}%`, color: result.totalPnlPct >= 0 ? 'var(--buy)' : 'var(--sell)' },
    { label: 'Max Drawdown',  value: `${result.maxDrawdown}%`, color: 'var(--sell)' },
    { label: 'Profit Factor', value: result.profitFactor,      color: result.profitFactor >= 1.5 ? 'var(--buy)' : result.profitFactor >= 1 ? 'var(--neutral)' : 'var(--sell)' },
    { label: 'Sharpe Ratio',  value: result.sharpeRatio,       color: undefined },
    { label: 'Sortino Ratio', value: result.sortinoRatio,      color: undefined },
    { label: 'Expectancy',    value: `$${result.expectancy}`,  color: undefined },
    { label: 'Best Trade',    value: `$${result.bestTrade}`,   color: 'var(--buy)' },
    { label: 'Worst Trade',   value: `$${result.worstTrade}`,  color: 'var(--sell)' },
    { label: 'Run Time',      value: `${result.runDuration}ms`,color: undefined },
  ] : [];

  return (
    <div className="panel-view">
      <div className="panel-header">
        <div className="panel-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span>Backtesting Engine</span>
        </div>
        <button type="button" onClick={handleRun} disabled={loading} className="panel-action-btn primary">
          {loading ? 'Running...' : '▶ Run Backtest'}
        </button>
      </div>

      <div className="panel-content">
        <div className="bt-config">
          <div className="bt-config-grid">
            <div className="bt-config-item">
              <label htmlFor="bt-symbol" className="bt-config-label">SYMBOL</label>
              <select id="bt-symbol" value={config.symbol}
                onChange={e => setConfig({ ...config, symbol: e.target.value })}
                className="bt-config-input" title="Symbol">
                {DEFAULT_SYMBOLS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="bt-config-item">
              <label htmlFor="bt-tf" className="bt-config-label">TIMEFRAME</label>
              <select id="bt-tf" value={config.timeframe}
                onChange={e => setConfig({ ...config, timeframe: e.target.value })}
                className="bt-config-input" title="Timeframe">
                {['1m','5m','15m','1h','4h','1d'].map(tf => <option key={tf}>{tf}</option>)}
              </select>
            </div>
            <div className="bt-config-item">
              <label htmlFor="bt-capital" className="bt-config-label">CAPITAL ($)</label>
              <input id="bt-capital" type="number" value={config.initialCapital}
                onChange={e => setConfig({ ...config, initialCapital: +e.target.value })}
                className="bt-config-input" title="Initial capital in USD" />
            </div>
            <div className="bt-config-item">
              <label htmlFor="bt-risk" className="bt-config-label">RISK / TRADE (%)</label>
              <input id="bt-risk" type="number" step="0.1" value={config.riskPerTradePct}
                onChange={e => setConfig({ ...config, riskPerTradePct: +e.target.value })}
                className="bt-config-input" title="Risk per trade as percentage" />
            </div>
          </div>
          {error && <div className="error-msg">{error}</div>}
        </div>

        {result && (
          <>
            <div className="bt-results-title">Results</div>
            <div className="bt-stats-grid">
              {stats.map(s => (
                <div key={s.label} className="bt-stat-card">
                  <div className={`bt-stat-val mono ${statCls(s.color)}`}>{s.value}</div>
                  <div className="bt-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bt-equity-curve">
              <div className="bt-equity-title">Equity Curve</div>
              <svg className="bt-equity-svg" viewBox={`0 0 ${result.equityCurve.length} 80`} preserveAspectRatio="none">
                {(() => {
                  const pts = result.equityCurve;
                  if (pts.length < 2) return null;
                  const min = Math.min(...pts.map((p: any) => p.equity));
                  const max = Math.max(...pts.map((p: any) => p.equity));
                  const range = max - min || 1;
                  const d = pts.map((p: any, i: number) =>
                    `${i},${80 - ((p.equity - min) / range) * 70}`
                  ).join(' L ');
                  const color = pts[pts.length - 1].equity >= pts[0].equity ? '#089981' : '#f23645';
                  return <polyline points={d.replace('L', 'M').replace(/ L /g, ' ')} fill="none" stroke={color} strokeWidth="1.5" />;
                })()}
              </svg>
            </div>
          </>
        )}

        {/* ── T1MO VERIFY — audit sinyal T1MO nyata, trade-per-trade ── */}
        <div className="bt-results-title" style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>T1MO Verify — audit sinyal historis</span>
          <button type="button" onClick={handleVerify} disabled={vLoading} className="panel-action-btn primary">
            {vLoading ? 'Auditing…' : '🔬 Audit T1MO'}
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: '#787b86', margin: '4px 0 10px' }}>
          Walk-forward di {config.symbol} · {config.timeframe}: classifier &amp; rencana ATR yang SAMA dengan chart/Arbiter
          (persistence 3 bar, cooldown 20, SL 1.5×ATR, TP 2.5×ATR, SL diprioritaskan bila ambigu). Setiap baris bisa
          dicocokkan bar-per-bar dengan chart — bukan angka janji.
        </div>
        {vError && <div className="error-msg">{vError}</div>}
        {vResult && (
          <>
            <div className="bt-stats-grid">
              {[
                { label: 'Trades',        value: vResult.metrics.totalTrades, color: undefined },
                { label: 'Win Rate',      value: `${vResult.metrics.winRatePct}%`, color: vResult.metrics.winRatePct >= 50 ? 'var(--buy)' : 'var(--sell)' },
                { label: 'Profit Factor', value: vResult.metrics.profitFactor, color: vResult.metrics.profitFactor >= 1 ? 'var(--buy)' : 'var(--sell)' },
                { label: 'Net R',         value: `${vResult.metrics.netR}R`, color: vResult.metrics.netR >= 0 ? 'var(--buy)' : 'var(--sell)' },
                { label: 'Expectancy',    value: `${vResult.metrics.expectancyR}R`, color: vResult.metrics.expectancyR >= 0 ? 'var(--buy)' : 'var(--sell)' },
                { label: 'Max DD',        value: `${vResult.metrics.maxDrawdownR}R`, color: 'var(--sell)' },
                { label: 'Avg Hold',      value: `${vResult.metrics.avgBarsHeld} bar`, color: undefined },
                { label: 'Periode',       value: `${fmtT(vResult.periodStart).slice(0, 10)} → ${fmtT(vResult.periodEnd).slice(0, 10)}`, color: undefined },
              ].map(s => (
                <div key={s.label} className="bt-stat-card">
                  <div className={`bt-stat-val mono ${statCls(s.color as any)}`}>{String(s.value)}</div>
                  <div className="bt-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, overflowX: 'auto' }}>
              <table className="mono" style={{ width: '100%', fontSize: 10.5, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#787b86', textAlign: 'right' }}>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Waktu Sinyal (UTC)</th>
                    <th style={{ textAlign: 'left' }}>Aksi</th>
                    <th>bullProb</th><th>Entry</th><th>SL</th><th>TP</th><th>Exit</th>
                    <th>Hasil</th><th>R</th><th>Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {vResult.trades.slice().reverse().map((t: any) => (
                    <tr key={t.idx} style={{ textAlign: 'right', borderTop: '1px solid rgba(120,123,134,0.12)' }}>
                      <td style={{ textAlign: 'left', padding: '3px 6px' }}>{fmtT(t.time)}</td>
                      <td style={{ textAlign: 'left', fontWeight: 700, color: t.action === 'BUY' ? '#089981' : '#f23645' }}>{t.action} · {t.badge}</td>
                      <td>{t.bullProb}</td><td>{t.entry}</td><td>{t.stopLoss}</td><td>{t.takeProfit}</td><td>{t.exitPrice}</td>
                      <td style={{ fontWeight: 700, color: t.result === 'WIN' ? '#089981' : t.result === 'LOSS' ? '#f23645' : '#787b86' }}>{t.result}</td>
                      <td style={{ color: t.rMultiple >= 0 ? '#089981' : '#f23645' }}>{t.rMultiple >= 0 ? '+' : ''}{t.rMultiple}</td>
                      <td>{t.barsHeld}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
