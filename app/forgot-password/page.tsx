'use client';

import { useState, useCallback } from 'react';
import { sendPasswordReset } from '@/lib/atlas-auth';
import '../auth.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!email.trim() || !EMAIL_RE.test(email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }

      setLoading(true);
      try {
        await sendPasswordReset(email.trim());
        setSent(true);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        if (code === 'auth/user-not-found') {
          // Don't reveal if user exists — always show success
          setSent(true);
        } else if (code === 'auth/invalid-email') {
          setError('Invalid email address format.');
        } else if (code === 'auth/too-many-requests') {
          setError('Too many requests. Please wait a moment and try again.');
        } else {
          setError('Failed to send reset email. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    [email]
  );

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
            <div className="auth-logo-sub">RESET PASSWORD</div>
          </div>

          {sent ? (
            <>
              <div className="auth-success-icon" style={{ textAlign: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="#7b61ff" strokeWidth="1.5"/>
                  <path d="M2 8l10 6 10-6" stroke="#7b61ff" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="auth-success">
                If an account exists for <strong>{email}</strong>, a password reset link has been sent. Check your inbox and spam folder.
              </div>
              <div className="auth-footer auth-footer-mt-lg">
                <a href="/login" className="auth-link">Back to Login</a>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <p className="auth-help-text">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <div className="auth-field">
                <label className="auth-label" htmlFor="forgot-email">EMAIL ADDRESS</label>
                <input
                  id="forgot-email"
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

              <button
                className="auth-btn auth-btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              {error && <div className="auth-error">{error}</div>}

              <div className="auth-footer">
                <a href="/login" className="auth-link">Back to Login</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
