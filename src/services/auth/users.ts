/**
 * User store — Supabase-backed (primary), in-memory fallback (dev only).
 *
 * SECURITY:
 * - NO hardcoded master pubkey. Master ditentukan oleh `is_admin = true`
 *   pada row di tabel `app_users`. Promote user pertama via SQL:
 *       update app_users set is_admin = true, is_approved = true
 *       where email = 'you@example.com';
 * - Password hashed dengan bcrypt (cost 12). NEVER stored plaintext.
 * - Wallet flow tidak menyimpan private key — hanya pubkey.
 */
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { supabaseAdmin, hasSupabase } from '../db/supabase';

export interface AppUser {
  id: string;
  authMethod: 'email' | 'wallet' | 'admin';
  email?: string;
  username?: string;
  walletAddress?: string;
  walletChain?: string;
  displayName?: string;
  avatarUrl?: string;
  isApproved: boolean;
  isAdmin: boolean;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
}

// Dev fallback in-memory (NEVER use in production)
const memoryUsers = new Map<string, AppUser & { passwordHash?: string }>();

const mapRow = (row: Record<string, unknown>): AppUser => ({
  id: row.id as string,
  authMethod: row.auth_method as AppUser['authMethod'],
  email: row.email as string | undefined,
  username: row.username as string | undefined,
  walletAddress: row.wallet_address as string | undefined,
  walletChain: row.wallet_chain as string | undefined,
  displayName: row.display_name as string | undefined,
  avatarUrl: row.avatar_url as string | undefined,
  isApproved: row.is_approved as boolean,
  isAdmin: row.is_admin as boolean,
  role: row.role as string,
  createdAt: row.created_at as string,
  lastLoginAt: row.last_login_at as string | undefined,
});

export async function findUserByEmail(email: string): Promise<(AppUser & { passwordHash?: string }) | null> {
  const sb = supabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('app_users').select('*').eq('email', email).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { ...mapRow(data), passwordHash: data.password_hash as string | undefined };
  }
  for (const u of memoryUsers.values()) if (u.email === email) return u;
  return null;
}

export async function findUserByUsername(username: string): Promise<(AppUser & { passwordHash?: string }) | null> {
  const sb = supabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('app_users').select('*').eq('username', username).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { ...mapRow(data), passwordHash: data.password_hash as string | undefined };
  }
  for (const u of memoryUsers.values()) if (u.username === username) return u;
  return null;
}

export async function findUserByEmailOrUsername(identifier: string): Promise<(AppUser & { passwordHash?: string }) | null> {
  if (identifier.includes('@')) return findUserByEmail(identifier);
  return findUserByUsername(identifier);
}

export async function findUserByWallet(wallet: string): Promise<AppUser | null> {
  const sb = supabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('app_users').select('*').eq('wallet_address', wallet).maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  }
  for (const u of memoryUsers.values()) if (u.walletAddress === wallet) return u;
  return null;
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const sb = supabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('app_users').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  }
  return memoryUsers.get(id) ?? null;
}

export async function createEmailUser(opts: {
  email: string;
  password: string;
  username?: string;
  displayName?: string;
}): Promise<AppUser> {
  if (!opts.email.includes('@')) throw new Error('Invalid email');
  if (opts.password.length < 8) throw new Error('Password minimal 8 karakter');
  const existing = await findUserByEmail(opts.email);
  if (existing) throw new Error('Email sudah terdaftar');

  const passwordHash = await bcrypt.hash(opts.password, 12);
  const id = randomUUID();
  const user: AppUser & { passwordHash: string } = {
    id,
    authMethod: 'email',
    email: opts.email,
    username: opts.username,
    displayName: opts.displayName ?? opts.email.split('@')[0],
    isApproved: true, // email-flow auto-approved (toggle policy via env if needed)
    isAdmin: false,
    role: 'trader',
    createdAt: new Date().toISOString(),
    passwordHash,
  };

  const sb = supabaseAdmin();
  if (sb) {
    const { error } = await sb.from('app_users').insert({
      id,
      auth_method: 'email',
      email: opts.email,
      username: opts.username,
      password_hash: passwordHash,
      display_name: user.displayName,
      is_approved: true,
      is_admin: false,
      role: 'trader',
    });
    if (error) throw error;
  } else {
    memoryUsers.set(id, user);
  }

  return user;
}

export async function createWalletUser(opts: {
  wallet: string;
  chain?: string;
  displayName?: string;
}): Promise<AppUser> {
  const existing = await findUserByWallet(opts.wallet);
  if (existing) return existing;
  const id = randomUUID();
  const user: AppUser = {
    id,
    authMethod: 'wallet',
    walletAddress: opts.wallet,
    walletChain: opts.chain ?? 'solana',
    displayName: opts.displayName ?? opts.wallet.slice(0, 6) + '…' + opts.wallet.slice(-4),
    isApproved: process.env.WALLET_AUTO_APPROVE === 'true', // strict default
    isAdmin: false,
    role: 'trader',
    createdAt: new Date().toISOString(),
  };
  const sb = supabaseAdmin();
  if (sb) {
    const { error } = await sb.from('app_users').insert({
      id,
      auth_method: 'wallet',
      wallet_address: opts.wallet,
      wallet_chain: opts.chain ?? 'solana',
      display_name: user.displayName,
      is_approved: user.isApproved,
      is_admin: false,
      role: 'trader',
    });
    if (error) throw error;
  } else {
    memoryUsers.set(id, user);
  }
  return user;
}

export async function verifyPassword(email: string, password: string): Promise<AppUser | null> {
  const user = await findUserByEmail(email);
  if (!user || !user.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  // Update last login best-effort
  const sb = supabaseAdmin();
  if (sb) {
    await sb.from('app_users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);
  }
  const { passwordHash, ...clean } = user;
  return clean as AppUser;
}

export async function approveUser(userId: string, isAdmin = false): Promise<void> {
  const sb = supabaseAdmin();
  if (sb) {
    await sb.from('app_users').update({ is_approved: true, is_admin: isAdmin }).eq('id', userId);
    return;
  }
  const u = memoryUsers.get(userId);
  if (u) { u.isApproved = true; u.isAdmin = isAdmin; }
}

export function isSupabaseConfigured() { return hasSupabase(); }

/**
 * Auto-bootstrap master account on every cold start.
 * Called by login + register routes so master is ALWAYS accessible
 * even after Vercel serverless resets the in-memory store.
 *
 * Credentials come from env vars (set once via Vercel CLI):
 *   MASTER_EMAIL    — defaults to nayrbryangaming3@gmail.com
 *   MASTER_USERNAME — defaults to nayrbryanGaming
 *   MASTER_PASSWORD — defaults to AtlasQuant2026! (CHANGE IN PRODUCTION)
 */
let _masterBootstrapped = false;

export async function bootstrapMasterAccount(): Promise<void> {
  if (_masterBootstrapped) return;
  _masterBootstrapped = true;

  const masterEmail    = process.env.MASTER_EMAIL    || 'nayrbryanGaming01@gmail.com';
  const masterUsername = process.env.MASTER_USERNAME || 'nayrbryanGaming';
  const masterPassword = process.env.MASTER_PASSWORD || '@Nataliamaria12345';

  try {
    const existing = await findUserByEmailOrUsername(masterEmail);
    if (existing) return; // already exists (Supabase or warm in-memory)

    const passwordHash = await bcrypt.hash(masterPassword, 12);
    const id = randomUUID();
    const master: AppUser & { passwordHash: string } = {
      id,
      authMethod: 'email',
      email: masterEmail,
      username: masterUsername,
      displayName: 'Master',
      isApproved: true,
      isAdmin: true,
      role: 'master',
      createdAt: new Date().toISOString(),
      passwordHash,
    };

    const sb = supabaseAdmin();
    if (sb) {
      await sb.from('app_users').upsert({
        id,
        auth_method: 'email',
        email: masterEmail,
        username: masterUsername,
        password_hash: passwordHash,
        display_name: 'Master',
        is_approved: true,
        is_admin: true,
        role: 'master',
      }, { onConflict: 'email' });
    } else {
      memoryUsers.set(id, master);
    }
  } catch {
    // Non-fatal — master may already exist or DB is not ready yet
    _masterBootstrapped = false; // allow retry next request
  }
}
