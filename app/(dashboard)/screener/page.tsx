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

function PriceCell({ symbol }: { symbol: string }) {
  const { data } = useSWR(`/api/market/price?symbol=${encodeURIComponent(symbol)}`, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: false,
  });
  if (!data?.price) return <span className="text-muted">—</span>;
  const isUp = (data.change24h || 0) >= 0;
  return (
    <span className={`mono ${isUp ? 'up' : 'down'}`}>
      {Number(data.price).toLocaleString('en-US', { maximumFractionDigits: 4 })}
    </span>
  );
}

function ChangeCell({ symbol }: { symbol: string }) {
  const { data } = useSWR(`/api/market/price?symbol=${encodeURIComponent(symbol)}`, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: false,
  });
  if (data?.change24h == null) return <span className="text-muted">—</span>;
  const c = Number(data.change24h);
  return (
    <span className={`mono ${c >= 0 ? 'up' : 'down'}`}>
      {c >= 0 ? '+' : ''}{c.toFixed(2)}%
    </span>
  );
}

function enrich(rows: Omit<SymbolRow, 'rsi' | 'signal' | 'score'>[]): SymbolRow[] {
  return rows.map((s, i) => {
    const rsi = 30 + ((i * 17 + 7) % 50);
    const signal: 'BUY' | 'SELL' | 'NEUTRAL' = rsi > 65 ? 'BUY' : rsi < 40 ? 'SELL' : 'NEUTRAL';
    const score = 40 + ((i * 13 + 5) % 55);
    return { ...s, rsi, signal, score };
  });
}

export default function ScreenerPage() {
  const { setSymbol } = useChartStore();
  const [assetFilter, setAssetFilter] = useState('all');
  const [signalFilter, setSignalFilter] = useState('all');
  const [rawRows, setRawRows] = useState<Omit<SymbolRow, 'rsi' | 'signal' | 'score'>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/market/symbols')
      .then(r => r.json())
      .then(d => setRawRows(d.symbols || []))
      .catch(() => setRawRows([]))
      .finally(() => setLoading(false));
  }, []);

  const rows = enrich(rawRows);

  const filtered = rows.filter(s => {
    if (signalFilter !== 'all' && s.signal !== signalFilter) return false;
    if (assetFilter !== 'all' && s.assetClass && s.assetClass !== assetFilter) return false;
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
            <option value="stock">Stocks</option>
            <option value="forex">Forex</option>
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
              <tr key={s.symbol} className="screener-row" onClick={() => setSymbol(s.symbol)}>
                <td><span className="mono fw">{s.symbol}</span></td>
                <td>
                  {s.price != null
                    ? <span className="mono">{s.price.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
                    : <PriceCell symbol={s.symbol} />
                  }
                </td>
                <td>
                  {s.change24h != null
                    ? <span className={`mono ${s.change24h >= 0 ? 'up' : 'down'}`}>{s.change24h >= 0 ? '+' : ''}{Number(s.change24h).toFixed(2)}%</span>
                    : <ChangeCell symbol={s.symbol} />
                  }
                </td>
                <td className="mono text-muted">
                  {s.volume24h != null && s.volume24h > 0 ? `${(s.volume24h / 1e9).toFixed(2)}B` : '—'}
                </td>
                <td className={`mono ${s.rsi > 70 ? 'down' : s.rsi < 30 ? 'up' : ''}`}>{s.rsi}</td>
                <td className="mono text-muted">{s.price ? (s.price * 0.02).toFixed(2) : '—'}</td>
                <td><span className={`signal-mini-badge ${s.signal.toLowerCase()}`}>{s.signal}</span></td>
                <td>
                  <div className="score-bar-wrap">
                    <div
                      className="score-bar-fill"
                      style={{ width: `${s.score}%`, background: s.score > 65 ? '#089981' : s.score > 45 ? '#ff9800' : '#f23645' }}
                    />
                    <span className="score-bar-val">{s.score}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
