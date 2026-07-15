/**
 * Atlas Quant · Admin store
 * --------------------------------------------------------------------
 * Persists admin-only configuration:
 *   - admin password hash (PBKDF2-SHA256, 100k iters, 16-byte salt)
 *   - signup mode  ('open' | 'approval')
 *
 * Strategy:
 *   1. Primary  → Supabase Auth user_metadata on a dedicated record
 *                 (email: ADMIN_RECORD_EMAIL). This works wherever
 *                 Supabase is configured (Vercel, Render, local dev).
 *   2. Fallback → in-process Map (warned at log-level; survives only
 *                 until the cold-start cycle).
 *
 * Bootstrap credentials: username dari env ADMIN_USERNAME (default nayrbryanGaming),
 * password WAJIB dari env ADMIN_PASSWORD (tidak ada default di kode — anti-bocor).
 * Admin harus set ADMIN_PASSWORD di Vercel env, lalu ganti via UI setelah login.
 *
 * Capability model (enforced by the routes that consume this store):
 *   - Admin CAN list users, lock/unlock users, delete users, change
 *     signup mode, change own password.
 *   - Admin CANNOT impersonate users, mint sessions, edit user emails,
 *     or hand out tokens — preventing account-hijacking via admin.
 */

import crypto from 'crypto';
import { supabaseAuthAdmin } from '@/src/services/supabase-auth';

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'nayrbryanGaming';
// Password TIDAK PERNAH ditulis di kode (anti-bocor). Sumber password admin HANYA
// dari env ADMIN_PASSWORD yang diset admin sendiri di Vercel → Settings → Environment
// Variables. Kalau env kosong, login bootstrap dinonaktifkan (harus set env dulu).
const BOOTSTRAP_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_RECORD_EMAIL = 'admin@atlas-quant.system';

export type SignupMode = 'open' | 'approval';

export interface AdminConfig {
  passwordHash: string | null;   // null = use BOOTSTRAP_PASSWORD
  passwordSalt: string | null;
  signupMode: SignupMode;
  lockedUserIds: string[];
  passwordChangedAt: string | null;
  configUpdatedAt: string;
}

const DEFAULT_CONFIG: AdminConfig = {
  passwordHash: null,
  passwordSalt: null,
  signupMode: 'approval',          // safe default: admin must approve
  lockedUserIds: [],
  passwordChangedAt: null,
  configUpdatedAt: new Date(0).toISOString(),
};

// ── Hash helpers ─────────────────────────────────────────────────────────────
export function hashPassword(password: string, saltHex?: string): { hash: string; salt: string } {
  const salt = saltHex ?? crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha256').toString('hex');
  return { hash, salt };
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'hex');
  const bBuf = Buffer.from(b, 'hex');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// ── In-memory fallback (cold-start ephemeral) ────────────────────────────────
let MEM: AdminConfig = { ...DEFAULT_CONFIG };
function isSupabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

// ── Supabase round-trip helpers ──────────────────────────────────────────────
async function findAdminRecord(): Promise<{ id: string; metadata: any } | null> {
  try {
    // Supabase listUsers max 1000; admin record is created lazily.
    const { data, error } = await (supabaseAuthAdmin.auth.admin as any).listUsers({ page: 1, perPage: 1000 });
    if (error) return null;
    const u = data?.users?.find((x: any) => x.email === ADMIN_RECORD_EMAIL);
    return u ? { id: u.id, metadata: u.user_metadata ?? {} } : null;
  } catch {
    return null;
  }
}

async function createAdminRecord(): Promise<{ id: string; metadata: any } | null> {
  try {
    const { data, error } = await supabaseAuthAdmin.auth.admin.createUser({
      email: ADMIN_RECORD_EMAIL,
      password: crypto.randomBytes(32).toString('hex'),  // unused — record is metadata-only
      email_confirm: true,
      user_metadata: {
        __atlas_admin: true,
        config: DEFAULT_CONFIG,
      },
    });
    if (error || !data.user) return null;
    return { id: data.user.id, metadata: data.user.user_metadata ?? {} };
  } catch {
    return null;
  }
}

async function writeConfig(cfg: AdminConfig): Promise<void> {
  cfg.configUpdatedAt = new Date().toISOString();
  MEM = { ...cfg };
  if (!isSupabaseConfigured()) return;
  try {
    let rec = await findAdminRecord();
    if (!rec) rec = await createAdminRecord();
    if (!rec) return;
    await supabaseAuthAdmin.auth.admin.updateUserById(rec.id, {
      user_metadata: { ...(rec.metadata ?? {}), __atlas_admin: true, config: cfg },
    });
  } catch {
    /* swallow — in-memory copy still in MEM */
  }
}

async function readConfig(): Promise<AdminConfig> {
  if (!isSupabaseConfigured()) return MEM;
  try {
    const rec = await findAdminRecord();
    if (!rec) return MEM;
    const cfg = rec.metadata?.config as AdminConfig | undefined;
    if (!cfg) return MEM;
    MEM = { ...cfg };
    return cfg;
  } catch {
    return MEM;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function verifyAdminPassword(username: string, password: string): Promise<boolean> {
  if (username !== ADMIN_USERNAME) return false;
  const cfg = await readConfig();
  if (!cfg.passwordHash || !cfg.passwordSalt) {
    // Bootstrap path: bandingkan dengan env ADMIN_PASSWORD. Jika env kosong,
    // login bootstrap dimatikan (return false) — admin wajib set env dulu.
    if (!BOOTSTRAP_PASSWORD) return false;
    const a = Buffer.from(password);
    const b = Buffer.from(BOOTSTRAP_PASSWORD);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
  const { hash } = hashPassword(password, cfg.passwordSalt);
  return timingSafeEqualHex(hash, cfg.passwordHash);
}

export async function setAdminPassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await verifyAdminPassword(ADMIN_USERNAME, currentPassword))) {
    return { ok: false, error: 'Current password is incorrect.' };
  }
  if (newPassword.length < 12) {
    return { ok: false, error: 'New password must be at least 12 characters.' };
  }
  if (newPassword === BOOTSTRAP_PASSWORD) {
    return { ok: false, error: 'New password cannot be the bootstrap password.' };
  }
  const { hash, salt } = hashPassword(newPassword);
  const cfg = await readConfig();
  cfg.passwordHash = hash;
  cfg.passwordSalt = salt;
  cfg.passwordChangedAt = new Date().toISOString();
  await writeConfig(cfg);
  return { ok: true };
}

export async function isBootstrapPassword(): Promise<boolean> {
  const cfg = await readConfig();
  return !cfg.passwordHash;
}

// Signup mode
export async function getSignupMode(): Promise<SignupMode> {
  const cfg = await readConfig();
  return cfg.signupMode;
}
export async function setSignupMode(mode: SignupMode): Promise<void> {
  const cfg = await readConfig();
  cfg.signupMode = mode;
  await writeConfig(cfg);
}
export async function isSignupOpen(): Promise<boolean> {
  const cfg = await readConfig();
  return cfg.signupMode === 'open';
}

// Lock list
export async function isUserLocked(userId: string): Promise<boolean> {
  const cfg = await readConfig();
  return cfg.lockedUserIds.includes(userId);
}
export async function lockUser(userId: string): Promise<void> {
  const cfg = await readConfig();
  if (!cfg.lockedUserIds.includes(userId)) cfg.lockedUserIds.push(userId);
  await writeConfig(cfg);
}
export async function unlockUser(userId: string): Promise<void> {
  const cfg = await readConfig();
  cfg.lockedUserIds = cfg.lockedUserIds.filter((x) => x !== userId);
  await writeConfig(cfg);
}

export async function readPublicConfig(): Promise<{
  signupMode: SignupMode;
  isBootstrap: boolean;
  lockedCount: number;
  passwordChangedAt: string | null;
}> {
  const cfg = await readConfig();
  return {
    signupMode: cfg.signupMode,
    isBootstrap: !cfg.passwordHash,
    lockedCount: cfg.lockedUserIds.length,
    passwordChangedAt: cfg.passwordChangedAt,
  };
}
