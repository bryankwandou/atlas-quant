import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/services/admin/session';
import { supabaseAuthAdmin } from '@/src/services/supabase-auth';
import { isUserLocked, ADMIN_USERNAME } from '@/src/services/admin/store';

/**
 * GET /api/admin/users?page=1&perPage=50
 *
 * Lists all Supabase Auth users with admin-relevant fields.
 * Admin's own internal record (admin@atlas-quant.system) is hidden.
 */
export async function GET(req: Request) {
  const session = await verifyAdminSession();
  if (!session.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage = Math.min(200, Math.max(1, parseInt(searchParams.get('perPage') ?? '50', 10)));

  try {
    const { data, error } = await (supabaseAuthAdmin.auth.admin as any).listUsers({ page, perPage });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const users = await Promise.all(
      (data?.users ?? [])
        .filter((u: any) => u.email !== 'admin@atlas-quant.system')
        .map(async (u: any) => ({
          id: u.id,
          email: u.email,
          username: u.user_metadata?.username ?? u.email?.split('@')[0] ?? '—',
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at,
          emailConfirmed: !!u.email_confirmed_at,
          locked: await isUserLocked(u.id),
          banned: u.banned_until && new Date(u.banned_until) > new Date(),
          provider: u.app_metadata?.provider ?? 'email',
        }))
    );

    return NextResponse.json({
      admin: { username: session.username, capabilities: ['list', 'lock', 'unlock', 'delete', 'settings'] },
      page,
      perPage,
      total: data?.users?.length ?? 0,
      users,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'List users error' }, { status: 500 });
  }
}
