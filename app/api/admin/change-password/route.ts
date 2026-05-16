import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/services/admin/session';
import { setAdminPassword } from '@/src/services/admin/store';

export async function POST(req: Request) {
  const session = await verifyAdminSession();
  if (!session.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { currentPassword, newPassword } = (await req.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'currentPassword and newPassword are required.' }, { status: 400 });
    }
    const result = await setAdminPassword(currentPassword, newPassword);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Password change error' }, { status: 500 });
  }
}
