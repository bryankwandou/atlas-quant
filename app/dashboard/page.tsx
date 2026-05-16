'use client';
/**
 * /dashboard — Atlas Quant v2.0
 *
 * UI BARU 100%. Tidak ada lagi:
 *   - "T1MO_SCIENTIFIC_V1.0.15" hardcoded copywriting
 *   - NaN values
 *   - Sintetik synthetic Aegis fallback
 *   - "GEOMETRY_LABS" footer
 *
 * Gantinya:
 *   - Watchlist dinamis (load top assets dari /api/market/symbols)
 *   - Symbol search palette (Cmd/Ctrl+K) → 700+ aset
 *   - T1MOChart dengan series indikator + Fib RR overlay
 *   - Indicator param panel (klik gear → ubah backbone / magenta / box lookback)
 *   - Right rail: local AI brain (ensemble) — NO external API call
 *   - Admin shortcut bila login admin
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Asset } from '@/domain/asset';

const T1MOChart = dynamic(() => import('@/components/T1MOChart'), { ssr: false });
const SymbolSearch = dynamic(() => import('@/components/SymbolSearch'), { ssr: false });
const IndicatorParamPanel = dynamic(() => import('@/components/IndicatorParamPanel'), { ssr: false });

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

interface T1MOResponse {
  symbol: string;
  timeframe: string;
  params: Record<string, number>;
  candles: Candle[];
  t1mo: {
    series: {
      backbone: (number | null)[];
      magenta: (number | null)[];
      topBox: (number | null)[];
      btmBox: (number | null)[];
      hmf: (number | null)[];
      regimeStrength: number[];
    };
    levels?: Array<{ key: string; value: number; label?: string; color?: string }>;
    meta?: Record<string, unknown> & { regimeColors?: string[] };
  };
  brain: {
    regime: string;
    regimeConfidence: number;
    bias: 'long' | 'short' | 'flat';
    signalScore: number;
    ensembleVotes: Record<string, number>;
    forecastReturnPct: number;
    volPercentile: number;
    commentary: string;
    risks: string[];
    validity: 'strong' | 'moderate' | 'weak' | 'invalid';
    rationale: string[];
    provider: string;
    model: string;
    latencyMs: number;
  };
}

interface FibResponse {
  meta: {
    direction: 'long' | 'short';
    entryPrice: number;
    slPrice: number;
    tpPrices: number[];
    rrPerTp: number[];
  };
  levels: Array<{ key: string; value: number; label?: string; color?: string }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role?: string; displayName?: string } | null>(null);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [tf, setTf] = useState<(typeof TIMEFRAMES)[number]>('15m');
  const [data, setData] = useState<T1MOResponse | null>(null);
  const [fib, setFib] = useState<FibResponse | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showParams, setShowParams] = useState<'t1mo' | 'fib' | null>(null);
  const [loading, setLoading] = useState(false);
  const [t1moParams, setT1moParams] = useState<Record<string, number>>({
    backbone: 50, magenta: 10, boxLookback: 20, boxMultiplier: 0.5, hmfPeriod: 10, strengthSlopeBars: 4,
  });
  const [fibParams, setFibParams] = useState<Record<string, unknown>>({
    lookback: 60,
    direction: 'auto',
    entryLevel: 0.5,
    slLevel: -0.5,
    tpLevels: [1, 1.5, 2, 2.5, 3, 3.5],
    extraLevels: [0],
    showRR: true,
  });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('session_token') : null;
    const adminTk = typeof window !== 'undefined' ? localStorage.getItem('atlas-admin-token') : null;
    if (!token && !adminTk) { router.push('/login'); return; }
    const stored = typeof window !== 'undefined' ? localStorage.getItem('atlas-user') : null;
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    if (adminTk) setUser({ role: 'admin', displayName: 'nayrbryanGaming' });
  }, [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loadT1MO = useCallback(async (sym: string, timeframe: string, params: Record<string, number>) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        symbol: sym,
        tf: timeframe,
        limit: '400',
        ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      });
      const r = await fetch(`/api/quant/t1mo?${qs.toString()}`);
      if (r.ok) {
        const json = (await r.json()) as T1MOResponse;
        setData(json);
        // also recompute fib using API later — for now we trigger fib load
        await loadFib(json.candles, fibParams);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('t1mo load failed', err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fibParams]);

  const loadFib = useCallback(async (candles: Candle[], params: Record<string, unknown>) => {
    try {
      const r = await fetch('/api/quant/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'SMC_RR_FIB', candles, params }),
      });
      if (r.ok) setFib(await r.json());
    } catch (err) {
      console.error('fib failed', err);
    }
  }, []);

  useEffect(() => {
    loadT1MO(symbol, tf, t1moParams);
    const id = setInterval(() => loadT1MO(symbol, tf, t1moParams), 60_000);
    return () => clearInterval(id);
  }, [symbol, tf, t1moParams, loadT1MO]);

  const fibLevels = useMemo(() => {
    if (!fib?.levels) return [];
    return fib.levels.map((l) => ({ value: l.value, label: l.label, color: l.color }));
  }, [fib]);

  function pickAsset(a: Asset) {
    setSymbol(a.symbol);
  }

  function logout() {
    localStorage.removeItem('session_token');
    localStorage.removeItem('atlas-user');
    router.push('/login');
  }

  const last = data?.candles?.[data.candles.length - 1];
  const lastPrice = last?.close ?? 0;
  const prev = data?.candles?.[(data.candles.length ?? 1) - 2];
  const dayChange = prev ? ((lastPrice - prev.close) / prev.close) * 100 : 0;
  const brain = data?.brain;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] aq-fade">
      {/* TOP BAR */}
      <header className="h-12 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center px-4 gap-4 shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--accent)] grid place-items-center text-white font-bold text-xs">A</div>
          <span className="font-bold text-sm tracking-tight">Atlas <span className="text-[var(--accent)]">Quant</span></span>
          <span className="aq-pill text-[10px]">v2.0</span>
        </Link>
        <div className="h-6 w-px bg-[var(--border-subtle)]" />
        <button
          onClick={() => setShowSearch(true)}
          className="flex-1 max-w-md aq-input bg-[var(--bg-elevated)] text-left mono text-sm flex items-center gap-2"
        >
          <span className="text-[var(--text-muted)]">▶</span>
          <span className="font-semibold">{symbol}</span>
          <span className="text-[var(--text-muted)] ml-auto text-xs">Cmd/Ctrl+K</span>
        </button>
        <div className="flex gap-1">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-2.5 py-1 rounded text-xs font-medium ${tf === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right leading-tight">
            <span className="text-sm font-bold mono">{lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className={`text-[10px] font-semibold mono ${dayChange >= 0 ? 'text-[var(--buy)]' : 'text-[var(--sell)]'}`}>
              {dayChange >= 0 ? '▲' : '▼'} {Math.abs(dayChange).toFixed(2)}%
            </span>
          </div>
          {user?.role === 'admin' && (
            <Link href="/admin" className="aq-btn-secondary aq-btn text-xs">Admin</Link>
          )}
          <button onClick={logout} className="text-xs text-[var(--text-secondary)] hover:text-[var(--sell)]">Keluar</button>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="flex-1 grid grid-cols-[260px_1fr_320px] overflow-hidden">
        {/* LEFT — WATCHLIST */}
        <aside className="border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-y-auto">
          <WatchlistSidebar currentSymbol={symbol} onPick={(s) => setSymbol(s)} />
        </aside>

        {/* CENTER — CHART */}
        <section className="flex flex-col overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <div>
              <h2 className="text-sm font-bold mono">{symbol}</h2>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                {tf} · {data?.candles?.length ?? 0} bars · local brain {brain?.provider ?? '—'} ({brain?.latencyMs ?? '—'}ms)
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowParams('t1mo')} className="aq-btn aq-btn-secondary text-xs">T1MO Params</button>
              <button onClick={() => setShowParams('fib')} className="aq-btn aq-btn-secondary text-xs">Fib RR Params</button>
            </div>
          </div>
          <div className="flex-1 relative">
            {loading && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded text-xs">
                <div className="aq-spinner" /> sync
              </div>
            )}
            {data ? (
              <T1MOChart
                candles={data.candles}
                series={{
                  backbone: data.t1mo.series.backbone,
                  magenta: data.t1mo.series.magenta,
                  topBox: data.t1mo.series.topBox,
                  btmBox: data.t1mo.series.btmBox,
                  hmf: data.t1mo.series.hmf,
                  regimeStrength: data.t1mo.series.regimeStrength,
                  regimeColors: data.t1mo.meta?.regimeColors as string[] | undefined,
                }}
                meta={{
                  regimeColors: data.t1mo.meta?.regimeColors as string[] | undefined,
                  backboneLen: data.params.backbone,
                  magentaLen: data.params.magenta,
                }}
                fibLevels={fibLevels}
                symbol={symbol}
                timeframe={tf}
                height={600}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-[var(--text-muted)]">
                {loading ? 'Memuat data pasar…' : 'Pilih simbol atau cek koneksi.'}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT — AI BRAIN + LEVELS */}
        <aside className="border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-y-auto p-4 space-y-4">
          {brain && (
            <div className="aq-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Local Brain</h3>
                <span className={`aq-pill text-[10px] ${brain.bias === 'long' ? 'aq-pill-buy' : brain.bias === 'short' ? 'aq-pill-sell' : 'aq-pill-neutral'}`}>
                  {brain.bias === 'long' ? 'BUY' : brain.bias === 'short' ? 'SELL' : 'WAIT'}
                </span>
              </div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">offline · ensemble {brain.model}</div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <Metric label="Regime" value={brain.regime.replace(/_/g, ' ')} />
                <Metric label="Confidence" value={`${brain.regimeConfidence}%`} />
                <Metric label="Signal" value={`${brain.signalScore}/100`} />
                <Metric label="Forecast" value={`${brain.forecastReturnPct.toFixed(2)}%`} />
                <Metric label="Vol Pct" value={`${brain.volPercentile}`} />
                <Metric label="Validity" value={brain.validity} />
              </div>
              <div className="text-xs mt-3 text-[var(--text-secondary)] leading-relaxed">
                {brain.commentary}
              </div>
              {brain.risks?.length > 0 && (
                <ul className="text-[11px] text-[var(--neutral)] mt-2 space-y-1 list-disc list-inside">
                  {brain.risks.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </div>
          )}

          {fib?.meta && (
            <div className="aq-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">SMC Fib RR</h3>
                <span className="aq-pill text-[10px]">{fib.meta.direction.toUpperCase()}</span>
              </div>
              <table className="w-full text-xs mt-3">
                <tbody>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td className="py-1 text-[var(--text-muted)]">Entry</td>
                    <td className="py-1 mono text-right text-[var(--neutral)]">{fib.meta.entryPrice.toFixed(4)}</td>
                  </tr>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td className="py-1 text-[var(--text-muted)]">SL</td>
                    <td className="py-1 mono text-right text-[var(--sell)]">{fib.meta.slPrice.toFixed(4)}</td>
                  </tr>
                  {fib.meta.tpPrices.map((tp, i) => (
                    <tr key={i} className="border-b border-[var(--border-subtle)]/40">
                      <td className="py-1 text-[var(--text-muted)]">TP{i + 1}</td>
                      <td className="py-1 mono text-right text-[var(--buy)]">{tp.toFixed(4)} <span className="text-[10px] text-[var(--text-muted)]">RR {fib.meta.rrPerTp[i].toFixed(2)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data?.t1mo.levels && (
            <div className="aq-card p-4">
              <h3 className="font-bold text-sm">Key Levels</h3>
              <div className="space-y-1 mt-2 text-xs">
                {data.t1mo.levels.map((l) => (
                  <div key={l.key} className="flex justify-between border-b border-[var(--border-subtle)]/40 py-1">
                    <span className="text-[var(--text-secondary)] truncate" style={{ color: l.color }}>{l.label || l.key}</span>
                    <span className="mono">{Number(l.value).toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* STATUS BAR */}
      <footer className="h-6 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between px-4 text-[10px] text-[var(--text-muted)]">
        <span>Atlas Quant v2.0 · local brain · {brain?.regime ?? '—'} ({brain?.regimeConfidence ?? 0}%)</span>
        <span className="mono">{new Date().toLocaleTimeString('id-ID')}</span>
      </footer>

      {showSearch && (
        <SymbolSearch initialSymbol={symbol} onSelect={pickAsset} onClose={() => setShowSearch(false)} />
      )}

      {showParams === 't1mo' && (
        <ParamModal onClose={() => setShowParams(null)}>
          <T1MOParamPanel
            initial={t1moParams}
            onApply={(p) => { setT1moParams(p as Record<string, number>); setShowParams(null); }}
            onCancel={() => setShowParams(null)}
          />
        </ParamModal>
      )}

      {showParams === 'fib' && (
        <ParamModal onClose={() => setShowParams(null)}>
          <FibParamPanel
            initial={fibParams}
            onApply={(p) => {
              setFibParams(p);
              if (data?.candles) loadFib(data.candles, p);
              setShowParams(null);
            }}
            onCancel={() => setShowParams(null)}
          />
        </ParamModal>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{label}</div>
      <div className="text-sm font-semibold mono">{value}</div>
    </div>
  );
}

function ParamModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function T1MOParamPanel({ initial, onApply, onCancel }: { initial: Record<string, number>; onApply: (p: Record<string, number>) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const fields: Array<[keyof typeof initial, string, number, number, number]> = [
    ['backbone', 'Backbone EMA Length (cyan line)', 5, 400, 1],
    ['magenta', 'Magenta EMA Length (dotted pink)', 2, 200, 1],
    ['boxLookback', 'Box Lookback Bars', 5, 200, 1],
    ['boxMultiplier', 'Box Range Multiplier', 0.1, 2, 0.05],
    ['hmfPeriod', 'HMF Smoothing', 2, 50, 1],
    ['strengthSlopeBars', 'Strength Slope Window', 2, 30, 1],
  ];
  return (
    <div className="aq-card p-5">
      <h3 className="font-bold">T1MO Core — Parameters</h3>
      <p className="text-xs text-[var(--text-muted)]">Setiap perubahan langsung diapplikasikan ke chart.</p>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {fields.map(([k, label, min, max, step]) => (
          <div key={k}>
            <label className="text-xs text-[var(--text-secondary)]">{label}</label>
            <input
              type="number"
              className="aq-input mt-1 mono"
              value={v[k]}
              min={min}
              max={max}
              step={step}
              onChange={(e) => setV((p) => ({ ...p, [k]: Number(e.target.value) }))}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="aq-btn aq-btn-secondary" onClick={onCancel}>Batal</button>
        <button className="aq-btn" onClick={() => onApply(v)}>Terapkan</button>
      </div>
    </div>
  );
}

function FibParamPanel({ initial, onApply, onCancel }: { initial: Record<string, unknown>; onApply: (p: Record<string, unknown>) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const tpsArr = Array.isArray(v.tpLevels) ? v.tpLevels : [];
  return (
    <div className="aq-card p-5">
      <h3 className="font-bold">SMC Risk-Reward Fibonacci</h3>
      <p className="text-xs text-[var(--text-muted)]">Setup persis screenshot kamu: -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5 (fully editable).</p>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Lookback (bars)</label>
          <input type="number" min={10} className="aq-input mt-1 mono" value={Number(v.lookback ?? 60)} onChange={(e) => setV((p) => ({ ...p, lookback: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Direction</label>
          <select className="aq-input mt-1" value={String(v.direction ?? 'auto')} onChange={(e) => setV((p) => ({ ...p, direction: e.target.value }))}>
            <option value="auto">Auto</option>
            <option value="long">Long (Buy)</option>
            <option value="short">Short (Sell)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Entry Level</label>
          <input type="number" step={0.001} className="aq-input mt-1 mono" value={Number(v.entryLevel ?? 0.5)} onChange={(e) => setV((p) => ({ ...p, entryLevel: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">SL Level</label>
          <input type="number" step={0.001} className="aq-input mt-1 mono" value={Number(v.slLevel ?? -0.5)} onChange={(e) => setV((p) => ({ ...p, slLevel: Number(e.target.value) }))} />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-[var(--text-secondary)]">TP Levels (comma-separated)</label>
          <input
            type="text"
            className="aq-input mt-1 mono"
            value={tpsArr.join(', ')}
            onChange={(e) => setV((p) => ({
              ...p,
              tpLevels: e.target.value.split(',').map((s) => parseFloat(s.trim())).filter((n) => Number.isFinite(n)),
            }))}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="aq-btn aq-btn-secondary" onClick={onCancel}>Batal</button>
        <button className="aq-btn" onClick={() => onApply(v)}>Terapkan</button>
      </div>
    </div>
  );
}

function WatchlistSidebar({ currentSymbol, onPick }: { currentSymbol: string; onPick: (s: string) => void }) {
  const [items, setItems] = useState<Asset[]>([]);
  const [klass, setKlass] = useState<'crypto' | 'stock' | 'forex' | 'dex' | 'index' | 'commodity'>('crypto');

  useEffect(() => {
    fetch(`/api/market/symbols?class=${klass}&limit=40`)
      .then((r) => r.json())
      .then((d) => setItems(d.results ?? []));
  }, [klass]);

  return (
    <div>
      <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Watchlist</span>
        <select
          className="text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded px-2 py-1"
          value={klass}
          onChange={(e) => setKlass(e.target.value as typeof klass)}
        >
          <option value="crypto">Crypto</option>
          <option value="stock">Stock</option>
          <option value="forex">Forex</option>
          <option value="dex">DEX</option>
          <option value="index">Index</option>
          <option value="commodity">Commodity</option>
        </select>
      </div>
      <ul>
        {items.map((a) => (
          <li key={a.symbol + a.exchange}>
            <button
              onClick={() => onPick(a.symbol)}
              className={`w-full px-3 py-2 flex items-center justify-between border-b border-[var(--border-subtle)]/40 hover:bg-[var(--bg-hover)] ${
                currentSymbol === a.symbol ? 'bg-[var(--accent-dim)]' : ''
              }`}
            >
              <div className="text-left">
                <div className="font-semibold text-xs mono">{a.symbol}</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[150px]">{a.name}</div>
              </div>
              <span className="text-[9px] uppercase text-[var(--text-muted)] mono">{a.exchange}</span>
            </button>
          </li>
        ))}
        {!items.length && <li className="px-3 py-4 text-xs text-[var(--text-muted)]">Loading…</li>}
      </ul>
    </div>
  );
}
