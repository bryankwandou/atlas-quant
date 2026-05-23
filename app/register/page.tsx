'use client';

import { useState, useCallback } from 'react';
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

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);

  const validate = (): string | null => {
    if (!username || !USERNAME_RE.test(username)) {
      return 'Username must be 3-20 characters: letters, numbers, or underscores only.';
    }
    if (!email || !EMAIL_RE.test(email)) {
      return 'Please enter a valid email address.';
    }
    if (!password || password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return 'Password must contain at least one letter and one number.';
    }
    if (password !== confirm) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username, password }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error ?? 'Registration failed. Please try again.');
          return;
        }

        setSuccess(true);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [email, username, password, confirm]
  );

  if (success) {
    return (
      <div className="auth-root">
        <div className="auth-card">
          <div className="auth-body auth-body-center">
            <div className="auth-logo">
              <div className="auth-logo-title">
                <span className="atlas-blue">ATLAS</span>
                <span>-QUANT</span>
              </div>
              <div className="auth-logo-sub">QUANTITATIVE TRADING PLATFORM</div>
            </div>
            <div className="auth-success-icon">✅</div>
            <div className="auth-success auth-success-mb">
              Account created successfully! You can now log in with your credentials.
            </div>
            <a href="/login">
              <button className="auth-btn auth-btn-primary" type="button">
                Go to Login
              </button>
            </a>
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
            <div className="auth-logo-title">
              <span className="atlas-blue">ATLAS</span>
              <span>-QUANT</span>
            </div>
            <div className="auth-logo-sub">CREATE ACCOUNT</div>
          </div>

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
                <div className="auth-field-error">
                  3-20 chars, letters/numbers/underscore only
                </div>
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

            {/* Confirm Password */}
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
                <div className="auth-field-error">
                  Passwords do not match
                </div>
              )}
            </div>

            <button
              className="auth-btn auth-btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>

            {error && <div className="auth-error">{error}</div>}
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <a href="/login" className="auth-link">Sign In</a>
          </div>
        </div>
      </div>
    </div>
  );
}
