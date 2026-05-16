/**
 * Session token utilities — JWT HMAC (HS256-equivalent) ringan,
 * tanpa dependency tambahan. Cocok untuk serverless (Vercel)
 * dimana setiap function call stateless.
 *
 * Payload yang ditandatangani berisi:
 *   - uid:   user.id (UUID)
 *   - method: 'email' | 'wallet' | 'admin'
 *   - exp:   expiration ms epoch
 *
 * Token dikembalikan format: base64url(payload).hex(hmac)
 * Verifier konstan-waktu untuk mengurangi timing attack.
 */
import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.SUPABASE_JWT_SECRET || process.env.CRON_SECRET || '';

if (!SECRET || SECRET.length < 16) {
  console.warn('[auth/session] WARNING: SUPABASE_JWT_SECRET / CRON_SECRET kosong / pendek. Set di .env untuk produksi.');
}

const b64url = (buf: Buffer) =>
  buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

const fromB64url = (s: string) =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4), 'base64');

export interface SessionPayload {
  uid: string;
  method: 'email' | 'wallet' | 'admin';
  email?: string;
  wallet?: string;
  role?: string;
  exp: number;
}

export function issueSession(payload: Omit<SessionPayload, 'exp'>, ttlMs = 24 * 60 * 60 * 1000): string {
  const exp = Date.now() + ttlMs;
  const full: SessionPayload = { ...payload, exp };
  const body = b64url(Buffer.from(JSON.stringify(full)));
  const sig = createHmac('sha256', SECRET || 'dev-secret').update(body).digest('hex');
  return `${body}.${sig}`;
}

export function verifySession(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', SECRET || 'dev-secret').update(body).digest('hex');
  if (sig.length !== expected.length) return null;
  let ok = false;
  try {
    ok = timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    const payload = JSON.parse(fromB64url(body).toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readSessionFromHeader(authHeader: string | null | undefined): SessionPayload | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!m) return null;
  return verifySession(m[1]);
}
