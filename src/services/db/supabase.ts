/**
 * Supabase clients — anon (browser) & service-role (server).
 * Gunakan `supabaseAdmin` HANYA di server (/api routes, lib server-only).
 * Aman terhadap missing env: jika Supabase belum dikonfigurasi, kembalikan
 * `null` lalu fallback ke in-memory store (development).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _browser: SupabaseClient | null = null;
let _admin: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  if (!_browser) {
    _browser = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _browser;
}

export function supabaseAdmin(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE) return null;
  if (!_admin) {
    _admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

export const hasSupabase = (): boolean => Boolean(SUPABASE_URL && SUPABASE_SERVICE);
