/**
 * Atlas Quant · Admin session cookie
 * --------------------------------------------------------------------
 * Cookie-based, HMAC-signed admin session. Separate codepath from the
 * end-user wallet auth — admin tokens cannot be used as user tokens.
 */

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { ADMIN_USERNAME } from './store';

const COOKIE = 'atlas_admin_session';
const SECRET = () => process.env.ADMIN_SESSION_SECRET || process.env.CRON_SECRET || 'fallback-admin-secret-change-me';
const TTL_MS = 8 * 60 * 60 * 1000;   // 8 hours

interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
  scope: 'admin';
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET()).update(payload).digest('hex');
}

export function issueAdminSessionCookie(): { name: string; value: string; options: any } {
  const payload: SessionPayload = {
    sub: ADMIN_USERNAME,
    iat: Date.now(),
    exp: Date.now() + TTL_MS,
    scope: 'admin',
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(b64);
  return {
    name: COOKIE,
    value: `${b64}.${sig}`,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: Math.floor(TTL_MS / 1000),
    },
  };
}

export function clearedAdminSessionCookie(): { name: string; value: string; options: any } {
  return {
    name: COOKIE,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
    },
  };
}

export async function verifyAdminSession(): Promise<{ ok: true; username: string } | { ok: false; reason: string }> {
  try {
    const jar = await cookies();
    const c = jar.get(COOKIE)?.value;
    if (!c) return { ok: false, reason: 'no_cookie' };
    const [b64, sig] = c.split('.');
    if (!b64 || !sig) return { ok: false, reason: 'malformed' };
    const expected = sign(b64);
    if (sig !== expected) return { ok: false, reason: 'bad_signature' };
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString()) as SessionPayload;
    if (payload.scope !== 'admin') return { ok: false, reason: 'wrong_scope' };
    if (payload.exp < Date.now()) return { ok: false, reason: 'expired' };
    return { ok: true, username: payload.sub };
  } catch {
    return { ok: false, reason: 'exception' };
  }
}
