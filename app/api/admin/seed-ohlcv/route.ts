import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/services/admin/session';

/**
 * POST /api/admin/seed-ohlcv
 * Body: { symbols?: string[]; timeframes?: string[]; perSymbolLimit?: number }
 *
 * Bulk-ingest historical OHLCV into Supabase market_ohlcv.
 * Routes through the multi-source aggregator — no dummy data.
 * Admin-only. Triggered from /admin/console "Seed market data" button.
 */
export async function POST(req: NextRequest) {
  const s = await verifyAdminSession();
  if (!s.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const opts = await req.json().catch(() => ({}));
    const { seedOhlcv } = await import('@/src/services/admin/ohlcvSeeder');
    const result = await seedOhlcv(opts);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Seed error' }, { status: 500 });
  }
}
