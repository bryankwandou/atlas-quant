/**
 * Email + Password login → Supabase. Mengembalikan JWT HS256 untuk session.
 * Tidak ada hardcoded master.
 */
import { NextResponse } from 'next/server';
import { verifyPassword, findUserByEmail } from '@/services/auth/users';
import { issueSession } from '@/services/auth/session';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email & password wajib diisi.' }, { status: 400 });
    }

    const user = await verifyPassword(String(email).toLowerCase().trim(), String(password));
    if (!user) {
      return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
    }

    if (!user.isApproved) {
      return NextResponse.json({ error: 'Akun belum disetujui admin.', status: 'pending' }, { status: 403 });
    }

    const token = issueSession({
      uid: user.id,
      method: 'email',
      email: user.email,
      role: user.isAdmin ? 'admin' : user.role,
    });

    return NextResponse.json({
      token,
      session_token: token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.isAdmin ? 'admin' : user.role,
      },
    });
  } catch (e) {
    // Surface dev-time setup issues (Supabase missing) via 503
    const msg = String(e instanceof Error ? e.message : e);
    if (msg.toLowerCase().includes('supabase')) {
      return NextResponse.json({ error: 'Database belum dikonfigurasi. Set SUPABASE_URL / KEY di .env.local.', detail: msg }, { status: 503 });
    }
    return NextResponse.json({ error: 'Internal Server Error', detail: msg }, { status: 500 });
  }
}

// Echo to check user existence (admin/debug)
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get('email');
  if (!u) return NextResponse.json({ error: 'email param wajib' }, { status: 400 });
  const exists = !!(await findUserByEmail(u).catch(() => null));
  return NextResponse.json({ exists });
}
