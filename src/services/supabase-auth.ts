import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _auth: SupabaseClient | null = null;
let _authAdmin: SupabaseClient | null = null;

function getUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  return url;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  return key;
}

export const supabaseAuth: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (!_auth) _auth = createClient(getUrl(), getAnonKey());
    return (_auth as any)[prop];
  },
});

export const supabaseAuthAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (!_authAdmin) {
      const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getAnonKey();
      _authAdmin = createClient(getUrl(), svcKey, { auth: { persistSession: false } });
    }
    return (_authAdmin as any)[prop];
  },
});
