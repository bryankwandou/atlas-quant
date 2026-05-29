import { NextResponse } from 'next/server';
import { getAllMacroData } from '@/src/services/macroData';

// 5-minute server-side cache
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getAllMacroData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
