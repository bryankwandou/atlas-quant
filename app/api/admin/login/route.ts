/**
 * POST /api/admin/login
 * Hardcoded master admin login.
 * Default credentials per perintah Presiden:
 *   username: nayrbryanGaming
 *   password: @Nataliamaria12345
 *
 * Rotatable via env ADMIN_MASTER_PASSWORD or ADMIN_MASTER_PASSWORD_HASH.
 *
 * Returns short-lived JWT (admin scope) yang DIPISAH dari token user biasa
 * supaya jurnal/setting user tidak bisa diakses pakai admin token (defense in depth).
 */
import { NextResponse } from 'next/server';
import { verifyAdmin, ADMIN_USERNAME } from '@/services/admin/hardcoded-admin';
import { issueSession } from '@/services/auth/session';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username & password wajib.' }, { status: 400 });
    }
    const ok = await verifyAdmin(String(username).trim(), String(password));
    if (!ok) {
      return NextResponse.json({ error: 'Kredensial admin salah.' }, { status: 401 });
    }
    const token = issueSession(
      { uid: 'admin:hardcoded', method: 'admin', email: undefined, role: 'admin' },
      4 * 60 * 60 * 1000, // 4 hours
    );
    return NextResponse.json({
      token,
      session_token: token,
      user: { id: 'admin:hardcoded', username: ADMIN_USERNAME, displayName: 'Atlas Quant Master', role: 'admin', isAdmin: true },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error', detail: String(e) }, { status: 500 });
  }
}
