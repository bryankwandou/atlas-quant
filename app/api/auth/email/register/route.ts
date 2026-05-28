/**
 * Email + Password register. Password hashed (bcrypt). Otomatis approved
 * untuk email auth (kecuali ENV WALLET_ONLY_REGISTER=true).
 */
import { NextResponse } from 'next/server';
import { createEmailUser, bootstrapMasterAccount } from '@/services/auth/users';
import { issueSession } from '@/services/auth/session';

export async function POST(req: Request) {
  try {
    await bootstrapMasterAccount();
    if (process.env.WALLET_ONLY_REGISTER === 'true') {
      return NextResponse.json({ error: 'Email register dinonaktifkan; gunakan wallet.' }, { status: 403 });
    }
    const { email, password, username, displayName } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email & password wajib.' }, { status: 400 });
    }
    const user = await createEmailUser({
      email: String(email).toLowerCase().trim(),
      password: String(password),
      username,
      displayName,
    });
    const token = issueSession({ uid: user.id, method: 'email', email: user.email });
    return NextResponse.json({
      token,
      session_token: token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    const status = msg.toLowerCase().includes('terdaftar') ? 409
      : msg.toLowerCase().includes('invalid') ? 400
      : msg.toLowerCase().includes('minimal') ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
