'use client';
/**
 * Gerbang login superadmin untuk /dashboard. Autentikasi SERVER-SIDE:
 * POST /api/admin/login → verifyAdminPassword (PBKDF2 + Supabase) → set cookie
 * httpOnly bertanda HMAC. Tidak ada password di kode klien; localStorage tidak
 * dipakai sebagai gate (tak bisa dibobol dari devtools).
 */
import { useState } from 'react';

export default function AdminGate() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j?.error || 'Login gagal'); setBusy(false); return; }
      // Cookie sudah di-set server. Reload → server component render konsol.
      window.location.reload();
    } catch (e: any) { setErr(String(e?.message || e)); setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0c0e12', color: '#d1d4dc', fontFamily: 'ui-monospace, monospace' }}>
      <form onSubmit={submit} style={{ width: 340, padding: 28, background: '#131722', border: '1px solid #2a2e39', borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>🛡️ ATLAS·QUANT</div>
        <div style={{ fontSize: 12, color: '#787b86', marginBottom: 20 }}>Konsol Superadmin — akses terbatas</div>

        <label style={{ fontSize: 11, color: '#787b86' }}>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username"
          style={inp} placeholder="username admin" />

        <label style={{ fontSize: 11, color: '#787b86' }}>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password"
          style={inp} placeholder="••••••••" />

        {err && <div style={{ color: '#f23645', fontSize: 12, margin: '4px 0 8px' }}>{err}</div>}

        <button type="submit" disabled={busy || !username || !password}
          style={{ width: '100%', marginTop: 10, padding: '10px 0', background: busy ? '#1c3a33' : '#089981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? 'Memeriksa…' : 'Masuk'}
        </button>
        <div style={{ fontSize: 10, color: '#5d6069', marginTop: 14, lineHeight: 1.5 }}>
          Sesi 8 jam, cookie httpOnly bertanda HMAC. Verifikasi via database (PBKDF2). Ganti password bawaan setelah login pertama.
        </div>
      </form>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%', margin: '4px 0 14px', padding: '9px 11px', background: '#0c0e12',
  border: '1px solid #2a2e39', borderRadius: 6, color: '#d1d4dc', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
};
