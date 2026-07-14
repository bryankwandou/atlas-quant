/**
 * /dashboard — KONSOL SUPERADMIN TERSEMBUNYI.
 *
 * Standalone (di luar route-group (dashboard)) → tak mewarisi chrome chart maupun
 * redirect /login. Tidak tertaut di menu manapun; hanya bisa dibuka dengan mengetik
 * URL /dashboard lalu login database (username + password admin) — diverifikasi
 * SERVER-SIDE lewat cookie admin-session (httpOnly, HMAC). localStorage tidak dipakai
 * sebagai gate, jadi tak bisa dibobol dari devtools.
 */
import { verifyAdminSession } from '@/src/services/admin/session';
import { countByAssetClass, STATIC_ASSET_UNIVERSE } from '@/data/assets';
import { INDICATOR_REGISTRY } from '@/core/indicators/registry';
import AdminGate from '@/components/superadmin/AdminGate';
import SuperConsole, { type SysInfo } from '@/components/superadmin/SuperConsole';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Konsol Superadmin — ATLAS·QUANT', robots: { index: false, follow: false } };

export default async function DashboardPage() {
  const session = await verifyAdminSession();
  if (!session.ok) return <AdminGate />;

  // Kumpulkan info sistem server-side (aman — hanya setelah gate lolos).
  const assetsByClass = countByAssetClass();
  const indicatorsByCategory: Record<string, number> = {};
  for (const preset of INDICATOR_REGISTRY) {
    const cat = (preset as any)?.category ?? 'Lainnya';
    indicatorsByCategory[cat] = (indicatorsByCategory[cat] || 0) + 1;
  }
  const envKeys = [
    'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET',
    'ADMIN_SESSION_SECRET', 'CRON_SECRET', 'GROQ_API_KEY', 'ARBITER_API_KEY',
    'MASTER_USERNAME', 'ADMIN_SECRET',
  ];
  const env: Record<string, boolean> = {};
  for (const k of envKeys) env[k] = !!process.env[k];

  const sys: SysInfo = {
    username: session.username,
    assetsTotal: STATIC_ASSET_UNIVERSE.length,
    assetsByClass,
    indicatorsTotal: INDICATOR_REGISTRY.length,
    indicatorsByCategory,
    env,
    node: process.version,
    now: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7),
    region: process.env.VERCEL_REGION || 'local',
  };

  return <SuperConsole sys={sys} />;
}
