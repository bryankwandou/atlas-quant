import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAuth } from '@/src/services/supabase-auth';
import { getEmailByUsername, getUsernameByUserId } from '@/src/services/auth';

const SESSION_SECRET = process.env.CRON_SECRET || 'fallback-secret';

/** Issue a legacy HMAC token for the admin bypass path. */
function issueAdminToken(publicKey: string): string {
  const payload = Buffer.from(
    JSON.stringify({ publicKey, exp: Date.now() + 24 * 60 * 60 * 1000 })
  ).toString('base64');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body as { identifier?: string; password?: string };

    // ── Admin bypass ────────────────────────────────────────────────────────
    if (identifier === 'nayrbryanGaming' && password === 'nayrbryanGaming') {
      const adminPublicKey =
        process.env.MASTER_PUBLIC_KEY || 'BgpTkU2YVazAhBvbBxBgMncZ7kAaTXRFvygv7GQqbUgA';
      const token = issueAdminToken(adminPublicKey);
      return NextResponse.json({
        success: true,
        message: 'MASTER_ADMIN_VERIFIED',
        token,
        session_token: token,
        access_token: token,
        refresh_token: null,
        publicKey: adminPublicKey,
        role: 'master',
        bypass: true,
        user: {
          id: 'master',
          email: 'admin@atlas-quant.internal',
          username: 'nayrbryanGaming',
          role: 'master',
        },
      });
    }

    // ── Basic validation ────────────────────────────────────────────────────
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
