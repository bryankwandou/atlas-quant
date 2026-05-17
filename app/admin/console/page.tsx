'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type SignupMode = 'open' | 'approval';

interface PublicConfig {
  signupMode: SignupMode;
  isBootstrap: boolean;
  lockedCount: number;
  passwordChangedAt: string | null;
}

interface UserRow {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  locked: boolean;
  banned: boolean;
  provider: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  // Login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [logging, setLogging] = useState(false);

  // Change password form
  const [showChangePass, setShowChangePass] = useState(false);
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');

  // Automation panels
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<any>(null);
  const [backtesting, setBacktesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<any>(null);

  async function runMigration() {
    setMigrating(true); setMigrateResult(null);
    try {
      const r = await fetch('/api/admin/migrate', { method: 'POST' });
      const j = await r.json();
      setMigrateResult(j);
    } catch (e: any) {
      setMigrateResult({ error: e?.message ?? 'Migration failed' });
    } finally { setMigrating(false); }
  }
  async function runBacktest() {
    setBacktesting(true); setBacktestResult(null);
    try {
      const r = await fetch('/api/admin/backtest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: ['BTCUSDT','ETHUSDT','SOLUSDT','AAPL','TSLA','SPY'], timeframe: '1h', minConfidence: 60 }),
      });
      const j = await r.json();
      setBacktestResult(j);
    } catch (e: any) {
      setBacktestResult({ error: e?.message ?? 'Backtest failed' });
    } finally { setBacktesting(false); }
  }
  async function runTraining() {
    setTraining(true); setTrainResult(null);
    try {
      const r = await fetch('/api/admin/train-ml', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe: '1h', horizon: 5, epochs: 6 }),
      });
      const j = await r.json();
      setTrainResult(j);
    } catch (e: any) {
      setTrainResult({ error: e?.message ?? 'Training failed' });
    } finally { setTraining(false); }
  }

  const checkSession = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/me', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        setSignedIn(true);
        setConfig(j.config);
      } else {
        setSignedIn(false);
      }
    } catch {
      setSignedIn(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/users?perPage=200', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Failed to load users');
      setUsers(j.users ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => { checkSession(); }, [checkSession]);
  useEffect(() => { if (signedIn) fetchUsers(); }, [signedIn, fetchUsers]);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setLogging(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Login failed');
      setSignedIn(true);
      setConfig(j.config);
      setPassword('');
    } catch (e: any) {
      setError(e?.message ?? 'Login failed');
    } finally {
      setLogging(false);
    }
  }

  async function doLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setSignedIn(false);
    setUsers([]);
    setConfig(null);
  }

  async function toggleSignupMode(next: SignupMode) {
    const r = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signupMode: next }),
    });
    if (r.ok) await checkSession();
  }

  async function toggleLock(u: UserRow) {
    const r = await fetch(`/api/admin/users/${u.id}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked: !u.locked }),
    });
    if (r.ok) fetchUsers();
  }

  async function deleteUser(u: UserRow) {
    if (!confirm(`Delete user ${u.username} (${u.email}) permanently? This cannot be undone.`)) return;
    const r = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
    if (r.ok) fetchUsers();
  }

  async function submitChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPass !== newPass2) { setError('New password fields do not match.'); return; }
    const r = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: curPass, newPassword: newPass }),
    });
    const j = await r.json();
    if (!r.ok) { setError(j.error ?? 'Password change failed'); return; }
    setCurPass(''); setNewPass(''); setNewPass2('');
    setShowChangePass(false);
    await checkSession();
    alert('Password changed.');
  }

  // ── Login screen ────────────────────────────────────────────────────────
  if (signedIn === false) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0b] text-neutral-200 px-4">
        <form onSubmit={doLogin} className="w-full max-w-sm bg-[#111114] border border-neutral-800 rounded-xl p-6 shadow-2xl">
          <h1 className="text-xl font-semibold mb-1">Atlas Quant · Admin</h1>
          <p className="text-xs text-neutral-500 mb-6">Restricted area. Admin can only lock or delete accounts — no user impersonation.</p>
          <label className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Username</label>
          <input
            value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-black border border-neutral-800 rounded px-3 py-2 mb-3 text-sm focus:outline-none focus:border-blue-600"
            autoComplete="username"
          />
          <label className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border border-neutral-800 rounded px-3 py-2 mb-4 text-sm focus:outline-none focus:border-blue-600"
            autoComplete="current-password"
          />
          {error && <div className="text-xs text-red-400 mb-3">{error}</div>}
          <button
            type="submit" disabled={logging}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition rounded py-2 text-sm font-medium"
          >
            {logging ? 'Signing in…' : 'Sign in'}
          </button>
          <button
            type="button" onClick={() => router.push('/')}
            className="w-full mt-2 text-xs text-neutral-500 hover:text-neutral-300"
          >
            Back to app
          </button>
        </form>
      </main>
    );
  }

  if (signedIn === null) {
    return <main className="min-h-screen flex items-center justify-center bg-[#0a0a0b] text-neutral-400 text-sm">Loading…</main>;
  }

  // ── Admin console ───────────────────────────────────────────────────────
  const filtered = users.filter((u) =>
    !filter ||
    u.email.toLowerCase().includes(filter.toLowerCase()) ||
    u.username.toLowerCase().includes(filter.toLowerCase()) ||
    u.id.includes(filter)
  );

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-neutral-200">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
        <div>
          <h1 className="text-base font-semibold">Atlas Quant · Admin Console</h1>
          <p className="text-xs text-neutral-500">Capabilities: list · lock/unlock · delete · signup gate · change own password</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">nayrbryanGaming</span>
          <button onClick={() => setShowChangePass((v) => !v)} className="text-xs px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 transition">Change password</button>
          <button onClick={doLogout} className="text-xs px-3 py-1.5 rounded bg-red-700/30 hover:bg-red-700/50 text-red-200 transition">Sign out</button>
        </div>
      </header>

      {config?.isBootstrap && (
        <div className="px-6 py-2 bg-amber-600/10 border-b border-amber-600/30 text-xs text-amber-300">
          ⚠ You are using the bootstrap password. Change it now (min 12 chars).
        </div>
      )}

      {showChangePass && (
        <form onSubmit={submitChangePassword} className="border-b border-neutral-800 bg-[#111114] px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <input type="password" placeholder="Current password" value={curPass} onChange={(e) => setCurPass(e.target.value)}
            className="bg-black border border-neutral-800 rounded px-3 py-2" />
          <input type="password" placeholder="New password (min 12)" value={newPass} onChange={(e) => setNewPass(e.target.value)}
            className="bg-black border border-neutral-800 rounded px-3 py-2" />
          <input type="password" placeholder="Confirm new" value={newPass2} onChange={(e) => setNewPass2(e.target.value)}
            className="bg-black border border-neutral-800 rounded px-3 py-2" />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 rounded px-3 py-2 text-white">Update</button>
        </form>
      )}

      <section className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111114] border border-neutral-800 rounded-lg p-4">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Signup mode</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSignupMode('open')}
              className={`px-3 py-1.5 text-xs rounded ${config?.signupMode === 'open' ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}
            >Open (anyone can register)</button>
            <button
              onClick={() => toggleSignupMode('approval')}
              className={`px-3 py-1.5 text-xs rounded ${config?.signupMode === 'approval' ? 'bg-amber-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}
            >Pending approval</button>
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">When set to <em>Pending approval</em>, new accounts cannot log in until on-chain approval.</p>
        </div>

        <div className="bg-[#111114] border border-neutral-800 rounded-lg p-4">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Locked accounts</div>
          <div className="text-2xl font-semibold">{config?.lockedCount ?? 0}</div>
          <p className="text-[11px] text-neutral-500 mt-1">Locked users are refused at /api/auth/login.</p>
        </div>

        <div className="bg-[#111114] border border-neutral-800 rounded-lg p-4">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Password last changed</div>
          <div className="text-sm">{config?.passwordChangedAt ? new Date(config.passwordChangedAt).toLocaleString() : '—'}</div>
          <p className="text-[11px] text-neutral-500 mt-1">Admin has no impersonation or session-mint power.</p>
        </div>
      </section>

      {/* ── Automation panel ───────────────────────────────────────────────── */}
      <section className="px-6 pb-4">
        <h2 className="text-sm font-semibold mb-2">Automation · zero-touch operations</h2>
        <p className="text-[11px] text-neutral-500 mb-3">Every operation that previously required opening Supabase SQL editor / running scripts / training a model is now a one-click button. No human SQL.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Migration */}
          <div className="bg-[#111114] border border-neutral-800 rounded-lg p-4">
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">1 · Run Supabase migration</div>
            <p className="text-[11px] text-neutral-500 mb-3">Creates / updates all tables: market_ohlcv, indicators_cache, quant_signals, trade_journal, watchlist, user_settings, backtest_runs, ml_model_weights, views + RLS. Idempotent.</p>
            <button onClick={runMigration} disabled={migrating} className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition w-full">
              {migrating ? 'Running migration…' : 'Run migration'}
            </button>
            {migrateResult && (
              <pre className="mt-3 text-[10px] bg-black border border-neutral-800 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">{JSON.stringify(migrateResult, null, 2)}</pre>
            )}
          </div>
          {/* Backtest */}
          <div className="bg-[#111114] border border-neutral-800 rounded-lg p-4">
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">2 · Walk-forward backtest</div>
            <p className="text-[11px] text-neutral-500 mb-3">Runs the Renaissance composite signal across 6 reference symbols and reports actual win-rate / RR / Sharpe / max DD. No fabricated numbers.</p>
            <button onClick={runBacktest} disabled={backtesting} className="text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition w-full">
              {backtesting ? 'Running backtest…' : 'Run backtest'}
            </button>
            {backtestResult && (
              <pre className="mt-3 text-[10px] bg-black border border-neutral-800 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">{JSON.stringify(backtestResult, null, 2)}</pre>
            )}
          </div>
          {/* Train ML */}
          <div className="bg-[#111114] border border-neutral-800 rounded-lg p-4">
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">3 · Re-train local ML model</div>
            <p className="text-[11px] text-neutral-500 mb-3">Builds (feature, label) pairs from historical OHLCV across 12 symbols, runs 6-epoch SGD on the logistic ensemble. New weights persisted to <code>ml_model_weights</code>.</p>
            <button onClick={runTraining} disabled={training} className="text-xs px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition w-full">
              {training ? 'Training…' : 'Train ML model'}
            </button>
            {trainResult && (
              <pre className="mt-3 text-[10px] bg-black border border-neutral-800 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">{JSON.stringify(trainResult, null, 2)}</pre>
            )}
          </div>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Users ({users.length})</h2>
          <div className="flex items-center gap-2">
            <input
              value={filter} onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter username / email / id"
              className="text-xs bg-black border border-neutral-800 rounded px-3 py-1.5 w-72"
            />
            <button onClick={fetchUsers} disabled={loadingUsers} className="text-xs px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700">
              {loadingUsers ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
        {error && <div className="text-xs text-red-400 mb-2">{error}</div>}

        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[#0f0f12] text-neutral-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2">Username</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Created</th>
                <th className="text-left px-3 py-2">Last sign-in</th>
                <th className="text-left px-3 py-2">Provider</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-neutral-500 py-6">No users.</td></tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="border-t border-neutral-800 hover:bg-[#111114]">
                  <td className="px-3 py-2 font-medium">{u.username}</td>
                  <td className="px-3 py-2 text-neutral-400">{u.email}</td>
                  <td className="px-3 py-2 text-neutral-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-neutral-500">{u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2 text-neutral-500">{u.provider}</td>
                  <td className="px-3 py-2">
                    {u.locked ? <span className="px-2 py-0.5 rounded bg-red-700/30 text-red-300">Locked</span>
                      : u.emailConfirmed ? <span className="px-2 py-0.5 rounded bg-emerald-700/30 text-emerald-300">Active</span>
                      : <span className="px-2 py-0.5 rounded bg-neutral-700/30 text-neutral-300">Unconfirmed</span>}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      onClick={() => toggleLock(u)}
                      className={`px-2 py-1 rounded text-[11px] ${u.locked ? 'bg-emerald-700/30 hover:bg-emerald-700/50 text-emerald-200' : 'bg-amber-700/30 hover:bg-amber-700/50 text-amber-200'}`}
                    >{u.locked ? 'Unlock' : 'Lock'}</button>
                    <button onClick={() => deleteUser(u)} className="px-2 py-1 rounded text-[11px] bg-red-700/30 hover:bg-red-700/50 text-red-200">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-neutral-500 mt-3">
          Admin has no permission to mint sessions, edit emails, change user passwords, or impersonate users. This is by design to prevent account hijacking.
        </p>
      </section>
    </main>
  );
}
