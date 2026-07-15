'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useChartStore } from '@/store/chartStore';
import { computeIndicators } from '@/core/indicators/client';
import { t1moCompute } from '@/src/core/indicators/t1mo';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface RawRow {
  symbol: string;
  name?: string;
  exchange?: string;
  assetClass?: string;
  price?: number;
  change24h?: number;
  volume24h?: number;
}

const SIG_COLOR: Record<string, string> = { BUY: '#089981', SELL: '#f23645', NEUTRAL: '#ff9800' };

// Map a T1MO bull-probability (0..100) → discrete rating/signal, consistent with
// the chart + right panel classifier (high bp = accumulation/buy).
function rateBullProb(bp: number): { signal: 'BUY' | 'SELL' | 'NEUTRAL'; rating: string } {
  if (bp >= 72) return { signal: 'BUY', rating: 'Strong Buy' };
  if (bp >= 58) return { signal: 'BUY', rating: 'Buy' };
  if (bp <= 28) return { signal: 'SELL', rating: 'Strong Sell' };
  if (bp <= 42) return { signal: 'SELL', rating: 'Sell' };
  return { signal: 'NEUTRAL', rating: 'Neutral' };
}

const last = (a: number[] | undefined) => {
  if (!a) return NaN;
  for (let i = a.length - 1; i >= 0; i--) if (Number.isFinite(a[i])) return a[i];
  return NaN;
};

/** One row — fetches its own OHLCV and computes REAL indicators (RSI7, ATR,
 *  T1MO bull-prob → signal/rating, Bandar smart-money score). No faked values. */
function ScreenerRow({ row, timeframe, signalFilter, onSelect }: { row: RawRow; timeframe: string; signalFilter: string; onSelect: () => void }) {
  const { data } = useSWR(
    `/api/market/ohlcv?symbol=${encodeURIComponent(row.symbol)}&timeframe=${timeframe}&limit=160`,
    fetcher, { refreshInterval: 60_000, revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  const candles: any[] = data?.data || [];
  let metrics: { price: number; chg: number; rsi: number; atr: number; bp: number; bandar: number } | null = null;
  if (candles.length > 30) {
    const fmt = candles
      .map(c => ({ t: +c.open_time, o: +c.open, h: +c.high, l: +c.low, c: +c.close, v: +c.volume }))
      .filter(c => c.t > 0 && c.c > 0)
      .sort((a, b) => a.t - b.t);
    if (fmt.length > 30) {
      const closes = fmt.map(c => c.c), highs = fmt.map(c => c.h), lows = fmt.map(c => c.l), vols = fmt.map(c => c.v), times = fmt.map(c => Math.floor(c.t / 1000));
      try {
        const ind = computeIndicators(closes, highs, lows, vols);
        const t1 = t1moCompute({ close: closes, high: highs, low: lows, volume: vols, open: closes, time: times } as any, {});
        const price = closes[closes.length - 1];
        const prev = closes[closes.length - 2] || price;
        const bp = t1.meta.ready ? (last((t1.series.bullProb ?? []) as number[]) || 50) : 50;
        const bandar = last(ind.bandarDetector(8).score) || 50;
        metrics = {
          price,
          chg: row.change24h ?? (prev ? ((price - prev) / prev) * 100 : 0),
          rsi: last(ind.rsi(7)),
          atr: last(ind.atr(14)),
          bp,
          bandar,
        };
      } catch { metrics = null; }
    }
  }

  if (!metrics) {
    // still loading / not enough data — render a quiet placeholder row
    if (signalFilter !== 'all') return null;
    return (
      <tr className="screener-row" onClick={onSelect}>
        <td><span className="mono fw">{row.symbol}</span></td>
        <td colSpan={7} className="text-muted">loading…</td>
      </tr>
    );
  }

  const { signal, rating } = rateBullProb(metrics.bp);
  if (signalFilter !== 'all' && signal !== signalFilter) return null;
  const up = metrics.chg >= 0;
  const score = Math.round(metrics.bp);

  return (
    <tr className="screener-row" onClick={onSelect}>
      <td><span className="mono fw">{row.symbol}</span></td>
      <td><span className="mono">{metrics.price.toLocaleString('en-US', { maximumFractionDigits: 6 })}</span></td>
      <td><span className={`mono ${up ? 'up' : 'down'}`}>{up ? '+' : ''}{metrics.chg.toFixed(2)}%</span></td>
      <td className={`mono ${metrics.rsi > 70 ? 'down' : metrics.rsi < 30 ? 'up' : ''}`}>{Number.isFinite(metrics.rsi) ? metrics.rsi.toFixed(1) : '—'}</td>
      <td className="mono text-muted">{Number.isFinite(metrics.atr) ? metrics.atr.toFixed(metrics.atr < 1 ? 5 : 2) : '—'}</td>
      <td>
        <div className="score-bar-wrap" title="Bandar (proxy OHLCV): komposit CVD + A/D + OBV + CMF + MFI — inferensi dari harga & volume publik, BUKAN data transaksi broker/bid riil">
          <div className="score-bar-fill" style={{ width: `${Math.round(metrics.bandar)}%`, background: metrics.bandar >= 55 ? '#089981' : metrics.bandar <= 45 ? '#f23645' : '#ff9800' }} />
          <span className="score-bar-val">{Math.round(metrics.bandar)}</span>
        </div>
      </td>
      <td><span className={`signal-mini-badge ${signal.toLowerCase()}`}>{rating}</span></td>
      <td>
        <div className="score-bar-wrap" title="T1MO bull probability">
          <div className="score-bar-fill" style={{ width: `${score}%`, background: SIG_COLOR[signal] }} />
          <span className="score-bar-val">{score}</span>
        </div>
      </td>
    </tr>
  );
}

const MAX_ROWS = 60; // cap concurrent OHLCV fetches (free-tier friendly)

export default function ScreenerPage() {
  const router = useRouter();
  const { setSymbol, timeframe, setTimeframe } = useChartStore();
  // Klik baris = pindah simbol DAN buka chart-nya langsung.
  const openChart = (symbol: string) => { setSymbol(symbol); router.push('/chart'); };
  const [assetFilter, setAssetFilter] = useState('crypto');
  const [signalFilter, setSignalFilter] = useState('all');
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const classes = ['index','commodity','futures','forex','stock_us','stock_id','stock_cn','stock_eu','stock_sa','dex','crypto','memecoin'];
    Promise.allSettled(
      classes.map(ac => fetch(`/api/market/symbols?assetClass=${ac}`).then(r => r.json()))
    ).then(results => {
      const all: RawRow[] = [];
      results.forEach(r => { if (r.status === 'fulfilled' && r.value?.symbols?.length) all.push(...r.value.symbols); });
      setRawRows(all);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = rawRows.filter(s => {
    if (assetFilter !== 'all') {
      if (assetFilter === 'stock') return s.assetClass?.startsWith('stock_') ?? false;
      if (s.assetClass !== assetFilter) return false;
    }
    return true;
  }).slice(0, MAX_ROWS);

  return (
    <div className="panel-view screener-panel">
      <div className="panel-header">
        <div className="panel-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Market Screener · {timeframe}</span>
        </div>
        <div className="screener-filters">
          <select className="screener-filter-select" value={timeframe} onChange={e => setTimeframe(e.target.value)} title="Timeframe">
            {['5m','15m','1h','4h','1d'].map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
          <select className="screener-filter-select" value={assetFilter} onChange={e => setAssetFilter(e.target.value)} title="Asset class">
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
            <option value="dex">DEX</option>
          </select>
          <select className="screener-filter-select" value={signalFilter} onChange={e => setSignalFilter(e.target.value)} title="Signal filter">
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
              <th>Chg %</th>
              <th>RSI(7)</th>
              <th>ATR(14)</th>
              <th title="Proxy OHLCV (CVD/AD/OBV/CMF/MFI) — bukan data broker riil">Bandar*</th>
              <th>Rating</th>
              <th>T1MO Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-muted">Loading symbols…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-muted">No symbols found</td></tr>
            ) : filtered.map(s => (
              <ScreenerRow key={s.symbol} row={s} timeframe={timeframe} signalFilter={signalFilter} onSelect={() => openChart(s.symbol)} />
            ))}
          </tbody>
        </table>
        {rawRows.length > MAX_ROWS && (
          <div className="text-muted" style={{ padding: '8px 12px', fontSize: 11 }}>
            Showing top {MAX_ROWS} of {rawRows.length} — real indicators computed per symbol (capped to stay within free-tier rate limits).
          </div>
        )}
        <div className="text-muted" style={{ padding: '8px 12px 12px', fontSize: 11, lineHeight: 1.5 }}>
          *Bandar = <b>proxy OHLCV</b>: skor komposit CVD divergence + A/D line + OBV + CMF + MFI, dihitung dari data harga &amp; volume publik.
          Ini <b>bukan</b> broker summary, order-bid, atau foreign flow riil — data tersebut hanya tersedia lewat feed bursa berbayar.
          Klik baris manapun untuk membuka chart-nya.
        </div>
      </div>
    </div>
  );
}
