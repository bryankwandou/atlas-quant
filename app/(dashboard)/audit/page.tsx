'use client';
/**
 * AUDIT DASHBOARD — khusus superadmin.
 *
 * Menjalankan T1MO Verify batch (lintas simbol × timeframe) dengan validasi
 * OUT-OF-SAMPLE. Setiap sel menampilkan angka TRAIN (in-sample, dipakai saat
 * tuning grid) berdampingan dengan TEST (out-of-sample, belum pernah dilihat).
 * Angka TEST = satu-satunya yang layak dipercaya. Kalau train bagus tapi test
 * runtuh → verdict OVERFIT (jujur, bukan pamer).
 *
 * Gate: username localStorage 'nayrbryanGaming' atau role master/admin.
 * Password TIDAK pernah disimpan di kode — autentikasi tetap via login normal.
 */
import { useEffect, useState } from 'react';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
const TFS = ['1h', '4h'];
const SPLIT = 0.7;

// Preset yang diaudit. 'institusi' = pemenang grid search yang edge-nya
// TERBUKTI bertahan out-of-sample (bukan sekadar best-of-N in-sample).
export const PRESETS: Record<string, { label: string; qs: string; note: string }> = {
  standard: {
    label: 'Standar (RR 1.67)',
    qs: 'sl=1.5&tp=2.5&dir=both',
    note: 'Rencana ATR default Arbiter (SL 1.5×ATR / TP 2.5×ATR). Breakeven WR 37.5% — target menang jarang tapi besar.',
  },
  institusi: {
    label: 'Institusi (OOS-validated)',
    qs: 'trend=1&sl=2&tp=1&dir=both',
    note: 'Regime EMA50 + RR 2:1 (SL 2×ATR / TP 1×ATR). Breakeven WR 66.7% — target menang sering & kecil. Angka diverifikasi pada TEST set (out-of-sample).',
  },
};

type Metrics = { totalTrades: number; wins: number; losses: number; winRatePct: number; profitFactor: number; netR: number; maxDrawdownR: number; expectancyR: number };
type Cell = { train: Metrics; test: Metrics; verdict: string; breakeven: number } | { error: string } | null;

const VERDICT_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  EDGE_HOLDS_OOS:    { bg: 'rgba(8,153,129,0.15)',  fg: '#089981', label: 'EDGE ✓ OOS' },
  OVERFIT:           { bg: 'rgba(242,54,69,0.15)',  fg: '#f23645', label: 'OVERFIT' },
  TEST_LUCK:         { bg: 'rgba(247,166,0,0.15)',  fg: '#f7a600', label: 'TEST HOKI' },
  NO_EDGE:           { bg: 'rgba(120,123,134,0.15)',fg: '#787b86', label: 'NO EDGE' },
  INSUFFICIENT_TEST: { bg: 'rgba(247,166,0,0.15)',  fg: '#f7a600', label: 'SAMPEL KECIL' },
  IN_SAMPLE_ONLY:    { bg: 'rgba(120,123,134,0.15)',fg: '#787b86', label: 'IN-SAMPLE' },
};

export default function AuditPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [preset, setPreset] = useState<'standard' | 'institusi'>('institusi');
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [running, setRunning] = useState(false);
  const [ranAt, setRanAt] = useState<string>('');

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('atlas_user') || '{}');
      setAllowed(u?.username === 'nayrbryanGaming' || u?.role === 'master' || u?.role === 'admin');
    } catch { setAllowed(false); }
  }, []);

  const run = async (p: 'standard' | 'institusi') => {
    setPreset(p); setRunning(true); setCells({});
    const next: Record<string, Cell> = {};
    const jobs: Array<Promise<void>> = [];
    for (const s of SYMBOLS) for (const tf of TFS) {
      const key = `${s}|${tf}`;
      jobs.push((async () => {
        try {
          const r = await fetch(`/api/backtest/verify?symbol=${s}&tf=${tf}&limit=1500&horizon=100&split=${SPLIT}&${PRESETS[p].qs}`);
          const j = await r.json();
          next[key] = (j?.train && j?.test)
            ? { train: j.train, test: j.test, verdict: j.verdict, breakeven: j.config?.breakevenWinRatePct ?? 0 }
            : { error: j?.error || 'gagal' };
        } catch (e: any) { next[key] = { error: String(e?.message || e) }; }
      })());
    }
    await Promise.all(jobs);
    setCells(next); setRunning(false); setRanAt(new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC');
  };

  if (allowed === null) return <div className="panel-view"><div className="panel-content">Memeriksa akses…</div></div>;
  if (!allowed) return (
    <div className="panel-view"><div className="panel-content" style={{ padding: 24 }}>
      <h3>🔒 Khusus Superadmin</h3>
      <p style={{ color: '#787b86', fontSize: 12 }}>Dashboard audit hanya untuk akun master. Login sebagai superadmin lalu buka kembali halaman ini.</p>
    </div></div>
  );

  // Agregat memakai TEST (out-of-sample) — headline number yang jujur.
  const ok = Object.values(cells).filter((c: any) => c && !c.error && c.test) as any[];
  const testTrades = ok.reduce((s, c) => s + c.test.totalTrades, 0);
  const testWins   = ok.reduce((s, c) => s + c.test.wins, 0);
  const testWR     = testTrades ? (testWins / testTrades) * 100 : 0;
  const testNetR   = ok.reduce((s, c) => s + c.test.netR, 0);
  const holdCount  = ok.filter((c) => c.verdict === 'EDGE_HOLDS_OOS').length;
  const breakeven  = ok[0]?.breakeven ?? 0;

  return (
    <div className="panel-view">
      <div className="panel-header">
        <div className="panel-title"><span>🔬 Audit Dashboard — T1MO Verify (out-of-sample)</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(Object.keys(PRESETS) as Array<'standard' | 'institusi'>).map((p) => (
            <button key={p} type="button" disabled={running} onClick={() => run(p)}
              className={`panel-action-btn ${preset === p ? 'primary' : ''}`}>
              {running && preset === p ? 'Running…' : PRESETS[p].label}
            </button>
          ))}
        </div>
      </div>
      <div className="panel-content">
        <div style={{ fontSize: 11, color: '#a3a6af', marginBottom: 6 }}>{PRESETS[preset].note}</div>
        <div style={{ fontSize: 10.5, color: '#787b86', marginBottom: 12, lineHeight: 1.5 }}>
          Data dibagi <b style={{ color: '#a3a6af' }}>70% TRAIN</b> (in-sample — bagian yang dilihat saat tuning grid) dan{' '}
          <b style={{ color: '#089981' }}>30% TEST</b> (out-of-sample — belum pernah dilihat). <b>Angka TEST adalah satu-satunya
          yang layak dipercaya.</b> Kalau TRAIN bagus tapi TEST runtuh di bawah breakeven → verdict <b style={{ color: '#f23645' }}>OVERFIT</b>.
          Semua dari <span className="mono">/api/backtest/verify</span> — walk-forward, classifier identik chart/Arbiter, SL diprioritaskan saat ambigu (konservatif).
          {ranAt && <> · terakhir dijalankan {ranAt}</>}
        </div>

        {ok.length > 0 && (
          <div className="bt-stats-grid" style={{ marginBottom: 14 }}>
            <div className="bt-stat-card"><div className="bt-stat-val mono">{testTrades}</div><div className="bt-stat-label">Trade TEST (OOS)</div></div>
            <div className="bt-stat-card">
              <div className={`bt-stat-val mono ${testWR >= breakeven ? 'up' : 'down'}`}>{testWR.toFixed(1)}%</div>
              <div className="bt-stat-label">WR out-of-sample{breakeven ? ` (breakeven ${breakeven}%)` : ''}</div>
            </div>
            <div className="bt-stat-card"><div className={`bt-stat-val mono ${testNetR >= 0 ? 'up' : 'down'}`}>{testNetR.toFixed(1)}R</div><div className="bt-stat-label">Net R test</div></div>
            <div className="bt-stat-card"><div className={`bt-stat-val mono ${holdCount === ok.length ? 'up' : holdCount === 0 ? 'down' : ''}`}>{holdCount}/{ok.length}</div><div className="bt-stat-label">Edge bertahan OOS</div></div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="mono" style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#787b86', textAlign: 'right' }}>
                <th style={{ textAlign: 'left', padding: '4px 6px' }} rowSpan={2}>Pair · TF</th>
                <th colSpan={2} style={{ textAlign: 'center', color: '#787b86', borderBottom: '1px solid rgba(120,123,134,0.2)' }}>TRAIN (in-sample)</th>
                <th colSpan={4} style={{ textAlign: 'center', color: '#089981', borderBottom: '1px solid rgba(8,153,129,0.3)' }}>TEST (out-of-sample) — yang dipercaya</th>
                <th rowSpan={2} style={{ textAlign: 'center' }}>Verdict</th>
              </tr>
              <tr style={{ color: '#787b86', textAlign: 'right' }}>
                <th>Trades</th><th>WR</th>
                <th>Trades</th><th>WR</th><th>PF</th><th>Net R</th>
              </tr>
            </thead>
            <tbody>
              {SYMBOLS.flatMap((s) => TFS.map((tf) => {
                const c: any = cells[`${s}|${tf}`];
                const v = c && !c.error ? (VERDICT_STYLE[c.verdict] || VERDICT_STYLE.IN_SAMPLE_ONLY) : null;
                return (
                  <tr key={`${s}${tf}`} style={{ textAlign: 'right', borderTop: '1px solid rgba(120,123,134,0.12)' }}>
                    <td style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600 }}>{s} · {tf}</td>
                    {!c ? <td colSpan={7} style={{ color: '#787b86' }}>{running ? '…' : '— klik preset untuk run —'}</td>
                    : c.error ? <td colSpan={7} style={{ color: '#f23645' }}>{c.error}</td>
                    : (<>
                      <td style={{ color: '#787b86' }}>{c.train.totalTrades}</td>
                      <td style={{ color: '#a3a6af' }}>{c.train.winRatePct}%</td>
                      <td>{c.test.totalTrades}</td>
                      <td style={{ fontWeight: 700, color: c.test.winRatePct >= c.breakeven ? '#089981' : '#f23645' }}>{c.test.winRatePct}%</td>
                      <td style={{ color: Number(c.test.profitFactor) >= 1 ? '#089981' : '#f23645' }}>{c.test.profitFactor}</td>
                      <td style={{ color: c.test.netR >= 0 ? '#089981' : '#f23645' }}>{c.test.netR}R</td>
                      <td style={{ textAlign: 'center' }}>
                        {v && <span style={{ background: v.bg, color: v.fg, padding: '2px 7px', borderRadius: 4, fontSize: 9.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{v.label}</span>}
                      </td>
                    </>)}
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 10, color: '#5d6069', marginTop: 12, lineHeight: 1.5 }}>
          <b>Cara baca:</b> WR TEST ≥ breakeven berwarna hijau = strategi menang setelah biaya R.{' '}
          <b style={{ color: '#089981' }}>EDGE ✓ OOS</b> = untung di train <i>dan</i> bertahan di test (edge asli, boleh dipakai).{' '}
          <b style={{ color: '#f23645' }}>OVERFIT</b> = train menang, test kalah (jangan dipakai).{' '}
          <b style={{ color: '#f7a600' }}>TEST HOKI</b> = train rugi tapi test kebetulan menang (bukan edge — jangan tertipu angka test besar).{' '}
          Ini bukan janji win rate — ini audit yang bisa Anda cocokkan bar-per-bar di halaman Backtest.
        </div>
      </div>
    </div>
  );
}
