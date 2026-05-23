import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/services/admin/session';
import { lockUser, unlockUser } from '@/src/services/admin/store';
import { supabaseAuthAdmin } from '@/src/services/supabase-auth';

/**
 * POST /api/admin/users/[id]/lock
 * Body: { locked: boolean }
 *
 * Admin-only capability. Lock prevents login (checked in /api/auth/login).
 * Capability is intentionally limited — admin cannot mint sessions or
 * impersonate the user.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyAdminSession();
  if (!session.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const { locked } = (await req.json()) as { locked?: boolean };
    if (typeof locked !== 'boolean') {
      return NextResponse.json({ error: 'locked (boolean) is required.' }, { status: 400 });
    }

    // Verify the target exists & isn't the admin internal record
    try {
      const { data } = await (supabaseAuthAdmin.auth.admin as any).getUserById(id);
      if (!data?.user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      if (data.user.email === 'admin@atlas-quant.system') {
        return NextResponse.json({ error: 'Cannot modify the admin record.' }, { status: 403 });
      }
    } catch {}

    if (locked) {
      await lockUser(id);
    } else {
      await unlockUser(id);
    }
    return NextResponse.json({ success: true, userId: id, locked });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Lock toggle error' }, { status: 500 });
  }
}
