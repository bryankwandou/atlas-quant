'use client';
/**
 * ATLAS-QUANT — Local Auth Client
 * Calls the project's own Next.js API routes (bcrypt + JWT HMAC).
 * Zero external services. Zero manual console setup.
 * No Firebase. No Supabase client-side dependency.
 */

export interface AtlasUser {
  id:          string;
  email?:      string;
  displayName: string;
  role:        string;
}

export interface AtlasSession {
  token: string;
  user:  AtlasUser;
}

// ── Internal fetch helper ────────────────────────────────────────────────────
async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? `HTTP ${res.status}`;
    const err = new Error(msg);
    // Map backend error messages to Firebase-style codes for backwards compat
    if (msg.toLowerCase().includes('terdaftar') || msg.toLowerCase().includes('already'))
      (err as { code?: string }).code = 'auth/email-already-in-use';
    else if (msg.toLowerCase().includes('minimal') || msg.toLowerCase().includes('password'))
      (err as { code?: string }).code = 'auth/weak-password';
    else if (msg.toLowerCase().includes('invalid email'))
      (err as { code?: string }).code = 'auth/invalid-email';
    else if (msg.toLowerCase().includes('tidak ditemukan') || msg.toLowerCase().includes('not found'))
      (err as { code?: string }).code = 'auth/user-not-found';
    else if (msg.toLowerCase().includes('salah') || msg.toLowerCase().includes('wrong') || msg.toLowerCase().includes('incorrect'))
      (err as { code?: string }).code = 'auth/wrong-password';
    throw err;
  }
  return data as T;
}

// ── Register ─────────────────────────────────────────────────────────────────
export async function registerWithEmail(
  email: string,
  password: string,
  username: string,
): Promise<AtlasSession> {
  const data = await post<{ token: string; user: AtlasUser }>(
    '/api/auth/email/register',
    { email, password, username, displayName: username },
  );
  return { token: data.token, user: data.user };
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function loginWithEmail(
  identifier: string,
  password: string,
): Promise<AtlasSession> {
  const data = await post<{ token: string; user: AtlasUser }>(
    '/api/auth/email/login',
    { identifier, email: identifier, password },
  );
  return { token: data.token, user: data.user };
}

// ── Persist session to localStorage ──────────────────────────────────────────
export function persistSession(session: AtlasSession): void {
  localStorage.setItem('session_token', session.token);
  localStorage.setItem('atlas_user', JSON.stringify(session.user));
}

// ── Read session ──────────────────────────────────────────────────────────────
export function getSession(): { token: string; user: AtlasUser } | null {
  const token = localStorage.getItem('session_token');
  const raw   = localStorage.getItem('atlas_user');
  if (!token || !raw) return null;
  try { return { token, user: JSON.parse(raw) as AtlasUser }; }
  catch { return null; }
}

// ── Clear session ─────────────────────────────────────────────────────────────
export function clearSession(): void {
  localStorage.removeItem('session_token');
  localStorage.removeItem('atlas_user');
  localStorage.removeItem('user_pubkey');
  localStorage.removeItem('refresh_token');
}

// ── Google sign-in — opens popup via Google OAuth without Firebase SDK ────────
export async function loginWithGoogle(): Promise<never> {
  // Google OAuth without Firebase:
  // The project's /api/auth/login route handles wallet/email.
  // For Google OAuth without Firebase, redirect to a Google OAuth callback.
  // Currently not implemented server-side — throw a descriptive error.
  const err = new Error('Google sign-in requires server-side OAuth setup. Use email/password instead.');
  (err as { code?: string }).code = 'auth/operation-not-allowed';
  throw err;
}

// ── Stub: auth state observer (localStorage-based, synchronous) ───────────────
export function onAuthStateChanged(
  _auth: unknown,
  callback: (user: AtlasUser | null) => void,
): () => void {
  const session = getSession();
  callback(session?.user ?? null);
  return () => {};
}

// ── Stub: auth object (kept for interface compatibility) ──────────────────────
export const auth = {};

// ── Get user role from backend (uses session token) ───────────────────────────
export async function getUserRole(_uid: string): Promise<string> {
  const token = localStorage.getItem('session_token');
  if (!token) return 'user';
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 'user';
    const data = await res.json() as { role?: string };
    return data.role ?? 'user';
  } catch {
    return 'user';
  }
}

// ── Password reset via backend API ────────────────────────────────────────────
export async function sendPasswordReset(email: string): Promise<void> {
  await post('/api/auth/forgot-password', { email });
}

// ── Sign out ──────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  clearSession();
}
