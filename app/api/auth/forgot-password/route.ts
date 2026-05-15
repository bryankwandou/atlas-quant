import { NextResponse } from 'next/server';
import { supabaseAuth } from '@/src/services/supabase-auth';
import { getEmailByUsername } from '@/src/services/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier } = body as { identifier?: string };

    if (!identifier || identifier.trim().length === 0) {
      return NextResponse.json({ error: 'Email or username is required.' }, { status: 400 });
    }

    // Resolve to an email address
    let email: string;
    if (identifier.includes('@')) {
      email = identifier.trim();
    } else {
      const found = await getEmailByUsername(identifier.trim());
      if (!found) {
        // Do not leak that the username doesn't exist — return success regardless
        return NextResponse.json({ success: true, message: 'If that account exists, a reset link was sent.' });
      }
      email = found;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });

    // Always return success to avoid leaking whether the email is registered
    return NextResponse.json({
      success: true,
      message: 'If that account exists, a password reset link has been sent.',
    });
  } catch (err: unknown) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
