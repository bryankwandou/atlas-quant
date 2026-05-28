'use client';

import { useEffect, useState, useCallback } from 'react';

import { useRouter } from 'next/navigation';
import {
  registerWithEmail,
  loginWithGoogle,
  persistSession,
  onAuthStateChanged,
  auth,
} from '@/lib/atlas-auth';
import '../auth.css';

type StrengthLevel = 'weak' | 'medium' | 'strong';

function getPasswordStrength(pw: string): StrengthLevel | null {
  if (!pw) return null;
  const hasLetter  = /[a-zA-Z]/.test(pw);
  const hasNumber  = /[0-9]/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  const score = [pw.length >= 8, hasLetter, hasNumber, hasSpecial, pw.length >= 12].filter(Boolean).length;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

const strengthLabel: Record<StrengthLevel, string> = {
  weak: 'WEAK',
  medium: 'MEDIUM',
  strong: 'STRONG',
};

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router   = useRouter();
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [info,     setInfo]     = useState('');
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const strength = getPasswordStrength(password);

  // Redirect if already logged in — non-blocking (form shows immediately)
  useEffect(() => {
    // Fast path: localStorage session
    if (localStorage.getItem('session_token') && localStorage.getItem('atlas_user')) {
      router.replace('/chart');
      return;
    }
    // Firebase async check — redirect silently if signed in
    try {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) router.replace('/chart');
      });
      return () => unsub();
    } catch { /* Firebase not configured — show form normally */ }
  }, [router]);

  const validate = (): string | null => {
    if (!username || !USERNAME_RE.test(username))
      return 'Username must be 3–20 characters: letters, numbers, or underscores only.';
    if (!email || !EMAIL_RE.test(email))
      return 'Please enter a valid email address.';
    if (!password || password.length < 8)
      return 'Password must be at least 8 characters.';
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
      return 'Password must contain at least one letter and one number.';
    if (password !== confirm)
      return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError('');
      setInfo('');

      const validationError = validate();
      if (validationError) { setError(validationError); return; }

      setLoading(true);
      try {
        const session = await registerWithEmail(email.trim(), password, username.trim());
        persistSession(session);
        setSuccess(true);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        const msg  = (err as { message?: string }).message ?? '';
        if (code === 'auth/email-already-in-use') {
          setError('An account with this email already exists. Try signing in.');
        } else if (code === 'auth/weak-password') {
          setError('Password is too weak. Please use at least 6 characters.');
        } else if (code === 'auth/invalid-email') {
          setError('Invalid email address format.');
        } else if (code === 'auth/invalid-api-key' || code === 'auth/app-not-authorized' || !code) {
          setError('Auth service not available. Check server logs.');
        } else if (code === 'auth/network-request-failed') {
          setError('Network error. Check your connection and try again.');
        } else if (code === 'auth/too-many-requests') {
          setError('Too many attempts. Please wait a few minutes and try again.');
        } else if (code === 'auth/operation-not-allowed') {
          setError('Email/password sign-up is not enabled. Enable it in Firebase Console → Authentication → Sign-in providers.');
        } else {
          setError(`Registration failed (${code || msg || 'unknown error'}). Please try again.`);
        }
      } finally {
        setLoading(false);
      }
    },
    [email, username, password, confirm]
  );

  const handleGoogleRegister = useCallback(async () => {
    setError('');
    setInfo('');
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


  if (success) {
    return (
      <div className="auth-root">
        <div className="auth-card">
          <div className="auth-body auth-body-center">
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
            </div>
            <div className="auth-success-icon">✅</div>
            <div className="auth-success auth-success-mb">
              Account created successfully! Redirecting to dashboard…
            </div>
            <button
              className="auth-btn auth-btn-primary"
              type="button"
              onClick={() => router.replace('/chart')}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-root">
      <div className="auth-card">
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
            <div className="auth-logo-sub">CREATE ACCOUNT</div>
          </div>

          {/* Google shortcut */}
          <button
            className="auth-btn auth-btn-google"
            type="button"
            onClick={handleGoogleRegister}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'Opening Google…' : 'Register with Google'}
          </button>

          <div className="auth-divider"><span>OR</span></div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Username */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-username">USERNAME</label>
              <input
                id="reg-username"
                className="auth-input"
                type="text"
                placeholder="your_username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
              {username && !USERNAME_RE.test(username) && (
                <div className="auth-field-error">3–20 chars, letters / numbers / underscore only</div>
              )}
            </div>

            {/* Email */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-email">EMAIL ADDRESS</label>
              <input
                id="reg-email"
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

            {/* Password */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-password">PASSWORD</label>
              <input
                id="reg-password"
                className="auth-input"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              {strength && (
                <>
                  <div className={`pw-strength ${strength}`} />
                  <div className={`pw-strength-label ${strength}`}>{strengthLabel[strength]}</div>
                </>
              )}
            </div>

            {/* Confirm */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-confirm">CONFIRM PASSWORD</label>
              <input
                id="reg-confirm"
                className="auth-input"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
                required
              />
              {confirm && password !== confirm && (
                <div className="auth-field-error">Passwords do not match</div>
              )}
            </div>

            <button
              className="auth-btn auth-btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          {info  && <div className="auth-success auth-success-mt">{info}</div>}
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-footer">
            Already have an account?{' '}
            <a href="/login" className="auth-link">Sign In</a>
          </div>
        </div>
      </div>
    </div>
  );
}
