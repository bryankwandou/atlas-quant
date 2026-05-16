'use client';
/**
 * Login Atlas Quant v2 — DUAL MODE:
 *   1. Email + Password (Supabase / DB-backed)
 *   2. Wallet (Web3 Phantom/Solflare; signature challenge)
 *
 * Tidak ada lagi hardcoded master pubkey atau bypass admin.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import bs58 from 'bs58';

type Mode = 'email' | 'wallet';

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      isConnected?: boolean;
      publicKey?: { toString(): string; toBytes(): Uint8Array };
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string; toBytes(): Uint8Array } }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array; publicKey: { toString(): string } }>;
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.solana?.isConnected && window.solana.publicKey) {
      setWalletAddr(window.solana.publicKey.toString());
    }
  }, []);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setInfo(null); setLoading(true);
    try {
      const r = await fetch('/api/auth/email/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Login gagal.');
      localStorage.setItem('session_token', data.token);
      localStorage.setItem('atlas-user', JSON.stringify(data.user));
      router.push('/chart');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Login gagal.');
    } finally { setLoading(false); }
  }

  async function handleWalletLogin() {
    setErr(null); setInfo(null); setLoading(true);
    try {
      if (!window.solana) {
        setErr('Wallet Phantom / Solflare tidak terdeteksi. Install ekstensinya.');
        return;
      }
      const res = await window.solana.connect();
      const pubkey = res.publicKey.toString();
      setWalletAddr(pubkey);

      const chRes = await fetch('/api/auth/wallet/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: pubkey }),
      });
      const challenge = await chRes.json();
      if (!chRes.ok) throw new Error(challenge.error || 'Gagal ambil challenge.');

      const msgBytes = new TextEncoder().encode(challenge.message);
      const signed = await window.solana.signMessage(msgBytes, 'utf8');
      const sigB58 = bs58.encode(signed.signature);

      const verRes = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: pubkey,
          signature: sigB58,
          nonce: challenge.nonce,
          expiresAt: challenge.expiresAt,
          signed: challenge.signed,
          chain: 'solana',
        }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) {
        if (verData.status === 'pending') {
          setInfo('Wallet terhubung tetapi belum disetujui admin. Hubungi admin Atlas Quant.');
          return;
        }
        throw new Error(verData.error || 'Verifikasi wallet gagal.');
      }
      localStorage.setItem('session_token', verData.token);
      localStorage.setItem('atlas-user', JSON.stringify(verData.user));
      router.push('/chart');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Login wallet gagal.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 aq-grid-bg">
      <div className="aq-card aq-fade w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--accent)] grid place-items-center text-white font-bold">A</div>
            <span className="font-bold">Atlas <span className="text-[var(--accent)]">Quant</span></span>
          </div>
          <Link href="/" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← Kembali</Link>
        </div>

        <h1 className="text-2xl font-bold">Masuk ke akunmu</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Pilih metode login. Tidak ada hardcoded master.</p>

        <div className="flex gap-1 mt-6 p-1 bg-[var(--bg-elevated)] rounded-lg">
          <button onClick={() => setMode('email')} className={`flex-1 py-2 rounded-md text-sm font-medium transition ${mode === 'email' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)]'}`}>Email + Password</button>
          <button onClick={() => setMode('wallet')} className={`flex-1 py-2 rounded-md text-sm font-medium transition ${mode === 'wallet' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)]'}`}>Wallet Web3</button>
        </div>

        {mode === 'email' ? (
          <form onSubmit={handleEmailLogin} className="mt-6 space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Email</label>
              <input className="aq-input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Password</label>
              <input className="aq-input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" minLength={8} />
            </div>
            <button disabled={loading} className="aq-btn w-full mt-2">{loading ? 'Memproses…' : 'Masuk'}</button>
          </form>
        ) : (
          <div className="mt-6 space-y-3">
            <div className="aq-card p-4 bg-[var(--bg-elevated)] text-sm">
              <div className="text-[var(--text-secondary)]">Wallet terhubung:</div>
              <div className="mono text-[var(--text-primary)] break-all mt-1">
                {walletAddr ?? 'Belum terkoneksi'}
              </div>
            </div>
            <button onClick={handleWalletLogin} disabled={loading} className="aq-btn w-full">
              {loading ? 'Memproses…' : walletAddr ? 'Sign Challenge & Masuk' : 'Hubungkan Phantom / Solflare'}
            </button>
            <p className="text-xs text-[var(--text-muted)] text-center">
              Signing GAS-FREE — tidak akan memindahkan dana.
            </p>
          </div>
        )}

        {err && <div className="mt-4 text-sm text-[var(--sell)] bg-[var(--sell-bg)] p-3 rounded-md">{err}</div>}
        {info && <div className="mt-4 text-sm text-[var(--neutral)] bg-[rgba(245,158,11,0.1)] p-3 rounded-md">{info}</div>}

        <div className="text-center text-sm text-[var(--text-secondary)] mt-6">
          Belum punya akun? <Link href="/register" className="aq-link font-medium">Daftar gratis</Link>
        </div>
      </div>
    </div>
  );
}
