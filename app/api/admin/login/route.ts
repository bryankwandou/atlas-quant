import { NextResponse } from 'next/server';
import { verifyAdminPassword, readPublicConfig, ADMIN_USERNAME } from '@/src/services/admin/store';
import { issueAdminSessionCookie } from '@/src/services/admin/session';

/**
 * POST /api/admin/login
 * Body: { username, password }
 *
 * On success → sets the admin session cookie and returns the public
 * config (signup mode, isBootstrap flag, locked count).
 *
 * Rate-limited via process-local sliding window to slow brute force.
 */

const ATTEMPTS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;

function rateLimit(key: string): boolean {
  const now = Date.now();
  const arr = (ATTEMPTS.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  ATTEMPTS.set(key, arr);
  return arr.length <= MAX_PER_WINDOW;
}

/**
 * GET /api/admin/login — diagnostik non-rahasia untuk troubleshooting login:
 * hanya memberi tahu apakah password masih bootstrap (belum pernah diganti)
 * dan kapan terakhir diganti. TIDAK membocorkan hash/salt/password.
 */
export async function GET() {
  const config = await readPublicConfig();
  const envPasswordSet = !!process.env.ADMIN_PASSWORD;
  return NextResponse.json({
    usingBootstrapPassword: config.isBootstrap,
    passwordChangedAt: config.passwordChangedAt,
    envPasswordSet,   // true = password diambil dari env ADMIN_PASSWORD (pilihan Anda)
    expectedUsername: ADMIN_USERNAME,
    hint: config.isBootstrap
      ? (envPasswordSet
          ? 'Password diambil dari env ADMIN_PASSWORD yang Anda set di Vercel. Ketik persis nilai itu.'
          : 'Password masih bawaan (belum pernah diganti). Jika login gagal, periksa ejaan/typo — password case-sensitive.')
      : 'Password SUDAH pernah diganti — gunakan password baru, bukan bawaan.',
  });
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown';
    if (!rateLimit(`login:${ip}`)) {
      return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 });
    }

    const { username, password } = (await req.json()) as { username?: string; password?: string };
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const ok = await verifyAdminPassword(username, password);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
    }

    const cookie = issueAdminSessionCookie();
    const config = await readPublicConfig();
    const res = NextResponse.json({
      success: true,
      username: ADMIN_USERNAME,
      config,
      warning: config.isBootstrap
        ? 'You are signed in with bootstrap credentials. Please change your password immediately.'
        : null,
    });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Admin login error' }, { status: 500 });
  }
}
