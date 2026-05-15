'use client';

import { useState, useCallback } from 'react';
import '../auth.css';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!identifier.trim()) {
        setError('Please enter your email or username.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: identifier.trim() }),
        });
        const data = await res.json();

        if (!res.ok && data.error) {
          setError(data.error);
          return;
        }

        setSent(true);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [identifier]
  );

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-body">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-title">
              <span style={{ color: '#2962ff' }}>ATLAS</span>
              <span>-QUANT</span>
            </div>
            <div className="auth-logo-sub">RESET PASSWORD</div>
          </div>

          {sent ? (
            <>
              <div className="auth-success">
                Check your email for a password reset link. It may take a few minutes to arrive.
              </div>
              <div className="auth-footer" style={{ marginTop: 20 }}>
                <a href="/login" className="auth-link">Back to Login</a>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <p style={{ fontSize: 12, color: '#787b86', marginBottom: 20, lineHeight: 1.6 }}>
                Enter your email address or username and we&apos;ll send you a link to reset your password.
              </p>

              <div className="auth-field">
                <label className="auth-label" htmlFor="forgot-identifier">EMAIL OR USERNAME</label>
                <input
                  id="forgot-identifier"
                  className="auth-input"
                  type="text"
                  placeholder="you@example.com or your_username"
                  autoComplete="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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
