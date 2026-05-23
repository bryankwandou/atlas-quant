import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/services/admin/session';
import { supabaseAuthAdmin } from '@/src/services/supabase-auth';
import { unlockUser } from '@/src/services/admin/store';

/**
 * DELETE /api/admin/users/[id]
 *
 * Hard-deletes the user from Supabase Auth and clears their lock entry.
 * Refuses to delete the admin record itself.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyAdminSession();
  if (!session.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;

    try {
      const { data } = await (supabaseAuthAdmin.auth.admin as any).getUserById(id);
      if (!data?.user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      if (data.user.email === 'admin@atlas-quant.system') {
        return NextResponse.json({ error: 'Cannot delete the admin record.' }, { status: 403 });
      }
    } catch {}

    const { error } = await supabaseAuthAdmin.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await unlockUser(id);

    // Best-effort profile cleanup
    try {
      await supabaseAuthAdmin.from('users').delete().eq('id', id);
    } catch {}

    return NextResponse.json({ success: true, userId: id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Delete user error' }, { status: 500 });
  }
}
