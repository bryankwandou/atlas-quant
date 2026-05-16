/**
 * Atlas Quant — admin-controlled toggleable settings.
 * Dipersist di Supabase tabel `app_admin_settings` (key/value JSONB).
 * Fallback: in-memory dev cache.
 */
import { supabaseAdmin, hasSupabase } from '../db/supabase';

export type RegistrationMode = 'free' | 'pending_approval' | 'closed';

interface AdminSettings {
  registrationMode: RegistrationMode;
  walletAutoApprove: boolean;
  emailAutoApprove: boolean;
  maintenanceMode: boolean;
  announcement: string | null;
  updatedAt: string;
}

const DEFAULT: AdminSettings = {
  registrationMode: (process.env.REGISTRATION_MODE as RegistrationMode) || 'free',
  walletAutoApprove: process.env.WALLET_AUTO_APPROVE === 'true',
  emailAutoApprove: process.env.EMAIL_AUTO_APPROVE !== 'false',
  maintenanceMode: false,
  announcement: null,
  updatedAt: new Date().toISOString(),
};

let cache: AdminSettings = { ...DEFAULT };
let lastFetch = 0;

export async function getAdminSettings(): Promise<AdminSettings> {
  if (Date.now() - lastFetch < 10_000) return cache;
  const sb = supabaseAdmin();
  if (sb) {
    const { data } = await sb.from('app_admin_settings').select('*').eq('id', 'global').maybeSingle();
    if (data) {
      cache = {
        registrationMode: (data.registration_mode as RegistrationMode) || DEFAULT.registrationMode,
        walletAutoApprove: !!data.wallet_auto_approve,
        emailAutoApprove: data.email_auto_approve !== false,
        maintenanceMode: !!data.maintenance_mode,
        announcement: (data.announcement as string | null) ?? null,
        updatedAt: data.updated_at as string,
      };
    }
  }
  lastFetch = Date.now();
  return cache;
}

export async function updateAdminSettings(patch: Partial<AdminSettings>): Promise<AdminSettings> {
  cache = { ...cache, ...patch, updatedAt: new Date().toISOString() };
  const sb = supabaseAdmin();
  if (sb) {
    await sb.from('app_admin_settings').upsert({
      id: 'global',
      registration_mode: cache.registrationMode,
      wallet_auto_approve: cache.walletAutoApprove,
      email_auto_approve: cache.emailAutoApprove,
      maintenance_mode: cache.maintenanceMode,
      announcement: cache.announcement,
      updated_at: cache.updatedAt,
    });
  }
  lastFetch = 0;
  return cache;
}

export function isSupabaseReady(): boolean { return hasSupabase(); }
