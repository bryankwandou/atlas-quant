/**
 * Email/Username + Password login.
 * Accepts email OR username in the identifier field.
 * Master account auto-bootstrapped on every cold start.
 */
import { NextResponse } from 'next/server';
import { verifyPasswordByIdentifier, findUserByEmail, bootstrapMasterAccount } from '@/services/auth/users';
import { issueSession } from '@/services/auth/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = String(body.identifier ?? body.email ?? '').trim();
    const password   = String(body.password ?? '');

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/username & password wajib diisi.' }, { status: 400 });
    }

    // ── Master override: always works from env vars, no DB lookup needed ──────
    const masterUser  = process.env.MASTER_USERNAME || 'nayrbryanGaming';
    const masterPass  = process.env.MASTER_PASSWORD || '@Nataliamaria12345';
    // Accept any of the known master email/username variants
    const MASTER_IDENTIFIERS = [
      masterUser,
      process.env.MASTER_EMAIL || 'nayrbryangaming3@gmail.com',
      'nayrbryanGaming01@gmail.com',
      'nayrbryangaming01@gmail.com',
      'nayrbryan',
    ].map(s => s.toLowerCase());
    const masterEmail = process.env.MASTER_EMAIL || 'nayrbryangaming3@gmail.com';
    const isMaster = MASTER_IDENTIFIERS.includes(identifier.toLowerCase()) && password === masterPass;
    if (isMaster) {
      const token = issueSession({ uid: 'master-00', method: 'admin', email: masterEmail, role: 'master' });
      return NextResponse.json({
        token, session_token: token,
        user: { id: 'master-00', email: masterEmail, displayName: 'Master', role: 'master' },
      });
    }

    // Ensure superaccount exists in DB (async, non-blocking for DB-registered users)
    bootstrapMasterAccount().catch(() => {});

    const user = await verifyPasswordByIdentifier(identifier, password);
    if (!user) {
      return NextResponse.json({ error: 'Email, username, atau password salah.' }, { status: 401 });
    }

    if (!user.isApproved) {
      return NextResponse.json({ error: 'Akun belum disetujui.', status: 'pending' }, { status: 403 });
    }

    const token = issueSession({
      uid:    user.id,
      method: 'email',
      email:  user.email,
      role:   user.isAdmin ? 'master' : user.role,
    });

    return NextResponse.json({
      token,
      session_token: token,
      user: {
        id:          user.id,
        email:       user.email,
        displayName: user.displayName,
        role:        user.isAdmin ? 'master' : user.role,
      },
    });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    console.error('[login] error:', msg);
    return NextResponse.json({ error: msg || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get('email');
  if (!u) return NextResponse.json({ error: 'email param wajib' }, { status: 400 });
  const exists = !!(await findUserByEmail(u).catch(() => null));
  return NextResponse.json({ exists });
}
