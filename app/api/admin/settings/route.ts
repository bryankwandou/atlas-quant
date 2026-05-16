import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/services/admin/session';
import { getSignupMode, setSignupMode, readPublicConfig } from '@/src/services/admin/store';

export async function GET() {
  const session = await verifyAdminSession();
  if (!session.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const config = await readPublicConfig();
  return NextResponse.json({ config, signupMode: await getSignupMode() });
}

export async function POST(req: Request) {
  const session = await verifyAdminSession();
  if (!session.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { signupMode } = (await req.json()) as { signupMode?: 'open' | 'approval' };
    if (signupMode !== 'open' && signupMode !== 'approval') {
      return NextResponse.json({ error: 'signupMode must be "open" or "approval".' }, { status: 400 });
    }
    await setSignupMode(signupMode);
    return NextResponse.json({ success: true, signupMode });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Settings update error' }, { status: 500 });
  }
}
