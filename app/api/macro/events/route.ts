import { NextResponse } from 'next/server';
import { getEconomicCalendar } from '@/src/services/macro/economic-events';

export const revalidate = 1800; // 30 min

export async function GET() {
  try {
    const data = await getEconomicCalendar();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch events' }, { status: 500 });
  }
}
