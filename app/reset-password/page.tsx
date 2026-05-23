'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import '../auth.css';

type StrengthLevel = 'weak' | 'medium' | 'strong';

function getPasswordStrength(pw: string): StrengthLevel | null {
  if (!pw) return null;
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
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

export default function ResetPasswordPage() {
  const router = useRouter();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = getPasswordStrength(newPassword);

  // Extract access_token from URL hash on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const token = params.get('access_token');
    if (token) {
      setAccessToken(token);
    } else {
      setError('Invalid or expired reset link. Please request a new one.');
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!accessToken) {
        setError('No access token found. Please use the link from your email.');
        return;
      }
      if (!newPassword || newPassword.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (newPassword !== confirm) {
        setError('Passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken, new_password: newPassword }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error ?? 'Failed to reset password.');
          return;
        }

        setDone(true);
        setTimeout(() => router.replace('/login'), 3000);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [accessToken, newPassword, confirm, router]
  );

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-body">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-title">
              <span className="atlas-blue">ATLAS</span>
              <span>-QUANT</span>
            </div>
            <div className="auth-logo-sub">NEW PASSWORD</div>
          </div>

          {done ? (
            <>
              <div className="auth-success">
                Password updated successfully. Redirecting to login…
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <p className="auth-help-text">
                Choose a strong new password for your account.
              </p>

              {/* New password */}
              <div className="auth-field">
                <label className="auth-label" htmlFor="reset-password">NEW PASSWORD</label>
                <input
                  id="reset-password"
                  className="auth-input"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading || !accessToken}
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
                <label className="auth-label" htmlFor="reset-confirm">CONFIRM PASSWORD</label>
                <input
                  id="reset-confirm"
                  className="auth-input"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading || !accessToken}
                  required
                />
                {confirm && newPassword !== confirm && (
                  <div className="auth-field-error">
                    Passwords do not match
                  </div>
                )}
              </div>

              <button
                className="auth-btn auth-btn-primary"
                type="submit"
                disabled={loading || !accessToken}
              >
                {loading ? 'Saving…' : 'Set New Password'}
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
