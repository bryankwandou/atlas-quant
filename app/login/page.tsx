'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  loginWithEmail,
  loginWithGoogle,
  persistSession,
  onAuthStateChanged,
  auth,
} from '@/lib/atlas-auth';
import '../auth.css';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'email' | 'google'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in — non-blocking (form shows immediately)
  useEffect(() => {
    // Fast path: localStorage session
    if (localStorage.getItem('session_token') && localStorage.getItem('atlas_user')) {
      router.replace('/chart');
      return;
    }
    // Firebase async check — redirect silently if already signed in
    try {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) router.replace('/chart');
      });
      return () => unsub();
    } catch { /* Firebase not configured — show form normally */ }
  }, [router]);

  const clearMessages = () => { setError(''); setInfo(''); };

  // ── Email + Password login ────────────────────────────────────────────
  const handleEmailLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearMessages();
      if (!email.trim() || !password) {
        setError('Please enter your email and password.');
        return;
      }
      setLoading(true);
      try {
        const session = await loginWithEmail(email.trim(), password);
        persistSession(session);
        router.replace('/chart');
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          setError('Invalid email or password. Please try again.');
        } else if (code === 'auth/too-many-requests') {
          setError('Too many failed attempts. Please wait a moment and try again.');
        } else if (code === 'auth/user-disabled') {
          setError('This account has been disabled. Contact support.');
        } else {
          setError('Login failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    [email, password, router]
  );

  // ── Google login ──────────────────────────────────────────────────────
  const handleGoogleLogin = useCallback(async () => {
    clearMessages();
    setLoading(true);
    setInfo('Opening Google Sign-In…');
    try {
      const session = await loginWithGoogle();
      persistSession(session);
      router.replace('/chart');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('Sign-in cancelled.');
      } else if (code === 'auth/popup-blocked') {
        setError('Popup blocked by browser. Please allow popups for this site.');
      } else {
        setError('Google sign-in failed. Please try again.');
      }
      setInfo('');
    } finally {
      setLoading(false);
    }
  }, [router]);



  return (
    <div className="auth-root">
      <div className="auth-card">
        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab${tab === 'email' ? ' active' : ''}`}
            onClick={() => { setTab('email'); clearMessages(); }}
            type="button"
          >
            [MSG] Email
          </button>
          <button
            className={`auth-tab${tab === 'google' ? ' active' : ''}`}
            onClick={() => { setTab('google'); clearMessages(); }}
            type="button"
          >
            [G] Google
          </button>
        </div>

        <div className="auth-body">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M4 19L12 5L20 19H16L12 12L8 19H4Z" fill="#7b61ff"/>
                <circle cx="12" cy="19" r="1.5" fill="#7b61ff"/>
              </svg>
            </div>
            <div className="auth-logo-title">
              <span className="atlas-blue">ATLAS</span>
              <span>·QUANT</span>
            </div>
            <div className="auth-logo-sub">QUANTITATIVE TRADING PLATFORM</div>
          </div>

          {/* ── Email Tab ── */}
          {tab === 'email' && (
            <>
              <form onSubmit={handleEmailLogin} noValidate>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="email-input">EMAIL ADDRESS</label>
                  <input
                    id="email-input"
                    className="auth-input"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="email-password">PASSWORD</label>
                  <input
                    id="email-password"
                    className="auth-input"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="auth-forgot-wrap">
                  <a href="/forgot-password" className="auth-link auth-link-sm">
                    Forgot password?
                  </a>
                </div>
                <button className="auth-btn auth-btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <div className="auth-divider"><span>OR</span></div>

              <button
                className="auth-btn auth-btn-google"
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="auth-footer">
                Don&apos;t have an account?{' '}
                <a href="/register" className="auth-link">Register</a>
              </div>
            </>
          )}

          {/* ── Google Tab ── */}
          {tab === 'google' && (
            <>
              <p className="auth-help-text" style={{ textAlign: 'center' }}>
                Sign in instantly using your Google account. No password required.
              </p>
              <button
                className="auth-btn auth-btn-google auth-btn-google-lg"
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {loading ? 'Opening Google…' : 'Sign in with Google'}
              </button>

              <div className="auth-divider"><span>OR</span></div>

              <button
                className="auth-btn auth-btn-outline"
                type="button"
                onClick={() => { setTab('email'); clearMessages(); }}
              >
                Use Email &amp; Password
              </button>

              <div className="auth-footer">
                Don&apos;t have an account?{' '}
                <a href="/register" className="auth-link">Register</a>
              </div>
            </>
          )}

          {/* Feedback */}
          {info && <div className="auth-success auth-success-mt">{info}</div>}
          {error && <div className="auth-error">{error}</div>}
        </div>
      </div>
    </div>
  );
}
