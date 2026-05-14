import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/services/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userPubkey = searchParams.get('user');
  if (!userPubkey) return NextResponse.json({ error: 'Missing user' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('watchlist')
    .select('*')
    .eq('user_pubkey', userPubkey)
    .order('priority', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ watchlist: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userPubkey, symbol, assetClass = 'crypto', displayName, alertEnabled = false, alertPrice, alertType } = body;

  if (!userPubkey || !symbol) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('watchlist')
    .upsert({
      user_pubkey: userPubkey, symbol, asset_class: assetClass,
      display_name: displayName, alert_enabled: alertEnabled,
      alert_price: alertPrice, alert_type: alertType,
    }, { onConflict: 'user_pubkey,symbol' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
