'use client';
/**
 * Register Atlas Quant v2 — DUAL MODE (email atau wallet).
 * Tidak ada hardcoded master / wallet preset.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import bs58 from 'bs58';

// `window.solana` type declared in app/login/page.tsx (single source).

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'email' | 'wallet'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [display, setDisplay] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setInfo(null);
    if (password !== confirm) { setErr('Password & konfirmasi tidak cocok.'); return; }
    if (password.length < 8) { setErr('Password minimal 8 karakter.'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/email/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName: display || email.split('@')[0] }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Daftar gagal.');
      localStorage.setItem('session_token', data.token);
      localStorage.setItem('atlas-user', JSON.stringify(data.user));
      router.push('/chart');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Daftar gagal.');
    } finally { setLoading(false); }
  }

  async function handleWalletRegister() {
    setErr(null); setInfo(null); setLoading(true);
    try {
      if (!window.solana) { setErr('Wallet Phantom/Solflare tidak terdeteksi.'); return; }
      const res = await window.solana.connect();
      const pubkey = res.publicKey.toString();
      const cr = await fetch('/api/auth/wallet/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: pubkey }),
      });
      const challenge = await cr.json();
      if (!cr.ok) throw new Error(challenge.error || 'Challenge gagal.');
      const signed = await window.solana!.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
      const sigB58 = bs58.encode(signed.signature);
      const vr = await fetch('/api/auth/wallet/verify', {
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
      const data = await vr.json();
      if (!vr.ok) {
        if (data.status === 'pending') {
          setInfo('Wallet terdaftar. Menunggu approval admin sebelum bisa masuk.');
          return;
        }
        throw new Error(data.error || 'Registrasi wallet gagal.');
      }
      localStorage.setItem('session_token', data.token);
      localStorage.setItem('atlas-user', JSON.stringify(data.user));
      router.push('/chart');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Registrasi gagal.');
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

        <h1 className="text-2xl font-bold">Buat akun baru</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Gratis. Tidak ada wallet preset / master hack.</p>

        <div className="flex gap-1 mt-6 p-1 bg-[var(--bg-elevated)] rounded-lg">
          <button onClick={() => setMode('email')} className={`flex-1 py-2 rounded-md text-sm font-medium transition ${mode === 'email' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)]'}`}>Email + Password</button>
          <button onClick={() => setMode('wallet')} className={`flex-1 py-2 rounded-md text-sm font-medium transition ${mode === 'wallet' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)]'}`}>Wallet Web3</button>
        </div>

        {mode === 'email' ? (
          <form onSubmit={handleEmailRegister} className="mt-6 space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Nama Tampilan</label>
              <input className="aq-input mt-1" value={display} onChange={(e) => setDisplay(e.target.value)} placeholder="Trader Bryan" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Email</label>
              <input className="aq-input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Password (min 8)</label>
              <input className="aq-input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Konfirmasi Password</label>
              <input className="aq-input mt-1" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <button disabled={loading} className="aq-btn w-full mt-2">{loading ? 'Memproses…' : 'Daftar & Masuk'}</button>
          </form>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Saat klik tombol berikut, kami akan:
            </p>
            <ol className="text-sm text-[var(--text-secondary)] list-decimal pl-5 space-y-1">
              <li>Hubungkan ke wallet (Phantom / Solflare).</li>
              <li>Minta wallet menandatangani challenge gas-free.</li>
              <li>Daftarkan wallet baru ke database.</li>
            </ol>
            <button onClick={handleWalletRegister} disabled={loading} className="aq-btn w-full mt-2">
              {loading ? 'Memproses…' : 'Daftar dengan Wallet'}
            </button>
            <p className="text-xs text-[var(--text-muted)] text-center">
              Setelah approval admin, kamu langsung bisa masuk dari halaman Login → Wallet Web3.
            </p>
          </div>
        )}

        {err && <div className="mt-4 text-sm text-[var(--sell)] bg-[var(--sell-bg)] p-3 rounded-md">{err}</div>}
        {info && <div className="mt-4 text-sm text-[var(--neutral)] bg-[rgba(245,158,11,0.1)] p-3 rounded-md">{info}</div>}

        <div className="text-center text-sm text-[var(--text-secondary)] mt-6">
          Sudah punya akun? <Link href="/login" className="aq-link font-medium">Masuk</Link>
        </div>
      </div>
    </div>
  );
}
