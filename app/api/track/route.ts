/**
 * VISITOR TRACKER self-hosted (milik kita, bukan pihak ketiga).
 *
 * POST /api/track   → catat 1 page view. Body { path }. Negara diambil dari header
 *                     geo Vercel (x-vercel-ip-country), referrer & UA dari header.
 *                     Persist ke Supabase tabel `site_visits` bila ada; selalu juga
 *                     disimpan ke ring-buffer in-memory (untuk "live" tanpa DB).
 * GET  /api/track   → agregat untuk konsol superadmin. DILINDUNGI admin-session.
 *
 * Catatan kejujuran: @vercel/analytics adalah tracker RESMI (angka otoritatif di
 * dashboard Vercel). Tracker ini melengkapi dengan data yang kita miliki sendiri &
 * bisa ditampilkan langsung di /dashboard. In-memory bisa reset saat redeploy/cold
 * start; angka persisten butuh tabel Supabase `site_visits`.
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyAdminSession } from '@/src/services/admin/session';
import { getSupabaseAdmin } from '@/src/services/supabase';

export const dynamic = 'force-dynamic';

type Visit = { t: number; path: string; country: string; ref: string; ipHash: string; ua: string };

// Ring-buffer in-memory (per instance). Cukup untuk "siapa online sekarang".
const g = globalThis as any;
if (!g.__atlasVisits) g.__atlasVisits = [] as Visit[];
const MEM: Visit[] = g.__atlasVisits;
const MAX_MEM = 5000;

function ipHashOf(req: Request): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip') || 'unknown';
  return crypto.createHash('sha256').update(ip + '|atlas').digest('hex').slice(0, 16);
}

export async function POST(req: Request) {
  try {
    let path = '/';
    try { const b = await req.json(); if (b?.path) path = String(b.path).slice(0, 200); } catch { /* no body */ }
    const v: Visit = {
      t: Date.now(),
      path,
      country: req.headers.get('x-vercel-ip-country') || '??',
      ref: (req.headers.get('referer') || '').slice(0, 200),
      ipHash: ipHashOf(req),
      ua: (req.headers.get('user-agent') || '').slice(0, 200),
    };
    MEM.push(v);
    if (MEM.length > MAX_MEM) MEM.splice(0, MEM.length - MAX_MEM);

    // Best-effort persist (silent kalau tabel belum ada).
    try {
      await getSupabaseAdmin().from('site_visits').insert({
        path: v.path, country: v.country, ref: v.ref, ip_hash: v.ipHash, ua: v.ua,
      });
    } catch { /* tabel belum dibuat — in-memory tetap jalan */ }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 }); // jangan pernah ganggu UX
  }
}

function aggregate(visits: Visit[]) {
  const now = Date.now();
  const DAY = 86_400_000;
  const within = (ms: number) => visits.filter((v) => now - v.t <= ms);
  const uniq = (arr: Visit[]) => new Set(arr.map((v) => v.ipHash)).size;
  const topOf = (arr: Visit[], key: keyof Visit, n = 8) => {
    const m = new Map<string, number>();
    for (const v of arr) { const k = String(v[key]) || '??'; m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => ({ k, c }));
  };
  // 14 hari terakhir per-hari
  const days: Array<{ day: string; views: number; uniques: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const start = now - (i + 1) * DAY, end = now - i * DAY;
    const slice = visits.filter((v) => v.t >= start && v.t < end);
    days.push({ day: new Date(end).toISOString().slice(5, 10), views: slice.length, uniques: uniq(slice) });
  }
  return {
    totals: {
      views: visits.length,
      uniques: uniq(visits),
      last24hViews: within(DAY).length,
      last24hUniques: uniq(within(DAY)),
      online5m: uniq(within(5 * 60_000)),
    },
    topPaths: topOf(visits, 'path'),
    topCountries: topOf(visits, 'country'),
    topRef: topOf(visits.filter((v) => v.ref), 'ref', 6),
    perDay: days,
    recent: visits.slice(-25).reverse().map((v) => ({
      t: v.t, path: v.path, country: v.country, ref: v.ref,
      ua: v.ua.slice(0, 60),
    })),
  };
}

export async function GET() {
  const s = await verifyAdminSession();
  if (!s.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Coba baca dari Supabase (persisten); fallback ke in-memory.
  let source = 'memory';
  let visits: Visit[] = MEM;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('site_visits')
      .select('created_at, path, country, ref, ip_hash, ua')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (!error && data && data.length) {
      source = 'supabase';
      visits = data.map((r: any) => ({
        t: new Date(r.created_at).getTime(), path: r.path || '/', country: r.country || '??',
        ref: r.ref || '', ipHash: r.ip_hash || '', ua: r.ua || '',
      }));
    }
  } catch { /* pakai memory */ }

  return NextResponse.json({ source, ...aggregate(visits) });
}
