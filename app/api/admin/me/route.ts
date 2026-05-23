import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/services/admin/session';
import { readPublicConfig } from '@/src/services/admin/store';

export async function GET() {
  const session = await verifyAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const config = await readPublicConfig();
  return NextResponse.json({ username: session.username, config });
}
