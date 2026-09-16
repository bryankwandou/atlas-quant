/**
 * ARBITER STATUS — read-only devnet trading record for the Risk panel.
 *
 * GET /api/arbiter/status
 *
 * The Arbiter bot commits a small public ledger at the end of every scheduled
 * devnet run (counts, realised profit, win rate, last signature). This route
 * fetches that file and normalises it for the panel. It reads only public data:
 * no keys, no wallet secrets, nothing ATLAS-QUANT owns is written.
 *
 * Every number here is reproducible — `lastSig` opens on Solana Explorer and
 * `evidenceUrl` holds the full per-cycle audit.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LEDGER_URL =
  process.env.ARBITER_LEDGER_URL ||
  'https://raw.githubusercontent.com/bryankwandou/arbiter/main/solana-devnet/bot/ledger.json';

const EVIDENCE_URL = 'https://claude.ai/artifact/6rAhm1UbhyQWFRMYZwLCY1';

export async function GET() {
  try {
    const r = await fetch(LEDGER_URL, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`ledger HTTP ${r.status}`);
    const l = await r.json();
    const t = l.totals ?? {};
    const sent = Number(t.sent) || 0;
    const wins = Number(t.wins) || 0;

    return NextResponse.json({
      source: 'arbiter/solana-devnet',
      network: l.network ?? 'devnet',
      live: true,
      updatedAt: l.updatedAt ?? null,
      trades: sent,
      wins,
      losses: Number(t.losses) || 0,
      skipped: Number(t.skipped) || 0,
      cycles: Number(t.cycles) || 0,
      runs: Number(t.runs) || 0,
      atlasReads: Number(t.atlasReads) || 0,
      profit: t.profit ?? null,
      unit: 'tUSD',
      winRate: sent ? Number(((100 * wins) / sent).toFixed(1)) : null,
      program: l.program ?? null,
      vault: l.vault ?? null,
      wallet: l.wallet ?? null,
      lastSig: l.latest?.lastSig ?? null,
      explorer: l.latest?.lastSig
        ? `https://explorer.solana.com/tx/${l.latest.lastSig}?cluster=devnet`
        : null,
      evidenceUrl: EVIDENCE_URL,
    });
  } catch (e) {
    // The panel renders dashes rather than stale numbers when the ledger is
    // unreachable — an unknown state must not look like a flat day.
    return NextResponse.json(
      { source: 'arbiter/solana-devnet', live: false, error: String(e), evidenceUrl: EVIDENCE_URL },
      { status: 200 },
    );
  }
}
