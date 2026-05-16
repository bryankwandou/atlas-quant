/**
 * Compute indicator on supplied OHLCV (atau ambil dari Binance/Yahoo).
 * POST { code, params, symbol?, timeframe?, candles?, limit? }
 */
import { NextResponse } from 'next/server';
import { runIndicator } from '@/core/indicators/registry';
import { fetchOhlcv } from '@/services/market/provider';

export async function POST(req: Request) {
  try {
    const { code, params = {}, symbol, timeframe = '15m', candles, limit = 500 } = await req.json();
    if (!code) return NextResponse.json({ error: 'code wajib' }, { status: 400 });

    let bars = candles as Array<{ open: number; high: number; low: number; close: number; volume: number; time: number }> | undefined;
    if (!bars && symbol) {
      bars = await fetchOhlcv({ symbol, timeframe, limit });
    }
    if (!bars || bars.length < 5) {
      return NextResponse.json({ error: 'Data candles tidak cukup. Sertakan candles[] atau symbol+timeframe.' }, { status: 400 });
    }

    const ctx = {
      open: bars.map((b) => b.open),
      high: bars.map((b) => b.high),
      low: bars.map((b) => b.low),
      close: bars.map((b) => b.close),
      volume: bars.map((b) => b.volume ?? 0),
      time: bars.map((b) => b.time),
    };

    const result = runIndicator(code, ctx, params);
    if (!result) return NextResponse.json({ error: `Indikator ${code} tidak ditemukan.` }, { status: 404 });

    return NextResponse.json({
      code,
      params,
      symbol,
      timeframe,
      bars: bars.length,
      ...result,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error', detail: String(e) }, { status: 500 });
  }
}
