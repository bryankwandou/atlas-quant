/**
 * GET /api/admin/users — daftar semua user (untuk admin panel).
 * Admin-only; non-admin → 403.
 */
import { NextResponse } from 'next/server';
import { verifySession } from '@/services/auth/session';
import { supabaseAdmin } from '@/services/db/supabase';

function getToken(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7);
  return null;
}

export async function GET(req: Request) {
  const token = getToken(req);
  const s = token ? verifySession(token) : null;
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only.' }, { status: 403 });
  }

  const sb = supabaseAdmin();
  if (!sb) {
    return NextResponse.json({
      users: [],
      warning: 'Supabase belum dikonfigurasi. List user kosong (in-memory only).',
    });
  }
  const { data, error } = await sb.from('app_users').select('id, email, username, wallet_address, auth_method, display_name, is_approved, is_admin, role, created_at, last_login_at').order('created_at', { ascending: false }).limit(500);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ users: data ?? [] });
}
