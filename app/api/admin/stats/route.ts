/**
 * GET /api/admin/stats — quick stats untuk admin overview panel.
 */
import { NextResponse } from 'next/server';
import { verifySession } from '@/services/auth/session';
import { supabaseAdmin } from '@/services/db/supabase';
import { countByAssetClass, STATIC_ASSET_UNIVERSE } from '@/data/assets';
import { INDICATOR_REGISTRY } from '@/core/indicators/registry';

function getToken(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7);
  return null;
}

export async function GET(req: Request) {
  const token = getToken(req);
  const s = token ? verifySession(token) : null;
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only.' }, { status: 403 });
  }

  const assetCounts = countByAssetClass();
  const indicatorCount = INDICATOR_REGISTRY.length;
  const indicatorByCategory: Record<string, number> = {};
  for (const { def } of INDICATOR_REGISTRY) {
    indicatorByCategory[def.category] = (indicatorByCategory[def.category] || 0) + 1;
  }

  let totalUsers = 0;
  let pendingUsers = 0;
  let walletUsers = 0;
  let emailUsers = 0;
  let recentSignups: Array<{ id: string; auth_method: string; created_at: string }> = [];

  const sb = supabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('app_users').select('id, auth_method, is_approved, created_at').order('created_at', { ascending: false });
    if (!error && data) {
      totalUsers = data.length;
      pendingUsers = data.filter((d) => !d.is_approved).length;
      walletUsers = data.filter((d) => d.auth_method === 'wallet').length;
      emailUsers = data.filter((d) => d.auth_method === 'email').length;
      recentSignups = data.slice(0, 10);
    }
  }

  return NextResponse.json({
    assets: {
      total: STATIC_ASSET_UNIVERSE.length,
      byClass: assetCounts,
    },
    indicators: {
      total: indicatorCount,
      byCategory: indicatorByCategory,
    },
    users: { totalUsers, pendingUsers, walletUsers, emailUsers, recentSignups },
    timestamp: new Date().toISOString(),
  });
}
