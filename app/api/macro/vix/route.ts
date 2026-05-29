import { NextResponse } from 'next/server';
import { getMacroIndicators } from '@/src/services/macro/vix';

export const dynamic = 'force-dynamic'; // 15 min

export async function GET() {
  try {
    const data = await getMacroIndicators();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch macro indicators' }, { status: 500 });
  }
}
