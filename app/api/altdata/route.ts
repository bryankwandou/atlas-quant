/**
 * GET /api/altdata?symbol=BTCUSDT — kembalikan snapshot alt-data factor.
 * Source: Fear&Greed, CryptoPanic, OpenWeather (jika ada), Polymarket, dll.
 */
import { NextResponse } from 'next/server';
import { altFactorSnapshot, fetchFearGreed, fetchCryptoPanic, fetchEconomicEvents } from '@/services/altdata';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') ?? undefined;
  const verbose = url.searchParams.get('verbose') === 'true';

  const snapshot = await altFactorSnapshot(symbol);

  if (!verbose) {
    return NextResponse.json({ symbol, snapshot });
  }

  const [fg, news, econ] = await Promise.all([
    fetchFearGreed().catch(() => null),
    symbol ? fetchCryptoPanic(symbol).catch(() => null) : Promise.resolve(null),
    fetchEconomicEvents().catch(() => null),
  ]);

  return NextResponse.json({
    symbol,
    snapshot,
    detail: { fearGreed: fg, news, economicEvents: econ },
  });
}
