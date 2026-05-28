/**
 * Email + Password login → Supabase. Mengembalikan JWT HS256 untuk session.
 * Tidak ada hardcoded master.
 */
import { NextResponse } from 'next/server';
import { verifyPassword, findUserByEmail, findUserByEmailOrUsername, bootstrapMasterAccount } from '@/services/auth/users';
import { issueSession } from '@/services/auth/session';

export async function POST(req: Request) {
  try {
    // Ensure master account always exists (survives cold start)
    await bootstrapMasterAccount();

    const { email, password, identifier } = await req.json();
    const id = identifier ?? email; // support both field names
    if (!id || !password) {
      return NextResponse.json({ error: 'Email/username & password wajib diisi.' }, { status: 400 });
    }

    const lookup = String(id).trim();
    // Find user by email or username
    const found = await findUserByEmailOrUsername(
      lookup.includes('@') ? lookup.toLowerCase() : lookup
    );
    if (!found || !found.passwordHash) {
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 401 });
    }
    const { default: bcrypt } = await import('bcryptjs');
    const passwordMatch = await bcrypt.compare(String(password), found.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Password salah.' }, { status: 401 });
    }
    const user = found;

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
