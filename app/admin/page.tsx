'use client';
/**
 * /admin — Atlas Quant Admin Console
 *
 * Akses: hardcoded master (nayrbryanGaming / @Nataliamaria12345) — bisa di-rotate
 * via env ADMIN_MASTER_PASSWORD atau /api/admin/change-password.
 *
 * Wewenang TERBATAS (anti-hijack):
 *   ✓ Lihat semua user
 *   ✓ Lock / Unlock akun
 *   ✓ Hapus akun
 *   ✓ Toggle mode pendaftaran (free / pending_approval / closed)
 *   ✗ Tidak bisa ganti password user
 *   ✗ Tidak bisa login sebagai user
 */
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type AdminUser = {
  id: string;
  email?: string | null;
  username?: string | null;
  wallet_address?: string | null;
  auth_method: 'email' | 'wallet' | 'admin';
  display_name?: string | null;
  is_approved: boolean;
  is_admin: boolean;
  role: string;
  created_at: string;
  last_login_at?: string | null;
};

type Settings = {
  registrationMode: 'free' | 'pending_approval' | 'closed';
  walletAutoApprove: boolean;
  emailAutoApprove: boolean;
  maintenanceMode: boolean;
  announcement: string | null;
  updatedAt: string;
};

type Stats = {
  assets: { total: number; byClass: Record<string, number> };
  indicators: { total: number; byCategory: Record<string, number> };
  users: { totalUsers: number; pendingUsers: number; walletUsers: number; emailUsers: number; recentSignups: Array<{ id: string; auth_method: string; created_at: string }> };
};

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('nayrbryanGaming');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('atlas-admin-token') : null;
    if (saved) setToken(saved);
  }, []);

  const auth = useCallback((extra: HeadersInit = {}): HeadersInit => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...extra }), [token]);

  const refresh = useCallback(async (tk: string) => {
    try {
      const [uR, sR, stR] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${tk}` } }),
        fetch('/api/admin/settings'),
        fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${tk}` } }),
      ]);
      if (uR.ok) setUsers((await uR.json()).users || []);
      if (sR.ok) setSettings((await sR.json()).settings);
      if (stR.ok) setStats(await stR.json());
    } catch (e) {
      console.error('admin refresh failed', e);
    }
  }, []);

  useEffect(() => {
    if (token) refresh(token);
  }, [token, refresh]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Login gagal.');
      localStorage.setItem('atlas-admin-token', data.token);
      setToken(data.token);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Login gagal.');
    } finally { setLoading(false); }
  }

  async function lockToggle(u: AdminUser) {
    if (!token) return;
    setBusyId(u.id);
    try {
      const action = u.is_approved ? 'lock' : 'unlock';
      const r = await fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', headers: auth(), body: JSON.stringify({ action }) });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      await refresh(token);
    } finally { setBusyId(null); }
  }

  async function deleteUser(u: AdminUser) {
    if (!token) return;
    if (!confirm(`Hapus akun "${u.email || u.wallet_address || u.id}"? Aksi tidak bisa di-undo.`)) return;
    setBusyId(u.id);
    try {
      const r = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE', headers: auth() });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      await refresh(token);
    } finally { setBusyId(null); }
  }

  async function changeRegMode(mode: Settings['registrationMode']) {
    if (!token) return;
    const r = await fetch('/api/admin/settings', { method: 'PATCH', headers: auth(), body: JSON.stringify({ registrationMode: mode }) });
    if (r.ok) setSettings((await r.json()).settings);
  }

  function logout() {
    localStorage.removeItem('atlas-admin-token');
    setToken(null);
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 aq-grid-bg">
        <div className="aq-card aq-fade w-full max-w-md p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[var(--accent)] grid place-items-center text-white font-bold">A</div>
              <span className="font-bold">Atlas <span className="text-[var(--accent)]">Quant</span> Admin</span>
            </div>
            <Link href="/" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← Beranda</Link>
          </div>
          <h1 className="text-xl font-bold">Login Admin</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Akses terbatas. Hardcoded master credentials.</p>
          <form onSubmit={handleLogin} className="mt-6 space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Username</label>
              <input className="aq-input mt-1" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Password</label>
              <input className="aq-input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button disabled={loading} className="aq-btn w-full mt-2">{loading ? 'Memproses…' : 'Masuk sebagai Admin'}</button>
          </form>
          {err && <div className="mt-4 text-sm text-[var(--sell)] bg-[var(--sell-bg)] p-3 rounded-md">{err}</div>}
          <p className="text-xs text-[var(--text-muted)] mt-6">
            Admin hanya bisa: lihat user, lock/unlock, hapus, set mode pendaftaran.
            Admin <b>tidak bisa</b>: ganti password user, login sebagai user, jadi admin baru.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] aq-fade">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-[var(--accent)] grid place-items-center text-white font-bold">A</div>
            <div>
              <div className="font-bold text-sm">Atlas Quant — Admin Console</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Master nayrbryanGaming • Sandbox: limited rights</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs aq-btn-secondary aq-btn">Dashboard Pengguna</Link>
            <button onClick={logout} className="text-xs aq-btn-secondary aq-btn">Keluar</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {stats && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total User" value={stats.users.totalUsers} sub={`${stats.users.pendingUsers} pending`} />
            <StatCard label="Total Aset" value={stats.assets.total} sub={`${Object.keys(stats.assets.byClass).length - 1} kelas`} />
            <StatCard label="Total Indikator" value={stats.indicators.total} sub={`${Object.keys(stats.indicators.byCategory).length} kategori`} />
            <StatCard label="Wallet vs Email" value={`${stats.users.walletUsers} / ${stats.users.emailUsers}`} sub="dompet / email" />
          </section>
        )}

        {settings && (
          <section className="aq-card p-6">
            <h2 className="font-bold mb-1">Mode Pendaftaran</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Pilih bagaimana user baru bisa mendaftar.</p>
            <div className="flex gap-2 flex-wrap">
              {(['free', 'pending_approval', 'closed'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => changeRegMode(m)}
                  className={`px-4 py-2 rounded-md text-sm font-medium border ${
                    settings.registrationMode === m
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {m === 'free' ? 'Free (auto-approve)' : m === 'pending_approval' ? 'Pending Approval' : 'Closed (tutup)'}
                </button>
              ))}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-4">
              Terakhir diupdate: {new Date(settings.updatedAt).toLocaleString('id-ID')}
            </div>
          </section>
        )}

        <section className="aq-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Daftar Pengguna ({users.length})</h2>
            <button onClick={() => token && refresh(token)} className="text-xs aq-btn-secondary aq-btn">Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] uppercase border-b border-[var(--border-subtle)]">
                  <th className="py-2 pr-3">Identitas</th>
                  <th className="py-2 pr-3">Method</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Daftar</th>
                  <th className="py-2 pr-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]/40">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{u.display_name || u.email || u.username || u.wallet_address || u.id.slice(0, 8)}</div>
                      <div className="text-xs text-[var(--text-muted)] mono">{u.email || u.wallet_address || u.id}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="aq-pill">{u.auth_method}</span>
                    </td>
                    <td className="py-3 pr-3">
                      {u.is_admin ? <span className="aq-pill aq-pill-buy">admin</span>
                        : u.is_approved ? <span className="aq-pill aq-pill-buy">aktif</span>
                        : <span className="aq-pill aq-pill-neutral">pending</span>}
                    </td>
                    <td className="py-3 pr-3 text-xs text-[var(--text-secondary)]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          disabled={busyId === u.id || u.is_admin}
                          onClick={() => lockToggle(u)}
                          className="px-2 py-1 text-xs rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
                        >
                          {u.is_approved ? 'Lock' : 'Unlock'}
                        </button>
                        <button
                          disabled={busyId === u.id || u.is_admin}
                          onClick={() => deleteUser(u)}
                          className="px-2 py-1 text-xs rounded border border-[var(--sell)] text-[var(--sell)] hover:bg-[var(--sell-bg)] disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr><td colSpan={5} className="py-6 text-center text-[var(--text-muted)] text-sm">
                    Belum ada user terdaftar (atau Supabase belum dikonfigurasi).
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-4">
            Aksi yang diizinkan: lock/unlock, delete. Tidak ada tombol &quot;ganti password&quot; atau &quot;login as user&quot; — sengaja untuk mencegah hijacking.
          </p>
        </section>

        {stats && (
          <section className="grid md:grid-cols-2 gap-6">
            <div className="aq-card p-6">
              <h3 className="font-bold mb-3">Inventaris Aset</h3>
              <ul className="space-y-1 text-sm">
                {Object.entries(stats.assets.byClass).filter(([k]) => k !== 'total').map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b border-[var(--border-subtle)] py-1">
                    <span className="capitalize text-[var(--text-secondary)]">{k}</span>
                    <span className="mono">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="aq-card p-6">
              <h3 className="font-bold mb-3">Indikator per Kategori</h3>
              <ul className="space-y-1 text-sm">
                {Object.entries(stats.indicators.byCategory).map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b border-[var(--border-subtle)] py-1">
                    <span className="capitalize text-[var(--text-secondary)]">{k.replace(/_/g, ' ')}</span>
                    <span className="mono">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="aq-card p-4">
      <div className="text-xs text-[var(--text-muted)] uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-bold mono mt-1">{value}</div>
      {sub && <div className="text-xs text-[var(--text-secondary)] mt-1">{sub}</div>}
    </div>
  );
}
