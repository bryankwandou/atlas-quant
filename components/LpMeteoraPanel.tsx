'use client';
// LP Pilot — Meteora DLMM paper trading, dibaca dari lp-pilot.vercel.app/api/paper.
// Candle & pivot diambil dari GeckoTerminal (API gratis, per pool). Tidak ada kunci atau wallet di sini.
import { useEffect, useState } from 'react';

const SNAP = 'https://lp-pilot.vercel.app/api/paper';
const GT = 'https://api.geckoterminal.com/api/v2/networks/solana/pools';
type C = { t: number; o: number; h: number; l: number; c: number; v: number };

const fmt = (x: number) => (!x ? '—' : x >= 1 ? x.toLocaleString(undefined, { maximumFractionDigits: 4 }) : x.toPrecision(4));
const usd = (x: number) => (x >= 1e6 ? `$${(x / 1e6).toFixed(2)}M` : x >= 1e3 ? `$${(x / 1e3).toFixed(1)}K` : `$${x.toFixed(2)}`);
const pct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(2)}%`;

function rsi(cl: number[], n = 14) {
  if (cl.length <= n) return null;
  let g = 0, l = 0;
  for (let i = cl.length - n; i < cl.length; i++) { const d = cl[i] - cl[i - 1]; d > 0 ? (g += d) : (l -= d); }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}

// Pivot klasik dari 24 candle 1 jam sebelumnya.
function pivots(cs: C[]) {
  const d = cs.slice(-25, -1);
  if (d.length < 6) return null;
  const H = Math.max(...d.map(x => x.h)), L = Math.min(...d.map(x => x.l)), Cl = d[d.length - 1].c, P = (H + L + Cl) / 3;
  return { P, R1: 2 * P - L, S1: 2 * P - H, R2: P + (H - L), S2: P - (H - L), R3: H + 2 * (P - L), S3: L - 2 * (H - P) };
}

function candleType(k?: C) {
  if (!k) return '—';
  const body = Math.abs(k.c - k.o), range = k.h - k.l || 1e-12;
  const lower = Math.min(k.o, k.c) - k.l, upper = k.h - Math.max(k.o, k.c);
  if (body / range < 0.1) return 'Doji';
  if (lower > body * 2 && upper < body) return k.c > k.o ? 'Hammer' : 'Hanging man';
  if (upper > body * 2 && lower < body) return 'Shooting star';
  if (body / range > 0.8) return k.c > k.o ? 'Marubozu bullish' : 'Marubozu bearish';
  return k.c > k.o ? 'Bullish' : 'Bearish';
}

function Chart({ cs, lines }: { cs: C[]; lines: { y: number; c: string; t: string }[] }) {
  if (!cs.length) return <div style={{ fontSize: 10, color: '#787b86' }}>Candle belum tersedia untuk pool ini.</div>;
  const W = 260, H = 110, all = [...cs.flatMap(x => [x.h, x.l]), ...lines.map(l => l.y)].filter(v => v > 0);
  const hi = Math.max(...all), lo = Math.min(...all), y = (v: number) => H - ((v - lo) / (hi - lo || 1)) * H;
  const w = W / cs.length;
  return (
    <svg viewBox={`0 0 ${W + 34} ${H}`} style={{ width: '100%', height: 120, display: 'block' }} role="img" aria-label="Candle 1 jam">
      {lines.map(l => (
        <g key={l.t}>
          <line x1={0} x2={W} y1={y(l.y)} y2={y(l.y)} stroke={l.c} strokeDasharray="3 3" strokeWidth={0.7} />
          <text x={W + 2} y={y(l.y) + 3} fontSize={7} fill={l.c}>{l.t}</text>
        </g>
      ))}
      {cs.map((k, i) => {
        const up = k.c >= k.o, col = up ? '#089981' : '#f23645', x = i * w + w / 2;
        return (
          <g key={k.t}>
            <line x1={x} x2={x} y1={y(k.h)} y2={y(k.l)} stroke={col} strokeWidth={0.8} />
            <rect x={x - w * 0.35} width={w * 0.7} y={y(Math.max(k.o, k.c))} height={Math.max(1, Math.abs(y(k.o) - y(k.c)))} fill={col} />
          </g>
        );
      })}
    </svg>
  );
}

export default function LpMeteoraPanel() {
  const [snap, setSnap] = useState<any>(undefined);
  const [sel, setSel] = useState<string | null>(null);
  const [cs, setCs] = useState<C[]>([]);

  useEffect(() => {
    const load = () => fetch(SNAP).then(r => r.json()).then(setSnap).catch(() => setSnap(null));
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const open: any[] = snap?.open ?? [];
  const pos = open.find(p => p.address === sel) ?? open[0];

  useEffect(() => {
    if (!pos) return;
    let dead = false;
    const load = () =>
      fetch(`${GT}/${pos.address}/ohlcv/hour?limit=48`).then(r => r.json()).then(j => {
        const list: number[][] = j?.data?.attributes?.ohlcv_list ?? [];
        if (!dead) setCs(list.map(([t, o, h, l, c, v]) => ({ t, o, h, l, c, v })).reverse());
      }).catch(() => !dead && setCs([]));
    load();
    const id = setInterval(load, pos.engine === 'A' ? 300_000 : 60_000); // pair besar 5 menit, pair kecil 1 menit
    return () => { dead = true; clearInterval(id); };
  }, [pos?.address]);

  if (snap === undefined) return <div className="risk-today"><div className="risk-today-title">LP Pilot — Meteora DLMM</div><div style={{ fontSize: 10, color: '#787b86' }}>Memuat…</div></div>;
  if (!snap || snap.error) return <div className="risk-today"><div className="risk-today-title">LP Pilot — Meteora DLMM</div><div style={{ fontSize: 10, color: '#787b86' }}>Snapshot belum terbaca. Angka ditahan, bukan nol.</div></div>;

  const eq = snap.equity as number, profit = eq - snap.startUsd;
  const closed: any[] = snap.closed ?? [];
  const wins = closed.filter(x => ['HIGH', 'MEDIUM', 'SLOW'].includes(x.label)).length;
  const R = pos ? snap.rules?.[pos.engine] : null;
  // Perkiraan harga TP/SL dari target net: nilai ~ modal * sqrt(r) -> r = (1 + target)^2 (fee diabaikan, jadi konservatif).
  const tp = pos && R ? pos.entryPrice * (1 + R.take) ** 2 : 0;
  const sl = pos && R ? pos.entryPrice * (1 + R.stop) ** 2 : 0;
  const pv = pivots(cs), r14 = rsi(cs.map(x => x.c));
  const volLast = cs.slice(-6).reduce((a, x) => a + x.v, 0), volPrev = cs.slice(-12, -6).reduce((a, x) => a + x.v, 0);
  const small = { fontSize: 10, color: '#787b86', lineHeight: 1.6 } as const;

  return (
    <div className="risk-today">
      <div className="risk-today-title">
        <span style={{ color: Date.now() - snap.updatedAt < 900_000 ? '#089981' : '#787b86' }}>●</span> LP Pilot — Meteora DLMM (paper trading)
      </div>
      <div className="risk-today-stats">
        {[
          { label: 'Equity', val: `$${eq.toFixed(2)}`, cls: '' },
          { label: 'Profit', val: `${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`, cls: profit >= 0 ? 'up' : 'down' },
          { label: 'Win', val: `${wins}/${closed.length}`, cls: '' },
          { label: 'Buka', val: String(open.length), cls: '' },
        ].map(({ label, val, cls }) => (
          <div key={label} className="risk-today-item">
            <div className={`risk-today-val mono${cls ? ` ${cls}` : ''}`}>{val}</div>
            <div className="risk-today-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ maxHeight: 130, overflowY: 'auto', margin: '6px 0' }}>
        {open.map(p => (
          <button key={p.address} onClick={() => setSel(p.address)}
            style={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: 6, fontSize: 11, padding: '3px 4px', border: 0, cursor: 'pointer',
              background: p.address === pos?.address ? 'rgba(41,98,255,.12)' : 'transparent', color: 'inherit' }}>
            <span><b>{p.engine}</b> {p.name}</span>
            <span className="mono" style={{ color: p.net >= 0 ? '#089981' : '#f23645' }}>{pct(p.net)}</span>
          </button>
        ))}
      </div>

      {pos && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{pos.name} <span style={small}>· mesin {pos.engine} · bin {pos.binStep ?? '—'}</span></div>
          <div style={{ ...small, wordBreak: 'break-all' }}>
            Pool: <a href={`https://app.meteora.ag/dlmm/${pos.address}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2962ff' }}>{pos.address}</a>
            {pos.mintX && <><br />CA: {pos.mintX}</>}
          </div>
          <Chart cs={cs} lines={[
            ...(pv ? [{ y: pv.R1, c: '#f23645', t: 'R1' }, { y: pv.S1, c: '#089981', t: 'S1' }] : []),
            { y: tp, c: '#2962ff', t: 'TP' }, { y: sl, c: '#ff9800', t: 'SL' },
          ].filter(l => l.y > 0)} />
          <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Harga', fmt(pos.price ?? pos.entryPrice), 'Masuk', fmt(pos.entryPrice)],
                ['Range', `${fmt(pos.entryPrice * 0.1)} – ${fmt(pos.entryPrice)}`, 'Net', pct(pos.net)],
                ['TP ≈', fmt(tp), 'SL ≈', fmt(sl)],
                ['Vol 24j', usd(pos.vol24h ?? 0), 'TVL', usd(pos.tvl ?? 0)],
                ['Fee', `$${(pos.fees ?? 0).toFixed(3)}`, 'Candle', candleType(cs[cs.length - 1])],
                ['RSI(14) 1j', r14 == null ? '—' : r14.toFixed(1), 'Vol 6j', volPrev ? pct(volLast / volPrev - 1) : '—'],
                ...(pv ? [['R1', fmt(pv.R1), 'S1', fmt(pv.S1)], ['R2', fmt(pv.R2), 'S2', fmt(pv.S2)], ['R3', fmt(pv.R3), 'S3', fmt(pv.S3)]] : []),
              ].map(r => (
                <tr key={r[0]}>
                  <td style={{ color: '#787b86' }}>{r[0]}</td><td className="mono">{r[1]}</td>
                  <td style={{ color: '#787b86' }}>{r[2]}</td><td className="mono">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <div style={{ ...small, marginTop: 6 }}>
        Indikator: RSI(14), pivot R1–R3/S1–S3, tipe candle, perubahan volume 6 jam, 8 sinyal wash trading, batas net stop/take per mesin.
        <br />Modal virtual ${snap.startUsd} · mesin A 70% stabil · B agresif · C pool baru. Update: {new Date(snap.updatedAt).toLocaleString()}
        <br /><a href="https://lp-pilot.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: '#2962ff' }}>Panel LP Pilot ↗</a>
      </div>
    </div>
  );
}
