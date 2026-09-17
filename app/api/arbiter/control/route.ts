import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/services/admin/session';

/**
 * Arbiter bot control — the write side of the Trade Bot panel.
 *
 * GET  → current control.json (kill switch + risk limits) the bot obeys.
 * POST → admin only.
 *   { action: 'set', enabled?, riskPct?, maxDailyLoss?, maxTradesPerDay?, cooldownSec? }
 *        commits control.json to the Arbiter repo; the bot re-reads it every cycle.
 *   { action: 'trade-now' }
 *        dispatches the Solana devnet bot workflow immediately.
 *
 * The GitHub token (ARBITER_GH_TOKEN) stays server-side.
 */

export const dynamic = 'force-dynamic';

const REPO = 'bryankwandou/arbiter';
const PATH = 'solana-devnet/bot/control.json';
const WORKFLOW = 'solana-devnet-bot.yml';
const DEFAULTS = { enabled: true, riskPct: 100, maxDailyLoss: 50, maxTradesPerDay: 500, cooldownSec: 0 };

function gh(path: string, init: RequestInit = {}) {
  const token = process.env.ARBITER_GH_TOKEN?.trim();
  return fetch(`https://api.github.com${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
}

async function readControl() {
  const r = await gh(`/repos/${REPO}/contents/${PATH}?ref=main`);
  if (!r.ok) return { control: { ...DEFAULTS }, sha: null as string | null };
  const j = await r.json();
  const control = { ...DEFAULTS, ...JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')) };
  return { control, sha: j.sha as string };
}

async function lastRuns() {
  const r = await gh(`/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=3`);
  if (!r.ok) return [];
  const j = await r.json();
  return (j.workflow_runs || []).map((w: any) => ({
    id: w.id, status: w.status, conclusion: w.conclusion, event: w.event,
    createdAt: w.created_at, url: w.html_url,
  }));
}

const clamp = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

export async function GET() {
  try {
    const [{ control }, runs] = await Promise.all([readControl(), lastRuns()]);
    return NextResponse.json({ control, runs, writable: !!process.env.ARBITER_GH_TOKEN });
  } catch (e: any) {
    return NextResponse.json({ control: DEFAULTS, runs: [], writable: false, error: String(e?.message || e) });
  }
}

export async function POST(req: Request) {
  const session = await verifyAdminSession();
  if (!session.ok) return NextResponse.json({ error: 'Login admin dulu untuk mengendalikan bot.' }, { status: 401 });
  if (!process.env.ARBITER_GH_TOKEN) return NextResponse.json({ error: 'ARBITER_GH_TOKEN belum diset di server.' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.action === 'trade-now') {
    const r = await gh(`/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: 'POST',
      body: JSON.stringify({ ref: 'main' }),
    });
    if (r.status !== 204) return NextResponse.json({ error: `GitHub menolak: ${r.status} ${await r.text()}` }, { status: 502 });
    return NextResponse.json({ ok: true, action: 'trade-now', by: session.username });
  }

  if (body.action === 'set') {
    const { control: cur, sha } = await readControl();
    const next = {
      enabled: typeof body.enabled === 'boolean' ? body.enabled : cur.enabled,
      riskPct: clamp(body.riskPct ?? cur.riskPct, 1, 100, DEFAULTS.riskPct),
      maxDailyLoss: clamp(body.maxDailyLoss ?? cur.maxDailyLoss, 0, 1_000_000, DEFAULTS.maxDailyLoss),
      maxTradesPerDay: Math.round(clamp(body.maxTradesPerDay ?? cur.maxTradesPerDay, 0, 100_000, DEFAULTS.maxTradesPerDay)),
      cooldownSec: Math.round(clamp(body.cooldownSec ?? cur.cooldownSec, 0, 86_400, DEFAULTS.cooldownSec)),
      updatedAt: new Date().toISOString(),
      updatedBy: `atlas-quant:${session.username}`,
    };
    const what = next.enabled !== cur.enabled ? (next.enabled ? 'resume' : 'KILL SWITCH') : 'risk limits';
    const r = await gh(`/repos/${REPO}/contents/${PATH}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `control: ${what} from ATLAS-QUANT panel [skip ci]`,
        content: Buffer.from(JSON.stringify(next, null, 2) + '\n').toString('base64'),
        branch: 'main',
        ...(sha ? { sha } : {}),
      }),
    });
    if (!r.ok) return NextResponse.json({ error: `GitHub menolak: ${r.status} ${await r.text()}` }, { status: 502 });
    return NextResponse.json({ ok: true, control: next });
  }

  return NextResponse.json({ error: 'action harus "set" atau "trade-now"' }, { status: 400 });
}
