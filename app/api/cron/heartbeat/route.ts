import { NextResponse } from 'next/server';

/**
 * Heartbeat / keep-alive endpoint.
 * Vercel cron pings this every 15 minutes to keep the serverless functions warm.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    ts: Date.now(),
    service: 'ATLAS-QUANT',
    version: '2.0.0',
  });
}
