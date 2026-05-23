import { NextResponse } from 'next/server';
import { supabaseAuth } from '@/src/services/supabase-auth';
import { getEmailByUsername, getUsernameByUserId } from '@/src/services/auth';
import { isUserLocked } from '@/src/services/admin/store';

/**
 * NOTE: The previous hardcoded admin bypass + hardcoded Solana wallet
 * address have been removed. Admin access is now handled exclusively
 * via /api/admin/login + cookie-session (admins cannot impersonate users
 * via this endpoint).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body as { identifier?: string; password?: string };

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Identifier and password are required.' }, { status: 400 });
    }

    // ── Resolve email ───────────────────────────────────────────────────────
    let email: string;
    if (identifier.includes('@')) {
      email = identifier;
    } else {
      const found = await getEmailByUsername(identifier);
      if (!found) {
        return NextResponse.json({ error: 'Username not found.' }, { status: 404 });
      }
      email = found;
    }

    // ── Supabase sign-in ────────────────────────────────────────────────────
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      const msg = error?.message ?? 'Invalid credentials.';
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    // Admin lock check
    if (await isUserLocked(data.user.id)) {
      return NextResponse.json(
        { error: 'Account locked by administrator. Contact support.' },
        { status: 403 }
      );
    }

    // Resolve username from profile (best-effort — fall back to user_metadata)
    const username =
      (await getUsernameByUserId(data.user.id)) ??
      (data.user.user_metadata?.username as string | undefined) ??
      email.split('@')[0];

    return NextResponse.json({
      success: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token: data.session.access_token,
      session_token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        username,
        role: 'user',
      },
    });
  } catch (err: unknown) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
