'use client';
/**
 * KONSOL SUPERADMIN (/dashboard) — "semua informasi super lengkap di satu layar".
 *   1. Audit Strategi (out-of-sample) — AUTO-RUN saat dibuka, interaktif.
 *   2. Visitor Analytics — self-hosted (/api/track) + catatan Vercel Analytics.
 *   3. Sistem — aset, indikator, env, build (dari server, props `sys`).
 * Server sudah memverifikasi admin-session sebelum komponen ini dirender.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  AUDIT_PRESETS, AUDIT_SYMBOLS, AUDIT_TFS, AUDIT_SPLIT, VERDICT_STYLE,
  type PresetKey, type AuditMetrics,
} from '@/src/domain/auditPresets';

type Cell = { train: AuditMetrics; test: AuditMetrics; verdict: string; breakeven: number } | { error: string } | null;

export type SysInfo = {
  username: string;
  assetsTotal: number; assetsByClass: Record<string, number>;
  indicatorsTotal: number; indicatorsByCategory: Record<string, number>;
  env: Record<string, boolean>;
  node: string; now: string; commit: string; region: string;
};

const C = { up: '#089981', down: '#f23645', warn: '#f7a600', dim: '#787b86', line: 'rgba(120,123,134,0.15)' };

export default function SuperConsole({ sys }: { sys: SysInfo }) {
  const [preset, setPreset] = useState<PresetKey>('institusi');
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [running, setRunning] = useState(false);
  const [ranAt, setRanAt] = useState('');
  const [vis, setVis] = useState<any>(null);
  const [visLoading, setVisLoading] = useState(true);

  const runAudit = useCallback(async (p: PresetKey) => {
    setPreset(p); setRunning(true); setCells({});
    const next: Record<string, Cell> = {};
    await Promise.all(AUDIT_SYMBOLS.flatMap((s) => AUDIT_TFS.map(async (tf) => {
      const key = `${s}|${tf}`;
      try {
        const r = await fetch(`/api/backtest/verify?symbol=${s}&tf=${tf}&limit=1500&horizon=100&split=${AUDIT_SPLIT}&${AUDIT_PRESETS[p].qs}`);
        const j = await r.json();
        next[key] = (j?.train && j?.test)
          ? { train: j.train, test: j.test, verdict: j.verdict, breakeven: j.config?.breakevenWinRatePct ?? 0 }
          : { error: j?.error || 'gagal' };
      } catch (e: any) { next[key] = { error: String(e?.message || e) }; }
    })));
    setCells(next); setRunning(false);
    setRanAt(new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC');
  }, []);

  const loadVisitors = useCallback(async () => {
    setVisLoading(true);
    try { const r = await fetch('/api/track'); setVis(await r.json()); }
    catch { setVis({ error: 'gagal memuat' }); }
    setVisLoading(false);
  }, []);

  // AUTO-RUN saat dibuka (inilah "dashboard interaktif" — tak perlu klik).
  useEffect(() => { runAudit('institusi'); loadVisitors(); }, [runAudit, loadVisitors]);

  const logout = async () => { try { await fetch('/api/admin/logout', { method: 'POST' }); } catch {} window.location.reload(); };

  // Agregat TEST (out-of-sample) = headline jujur.
  const ok = Object.values(cells).filter((c: any) => c && !c.error && c.test) as any[];
  const tTrades = ok.reduce((s, c) => s + c.test.totalTrades, 0);
  const tWins = ok.reduce((s, c) => s + c.test.wins, 0);
  const tWR = tTrades ? (tWins / tTrades) * 100 : 0;
  const tNetR = ok.reduce((s, c) => s + c.test.netR, 0);
  const holds = ok.filter((c) => c.verdict === 'EDGE_HOLDS_OOS').length;
  const breakeven = ok[0]?.breakeven ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0c0e12', color: '#d1d4dc', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: `1px solid ${C.line}`, position: 'sticky', top: 0, background: '#0c0e12', zIndex: 5 }}>
        <div style={{ fontWeight: 800, letterSpacing: 1 }}>🛡️ ATLAS·QUANT — Konsol Superadmin</div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: C.dim }}>@{sys.username}</div>
        <button onClick={() => { runAudit(preset); loadVisitors(); }} disabled={running} style={btn(false)}>↻ Refresh semua</button>
        <button onClick={logout} style={btn(false)}>Keluar</button>
      </div>

      <div style={{ padding: 20, display: 'grid', gap: 22, maxWidth: 1200, margin: '0 auto' }}>

        {/* ═══ 1. AUDIT STRATEGI ═══ */}
        <Section title="1 · Audit Strategi T1MO — Out-of-Sample" hint="AUTO-RUN saat dibuka. Angka TEST (out-of-sample) = satu-satunya yang layak dipercaya.">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(Object.keys(AUDIT_PRESETS) as PresetKey[]).map((p) => (
              <button key={p} onClick={() => runAudit(p)} disabled={running} style={btn(preset === p)}>
                {running && preset === p ? 'Running…' : AUDIT_PRESETS[p].label}
              </button>
            ))}
            {ranAt && <span style={{ fontSize: 11, color: C.dim, alignSelf: 'center' }}>· {ranAt}</span>}
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 12, lineHeight: 1.5 }}>{AUDIT_PRESETS[preset].note}</div>

          {ok.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 14 }}>
              <Stat label="Trade TEST (OOS)" value={String(tTrades)} />
              <Stat label={`WR out-of-sample${breakeven ? ` (BE ${breakeven}%)` : ''}`} value={`${tWR.toFixed(1)}%`} color={tWR >= breakeven ? C.up : C.down} />
              <Stat label="Net R test" value={`${tNetR.toFixed(1)}R`} color={tNetR >= 0 ? C.up : C.down} />
              <Stat label="Edge bertahan OOS" value={`${holds}/${ok.length}`} color={holds === ok.length ? C.up : holds === 0 ? C.down : C.warn} />
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: C.dim, textAlign: 'right' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px' }} rowSpan={2}>Pair · TF</th>
                  <th colSpan={2} style={{ textAlign: 'center', borderBottom: `1px solid ${C.line}` }}>TRAIN</th>
                  <th colSpan={4} style={{ textAlign: 'center', color: C.up, borderBottom: `1px solid rgba(8,153,129,0.3)` }}>TEST (out-of-sample)</th>
                  <th rowSpan={2} style={{ textAlign: 'center' }}>Verdict</th>
                </tr>
                <tr style={{ color: C.dim, textAlign: 'right' }}>
                  <th>Trades</th><th>WR</th><th>Trades</th><th>WR</th><th>PF</th><th>Net R</th>
                </tr>
              </thead>
              <tbody>
                {AUDIT_SYMBOLS.flatMap((s) => AUDIT_TFS.map((tf) => {
                  const c: any = cells[`${s}|${tf}`];
                  const v = c && !c.error ? (VERDICT_STYLE[c.verdict] || VERDICT_STYLE.IN_SAMPLE_ONLY) : null;
                  return (
                    <tr key={`${s}${tf}`} style={{ textAlign: 'right', borderTop: `1px solid ${C.line}` }}>
                      <td style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600 }}>{s} · {tf}</td>
                      {!c ? <td colSpan={7} style={{ color: C.dim }}>{running ? '…' : '—'}</td>
                      : c.error ? <td colSpan={7} style={{ color: C.down }}>{c.error}</td>
                      : (<>
                        <td style={{ color: C.dim }}>{c.train.totalTrades}</td>
                        <td style={{ color: '#a3a6af' }}>{c.train.winRatePct}%</td>
                        <td>{c.test.totalTrades}</td>
                        <td style={{ fontWeight: 700, color: c.test.winRatePct >= c.breakeven ? C.up : C.down }}>{c.test.winRatePct}%</td>
                        <td style={{ color: Number(c.test.profitFactor) >= 1 ? C.up : C.down }}>{c.test.profitFactor}</td>
                        <td style={{ color: c.test.netR >= 0 ? C.up : C.down }}>{c.test.netR}R</td>
                        <td style={{ textAlign: 'center' }}>{v && <span style={{ background: v.bg, color: v.fg, padding: '2px 7px', borderRadius: 4, fontSize: 9.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{v.label}</span>}</td>
                      </>)}
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ═══ 2. VISITOR ANALYTICS ═══ */}
        <Section title="2 · Visitor Analytics" hint="Tracker self-hosted (kita punya datanya). Angka resmi lengkap ada di Vercel Web Analytics.">
          {visLoading ? <div style={{ color: C.dim, fontSize: 12 }}>Memuat…</div>
          : vis?.error ? <div style={{ color: C.down, fontSize: 12 }}>{vis.error}</div>
          : vis ? (<>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 14 }}>
              <Stat label="Online (5 mnt)" value={String(vis.totals.online5m)} color={C.up} />
              <Stat label="Views 24 jam" value={String(vis.totals.last24hViews)} />
              <Stat label="Unik 24 jam" value={String(vis.totals.last24hUniques)} />
              <Stat label="Total views" value={String(vis.totals.views)} />
              <Stat label="Total unik" value={String(vis.totals.uniques)} />
            </div>
            <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 10 }}>
              Sumber: <b style={{ color: vis.source === 'supabase' ? C.up : C.warn }}>{vis.source === 'supabase' ? 'Supabase (persisten)' : 'in-memory (reset saat redeploy — buat tabel site_visits untuk persisten)'}</b>
            </div>
            {/* Sparkline 14 hari */}
            <DayBars perDay={vis.perDay} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 14 }}>
              <TopList title="Negara" rows={vis.topCountries} />
              <TopList title="Halaman" rows={vis.topPaths} />
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: C.dim }}>Kunjungan terakhir:</div>
            <div style={{ overflowX: 'auto', marginTop: 4 }}>
              <table style={{ width: '100%', fontSize: 10.5, borderCollapse: 'collapse' }}>
                <thead><tr style={{ color: C.dim, textAlign: 'left' }}><th style={{ padding: '3px 6px' }}>Waktu</th><th>Negara</th><th>Halaman</th><th>Referrer</th></tr></thead>
                <tbody>
                  {vis.recent.map((r: any, i: number) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={{ padding: '3px 6px' }}>{new Date(r.t).toISOString().replace('T', ' ').slice(5, 16)}</td>
                      <td>{r.country}</td><td>{r.path}</td><td style={{ color: C.dim }}>{refHost(r.ref)}</td>
                    </tr>
                  ))}
                  {!vis.recent.length && <tr><td colSpan={4} style={{ padding: 8, color: C.dim }}>Belum ada kunjungan tercatat sejak instance ini hidup.</td></tr>}
                </tbody>
              </table>
            </div>
          </>) : null}
        </Section>

        {/* ═══ 3. SISTEM ═══ */}
        <Section title="3 · Sistem & Konfigurasi" hint="Snapshot server saat halaman dirender.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>
            <Stat label="Total aset" value={String(sys.assetsTotal)} />
            <Stat label="Total indikator" value={String(sys.indicatorsTotal)} />
            <Stat label="Node" value={sys.node} />
            <Stat label="Region" value={sys.region} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <TopList title="Aset per kelas" rows={Object.entries(sys.assetsByClass).map(([k, c]) => ({ k, c }))} />
            <TopList title="Indikator per kategori" rows={Object.entries(sys.indicatorsByCategory).map(([k, c]) => ({ k, c }))} />
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: C.dim }}>Environment (ada/tidak — nilai TIDAK ditampilkan):</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {Object.entries(sys.env).map(([k, present]) => (
              <span key={k} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: present ? 'rgba(8,153,129,0.12)' : 'rgba(242,54,69,0.12)', color: present ? C.up : C.down }}>
                {present ? '✓' : '✗'} {k}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 10.5, color: C.dim }}>Commit {sys.commit} · dirender {sys.now}</div>
        </Section>

        <div style={{ fontSize: 10, color: '#5d6069', textAlign: 'center', padding: '10px 0 30px' }}>
          Halaman tersembunyi — tidak tertaut di menu manapun. Akses via URL /dashboard + login database. Sesi 8 jam.
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#131722', border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: hint ? 2 : 10 }}>{title}</div>
      {hint && <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 12 }}>{hint}</div>}
      {children}
    </div>
  );
}
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#0c0e12', border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || '#d1d4dc' }}>{value}</div>
      <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{label}</div>
    </div>
  );
}
function TopList({ title, rows }: { title: string; rows: Array<{ k: string; c: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.c));
  return (
    <div>
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>{title}</div>
      {rows.length ? rows.map((r) => (
        <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 110, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.k}</div>
          <div style={{ flex: 1, height: 8, background: '#0c0e12', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(r.c / max) * 100}%`, height: '100%', background: '#089981' }} />
          </div>
          <div style={{ width: 34, textAlign: 'right', fontSize: 11 }}>{r.c}</div>
        </div>
      )) : <div style={{ fontSize: 11, color: C.dim }}>—</div>}
    </div>
  );
}
function DayBars({ perDay }: { perDay: Array<{ day: string; views: number; uniques: number }> }) {
  const max = Math.max(1, ...perDay.map((d) => d.views));
  return (
    <div>
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>Views 14 hari terakhir</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 70 }}>
        {perDay.map((d) => (
          <div key={d.day} title={`${d.day}: ${d.views} views, ${d.uniques} unik`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ width: '100%', height: `${(d.views / max) * 55}px`, minHeight: 2, background: '#089981', borderRadius: '2px 2px 0 0' }} />
            <div style={{ fontSize: 8, color: C.dim, transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>{d.day}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function refHost(ref: string): string {
  if (!ref) return '—';
  try { return new URL(ref).host || ref.slice(0, 30); } catch { return ref.slice(0, 30); }
}
function btn(active: boolean): React.CSSProperties {
  return {
    padding: '7px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
    border: `1px solid ${active ? '#089981' : '#2a2e39'}`,
    background: active ? '#089981' : '#1c2030', color: active ? '#fff' : '#d1d4dc',
  };
}
