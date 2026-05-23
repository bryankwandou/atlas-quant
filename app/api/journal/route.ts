import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/services/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userPubkey = searchParams.get('user');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!userPubkey) return NextResponse.json({ error: 'Missing user' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('trade_journal')
    .select('*')
    .eq('user_pubkey', userPubkey)
    .order('entry_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trades: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userPubkey, symbol, direction, entryPrice, quantity, tpPrice, slPrice, leverage = 1, strategyUsed, notes } = body;

  if (!userPubkey || !symbol || !direction || !entryPrice || !quantity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('trade_journal')
    .insert({
      user_pubkey: userPubkey, symbol, direction,
      entry_price: entryPrice, quantity,
      tp_price: tpPrice, sl_price: slPrice,
      leverage, strategy_used: strategyUsed, notes,
      status: 'OPEN',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trade: data }, { status: 201 });
}
