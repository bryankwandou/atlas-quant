import { NextResponse } from 'next/server';
import { getCentralBankData } from '@/src/services/macro/central-bank';

export const dynamic = 'force-dynamic'; // 24 hours

export async function GET() {
  try {
    const data = await getCentralBankData();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch CB rates' }, { status: 500 });
  }
}
