/**
 * Email + Password register. bcrypt hash. Auto-approved.
 * Master superaccount bootstrapped on every cold start.
 */
import { NextResponse } from 'next/server';
import { createEmailUser, bootstrapMasterAccount } from '@/services/auth/users';
import { issueSession } from '@/services/auth/session';

export async function POST(req: Request) {
  try {
    await bootstrapMasterAccount();

    if (process.env.WALLET_ONLY_REGISTER === 'true') {
      return NextResponse.json({ error: 'Email register dinonaktifkan.' }, { status: 403 });
    }

    const { email, password, username, displayName } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email & password wajib.' }, { status: 400 });
    }
    if (!username) {
      return NextResponse.json({ error: 'Username wajib.' }, { status: 400 });
    }

    const user = await createEmailUser({
      email:       String(email).toLowerCase().trim(),
      password:    String(password),
      username:    String(username).trim(),
      displayName: String(displayName ?? username).trim(),
    });

    const token = issueSession({ uid: user.id, method: 'email', email: user.email, role: user.role });

    return NextResponse.json({
      token,
      session_token: token,
      user: {
        id:          user.id,
        email:       user.email,
        displayName: user.displayName,
        role:        user.role,
      },
    });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    console.error('[register] error:', msg);
    const status =
      msg.toLowerCase().includes('terdaftar') || msg.toLowerCase().includes('already') ? 409 :
      msg.toLowerCase().includes('invalid')   || msg.toLowerCase().includes('minimal')  ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
