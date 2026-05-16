/**
 * /api/admin/users/[id]
 *   PATCH → lock/unlock user (only flips is_approved)
 *   DELETE → hapus user
 *
 * Aksi yang DILARANG (anti-hijack):
 *   - ganti password user
 *   - promote ke admin
 *   - login sebagai user
 */
import { NextResponse } from 'next/server';
import { verifySession } from '@/services/auth/session';
import { supabaseAdmin } from '@/services/db/supabase';

function getToken(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7);
  return null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = getToken(req);
  const s = token ? verifySession(token) : null;
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only.' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = body.action as 'lock' | 'unlock' | undefined;
  if (action !== 'lock' && action !== 'unlock') {
    return NextResponse.json({ error: 'action wajib "lock" atau "unlock".' }, { status: 400 });
  }
  const sb = supabaseAdmin();
  if (!sb) {
    return NextResponse.json({ error: 'Supabase belum dikonfigurasi.' }, { status: 503 });
  }
  const { error } = await sb.from('app_users')
    .update({ is_approved: action === 'unlock' })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id, action });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = getToken(req);
  const s = token ? verifySession(token) : null;
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only.' }, { status: 403 });
  }
  const sb = supabaseAdmin();
  if (!sb) {
    return NextResponse.json({ error: 'Supabase belum dikonfigurasi.' }, { status: 503 });
  }
  // Refuse to delete other admins (defense in depth)
  const { data: target } = await sb.from('app_users').select('is_admin').eq('id', id).maybeSingle();
  if (target?.is_admin) {
    return NextResponse.json({ error: 'Tidak bisa hapus akun admin.' }, { status: 403 });
  }
  const { error } = await sb.from('app_users').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id, deleted: true });
}
