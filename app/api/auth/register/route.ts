import { NextResponse } from 'next/server';
import { supabaseAuthAdmin } from '@/src/services/supabase-auth';
import { createUserProfile, isUsernameAvailable } from '@/src/services/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username, password } = body as {
      email?: string;
      username?: string;
      password?: string;
    };

    // ── Validation ─────────────────────────────────────────────────────────
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }
    if (!username || !USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters: letters, numbers, or underscores.' },
        { status: 400 }
      );
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    // ── Username availability ───────────────────────────────────────────────
    const available = await isUsernameAvailable(username);
    if (!available) {
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 });
    }

    // ── Create Supabase Auth user ───────────────────────────────────────────
    const { data, error: createError } = await supabaseAuthAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (createError || !data.user) {
      const msg = createError?.message ?? 'Failed to create account.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // ── Insert public.users profile ─────────────────────────────────────────
    try {
      await createUserProfile(data.user.id, username, email);
    } catch (profileError: unknown) {
      // Roll back the auth user to keep state consistent
      await supabaseAuthAdmin.auth.admin.deleteUser(data.user.id);
      const msg = profileError instanceof Error ? profileError.message : 'Profile creation failed.';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Account created. You can now log in.',
    });
  } catch (err: unknown) {
    console.error('[register]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
