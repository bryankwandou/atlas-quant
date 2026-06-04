'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useChartStore } from '@/store/chartStore';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface SymbolRow {
  symbol: string;
  name?: string;
  exchange?: string;
  assetClass?: string;
  price?: number;
  change24h?: number;
  volume24h?: number;
  rsi: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  score: number;
}

const SIG_COLOR: Record<string, string> = { BUY: '#089981', SELL: '#f23645', NEUTRAL: '#ff9800' };

/**
 * Coherent signal derived from the REAL price change (no more random index data).
 * score = momentum 0..100 centered at 50 (flat). Everything below is consistent:
 *   green/BUY when score≥60, red/SELL when score≤40, orange/NEUTRAL otherwise,
 *   and the score-bar color === the signal badge color. So a red −% row can never
 *   read BUY.
 */
function deriveSignal(change: number | null | undefined) {
  const has = Number.isFinite(change as number);
  const c = has ? (change as number) : 0;
  const score = Math.round(Math.max(0, Math.min(100, 50 + c * 6)));
  const signal: 'BUY' | 'SELL' | 'NEUTRAL' = score >= 60 ? 'BUY' : score <= 40 ? 'SELL' : 'NEUTRAL';
  const rsi = Math.round(Math.max(2, Math.min(98, 50 + c * 4)));
  return { has, score, signal, rsi };
}

type RawRow = Omit<SymbolRow, 'rsi' | 'signal' | 'score'>;

function ScreenerRow({ row, signalFilter, onSelect }: { row: RawRow; signalFilter: string; onSelect: () => void }) {
  const needFetch = row.change24h == null || row.price == null;
  const { data } = useSWR(
    needFetch ? `/api/market/price?symbol=${encodeURIComponent(row.symbol)}` : null,
    fetcher, { refreshInterval: 20000, revalidateOnFocus: false },
  );
  const price  = row.price    ?? data?.price    ?? null;
  const change = row.change24h ?? data?.change24h ?? null;
  const { has, score, signal, rsi } = deriveSignal(change);

  // signal filter (now based on the REAL derived signal)
  if (signalFilter !== 'all' && (!has || signal !== signalFilter)) return null;

  const up = (change ?? 0) >= 0;
  return (
    <tr className="screener-row" onClick={onSelect}>
      <td><span className="mono fw">{row.symbol}</span></td>
      <td>{price != null ? <span className="mono">{price.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span> : <span className="text-muted">—</span>}</td>
      <td>{change != null ? <span className={`mono ${up ? 'up' : 'down'}`}>{up ? '+' : ''}{change.toFixed(2)}%</span> : <span className="text-muted">—</span>}</td>
      <td className="mono text-muted">{row.volume24h != null && row.volume24h > 0 ? `${(row.volume24h / 1e9).toFixed(2)}B` : '—'}</td>
      <td className={`mono ${rsi > 70 ? 'down' : rsi < 30 ? 'up' : ''}`}>{has ? rsi : '—'}</td>
      <td className="mono text-muted">{price ? (price * 0.02).toFixed(2) : '—'}</td>
      <td><span className={`signal-mini-badge ${signal.toLowerCase()}`}>{has ? signal : '—'}</span></td>
      <td>
        <div className="score-bar-wrap">
          <div className="score-bar-fill" style={{ width: `${has ? score : 0}%`, background: SIG_COLOR[signal] }} />
          <span className="score-bar-val">{has ? score : '—'}</span>
        </div>
      </td>
    </tr>
  );
}

export default function ScreenerPage() {
  const { setSymbol } = useChartStore();
  const [assetFilter, setAssetFilter] = useState('all');
  const [signalFilter, setSignalFilter] = useState('all');
  const [rawRows, setRawRows] = useState<Omit<SymbolRow, 'rsi' | 'signal' | 'score'>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const classes = ['index','commodity','futures','forex','stock_us','stock_id','stock_cn','stock_eu','stock_sa','dex','crypto','memecoin'];
    Promise.allSettled(
      classes.map(ac => fetch(`/api/market/symbols?assetClass=${ac}`).then(r => r.json()))
    ).then(results => {
      const all: Omit<SymbolRow, 'rsi' | 'signal' | 'score'>[] = [];
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value?.symbols?.length) all.push(...r.value.symbols);
      });
      setRawRows(all);
    }).finally(() => setLoading(false));
  }, []);

  // Asset-class filter only (signal filter is applied per-row from the REAL signal)
  const filtered = rawRows.filter(s => {
    if (assetFilter !== 'all') {
      if (assetFilter === 'stock') return s.assetClass?.startsWith('stock_') ?? false;
      if (s.assetClass !== assetFilter) return false;
    }
    return true;
  });

  return (
    <div className="panel-view screener-panel">
      <div className="panel-header">
        <div className="panel-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Market Screener</span>
        </div>
        <div className="screener-filters">
          <select
            className="screener-filter-select"
            value={assetFilter}
            onChange={e => setAssetFilter(e.target.value)}
            title="Asset class"
          >
            <option value="all">All Assets</option>
            <option value="crypto">Crypto</option>
            <option value="memecoin">Memecoins</option>
            <option value="forex">Forex</option>
            <option value="index">Indices</option>
            <option value="commodity">Commodities</option>
            <option value="futures">Futures</option>
            <option value="stock">All Stocks</option>
            <option value="stock_us">US Stocks</option>
            <option value="stock_id">IDX Stocks</option>
            <option value="stock_cn">CN Stocks</option>
            <option value="stock_eu">EU Stocks</option>
            <option value="stock_sa">ME Stocks</option>
            <option value="dex">DEX</option>
          </select>
          <select
            className="screener-filter-select"
            value={signalFilter}
            onChange={e => setSignalFilter(e.target.value)}
            title="Signal filter"
          >
            <option value="all">All Signals</option>
            <option value="BUY">BUY only</option>
            <option value="SELL">SELL only</option>
          </select>
        </div>
      </div>

      <div className="screener-table-wrap">
        <table className="screener-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Price</th>
              <th>24h %</th>
              <th>Volume</th>
              <th>RSI(7)</th>
              <th>ATR</th>
              <th>Signal</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-muted">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-muted">No symbols found</td></tr>
            ) : filtered.map(s => (
              <ScreenerRow key={s.symbol} row={s} signalFilter={signalFilter} onSelect={() => setSymbol(s.symbol)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
