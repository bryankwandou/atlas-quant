'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import '../auth.css';

type AuthTab = 'wallet' | 'email' | 'username';

interface PhantomProvider {
  isPhantom: boolean;
  publicKey: { toString(): string; toBase58(): string } | null;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string; toBase58(): string } }>;
  signMessage(msg: Uint8Array, encoding: string): Promise<{ signature: Uint8Array }>;
  disconnect(): Promise<void>;
  isConnected?: boolean;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

function getPhantom(): PhantomProvider | null {
  if (typeof window === 'undefined') return null;
  return window.solana?.isPhantom ? window.solana : null;
}

export default function LoginPage() {
  const router = useRouter();

  const [tab, setTab] = useState<AuthTab>('wallet');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletPubkey, setWalletPubkey] = useState<string | null>(null);
  const [phantomAvailable, setPhantomAvailable] = useState(false);

  // Check for existing session on mount; detect Phantom
  useEffect(() => {
    const token = localStorage.getItem('session_token');
    const user = localStorage.getItem('atlas_user');
    if (token && user) {
      router.replace('/chart');
      return;
    }
    const checkPhantom = () => {
      const p = getPhantom();
      setPhantomAvailable(!!p);
      if (p?.isConnected && p.publicKey) {
        setWalletPubkey(p.publicKey.toBase58());
      }
    };
    checkPhantom();
    window.addEventListener('load', checkPhantom);
    return () => window.removeEventListener('load', checkPhantom);
  }, [router]);

  const clearMessages = () => { setError(''); setInfo(''); };

  // ── Credential login (email or username) ──────────────────────────────
  const handleCredentialLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearMessages();

      if (!identifier.trim() || !password) {
        setError('Please enter your ' + (tab === 'email' ? 'email' : 'username') + ' and password.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: identifier.trim(), password }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error ?? 'Login failed. Please check your credentials.');
          return;
        }

        localStorage.setItem('session_token', data.access_token ?? data.token ?? '');
        localStorage.setItem('atlas_user', JSON.stringify(data.user ?? {}));
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        router.replace('/chart');
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [identifier, password, tab, router]
  );

  // ── Phantom wallet login ──────────────────────────────────────────────
  const handleWalletLogin = useCallback(async () => {
    clearMessages();
    const phantom = getPhantom();
    if (!phantom) {
      setError('Phantom wallet not detected. Please install the Phantom browser extension.');
      return;
    }

    setLoading(true);
    try {
      // 1. Connect
      const resp = await phantom.connect();
      const pubkey = resp.publicKey.toBase58();
      setWalletPubkey(pubkey);
      setInfo('Wallet connected. Requesting challenge…');

      // 2. Get challenge
      const challengeRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: pubkey }),
      });
      const challenge = await challengeRes.json();
      if (!challengeRes.ok) throw new Error(challenge.error ?? 'Challenge request failed');

      setInfo('Please sign the message in Phantom…');

      // 3. Sign
      const msgBytes = new TextEncoder().encode(challenge.message);
      const { signature: sigBytes } = await phantom.signMessage(msgBytes, 'utf8');

      const bs58 = await import('bs58');
      const signatureBase58 = bs58.default.encode(sigBytes);

      setInfo('Verifying signature…');

      // 4. Verify
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: pubkey, signature: signatureBase58, challenge }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        if (verifyData.status === 'pending') {
          router.replace('/pending-approval');
          return;
        }
        throw new Error(verifyData.error ?? 'Signature verification failed');
      }

      localStorage.setItem('session_token', verifyData.token ?? '');
      localStorage.setItem('user_pubkey', pubkey);
      localStorage.setItem('atlas_user', JSON.stringify({ publicKey: pubkey, role: 'user' }));
      router.replace('/chart');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Wallet authentication failed.';
      setError(msg);
      setInfo('');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleDisconnect = async () => {
    if (window.solana) await window.solana.disconnect();
    setWalletPubkey(null);
  };

  const pubkeyShort = walletPubkey
    ? `${walletPubkey.slice(0, 6)}…${walletPubkey.slice(-4)}`
    : '';

  return (
    <div className="auth-root">
      <div className="auth-card">
        {/* Tabs */}
        <div className="auth-tabs">
          {(['wallet', 'email', 'username'] as AuthTab[]).map((t) => (
            <button
              key={t}
              className={`auth-tab${tab === t ? ' active' : ''}`}
              onClick={() => { setTab(t); clearMessages(); setIdentifier(''); setPassword(''); }}
              type="button"
            >
              {t === 'wallet' ? '🔐 Wallet' : t === 'email' ? '📧 Email' : '👤 Username'}
            </button>
          ))}
        </div>

        <div className="auth-body">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-title">
              <span className="atlas-blue">ATLAS</span>
              <span>-QUANT</span>
            </div>
            <div className="auth-logo-sub">QUANTITATIVE TRADING PLATFORM</div>
          </div>

          {/* ── Wallet Tab ── */}
          {tab === 'wallet' && (
            <div>
              {walletPubkey && (
                <div className="wallet-info">
                  <strong>Connected Wallet</strong>
                  {pubkeyShort}
                </div>
              )}
              {!walletPubkey ? (
                <button
                  className="auth-btn auth-btn-wallet"
                  onClick={handleWalletLogin}
                  disabled={loading}
                  type="button"
                >
                  {loading
                    ? 'Connecting…'
                    : phantomAvailable
                    ? 'Connect Phantom Wallet'
                    : 'Phantom Not Detected'}
                </button>
              ) : (
                <>
                  <button
                    className="auth-btn auth-btn-wallet auth-btn-mb"
                    onClick={handleWalletLogin}
                    disabled={loading}
                    type="button"
                  >
                    {loading ? 'Signing…' : 'Sign & Authenticate'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="auth-disconnect-btn"
                  >
                    Disconnect
                  </button>
                </>
              )}
              {!phantomAvailable && !walletPubkey && (
                <p className="auth-footer auth-footer-mt">
                  <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="auth-link">
                    Install Phantom
                  </a>{' '}
                  to use wallet login.
                </p>
              )}
            </div>
          )}

          {/* ── Email Tab ── */}
          {tab === 'email' && (
            <form onSubmit={handleCredentialLogin} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="email-input">EMAIL ADDRESS</label>
                <input
                  id="email-input"
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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
              <div className="auth-footer">
                Don&apos;t have an account?{' '}
                <a href="/register" className="auth-link">Register</a>
              </div>
            </form>
          )}

          {/* ── Username Tab ── */}
          {tab === 'username' && (
            <form onSubmit={handleCredentialLogin} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="username-input">USERNAME</label>
                <input
                  id="username-input"
                  className="auth-input"
                  type="text"
                  placeholder="your_username"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="username-password">PASSWORD</label>
                <input
                  id="username-password"
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
              <div className="auth-footer">
                Don&apos;t have an account?{' '}
                <a href="/register" className="auth-link">Register</a>
              </div>
            </form>
          )}

          {/* Feedback */}
          {info && <div className="auth-success auth-success-mt">{info}</div>}
          {error && <div className="auth-error">{error}</div>}
        </div>
      </div>
    </div>
  );
}
