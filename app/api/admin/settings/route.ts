/**
 * /api/admin/settings — global admin settings (registration mode dll).
 *
 *   GET   → ambil current settings (siapa pun bisa baca — UI registrasi butuh mode).
 *   PATCH → admin-only, update toggle.
 */
import { NextResponse } from 'next/server';
import { verifySession } from '@/services/auth/session';
import { getAdminSettings, updateAdminSettings, type RegistrationMode } from '@/services/admin/settings';

function getToken(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7);
  return null;
}

export async function GET() {
  const s = await getAdminSettings();
  return NextResponse.json({ settings: s });
}

export async function PATCH(req: Request) {
  const token = getToken(req);
  const s = token ? verifySession(token) : null;
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only.' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};
  if (body.registrationMode && ['free', 'pending_approval', 'closed'].includes(body.registrationMode as string)) {
    patch.registrationMode = body.registrationMode as RegistrationMode;
  }
  if (typeof body.walletAutoApprove === 'boolean') patch.walletAutoApprove = body.walletAutoApprove;
  if (typeof body.emailAutoApprove === 'boolean') patch.emailAutoApprove = body.emailAutoApprove;
  if (typeof body.maintenanceMode === 'boolean') patch.maintenanceMode = body.maintenanceMode;
  if (typeof body.announcement === 'string' || body.announcement === null) patch.announcement = body.announcement;

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'No valid settings to update.' }, { status: 400 });
  }
  const next = await updateAdminSettings(patch);
  return NextResponse.json({ settings: next });
}
