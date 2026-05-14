import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singletons — created on first use so build-time analysis doesn't crash
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase env vars missing');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing');
    _supabaseAdmin = createClient(url, svcKey || anonKey || '', {
      auth: { persistSession: false },
    });
  }
  return _supabaseAdmin;
}

// Keep backward-compatible named exports (proxy getters)
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) { return (getSupabase() as any)[prop]; },
});

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) { return (getSupabaseAdmin() as any)[prop]; },
});

export async function getOHLCV(symbol: string, timeframe: string, limit = 500) {
  const { data, error } = await getSupabaseAdmin()
    .from('market_ohlcv')
    .select('*')
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('open_time', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function upsertOHLCV(candles: any[]) {
  if (candles.length === 0) return;
  const { error } = await getSupabaseAdmin()
    .from('market_ohlcv')
    .upsert(candles, { onConflict: 'symbol,timeframe,open_time', ignoreDuplicates: true });
  if (error) throw error;
}

export async function saveSignal(signal: any) {
  const { data, error } = await getSupabaseAdmin()
    .from('quant_signals')
    .insert(signal)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLatestSignals(symbol?: string, limit = 20) {
  let query = getSupabaseAdmin()
    .from('quant_signals')
    .select('*')
    .eq('is_active', true)
    .order('generated_at', { ascending: false })
    .limit(limit);
  if (symbol) query = query.eq('symbol', symbol);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getUserSettings(userPubkey: string) {
  const { data } = await getSupabase()
    .from('user_settings')
    .select('*')
    .eq('user_pubkey', userPubkey)
    .single();
  return data;
}

export async function upsertUserSettings(settings: any) {
  const { data, error } = await getSupabase()
    .from('user_settings')
    .upsert(settings, { onConflict: 'user_pubkey' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
