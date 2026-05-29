import { NextResponse } from 'next/server';
import { getFearGreedIndex } from '@/src/services/macro/fear-greed';

export const dynamic = 'force-dynamic'; // 1 hour

export async function GET() {
  try {
    const data = await getFearGreedIndex();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch sentiment' }, { status: 500 });
  }
}
