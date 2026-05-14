'use client';
import useSWR from 'swr';
import { useLanguage } from '@/hooks/useLanguage';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const COLOR_MAP: Record<string, string> = {
  green: 'var(--buy)', lime: '#65a30d', yellow: '#ca8a04', orange: '#ea580c',
  red: 'var(--sell)', purple: '#9333ea', gray: 'var(--text-muted)', blue: 'var(--accent)',
};

export default function RegimeDisplay({ symbol, timeframe }: { symbol: string; timeframe: string }) {
  const { t } = useLanguage();
  const { data, isLoading } = useSWR(
    `/api/quant/regime?symbol=${symbol}&timeframe=${timeframe}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) return <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Detecting regime...</div>;
  if (!data?.regime) return null;

  const { regime } = data;
  const color = COLOR_MAP[regime.color] || 'var(--text-muted)';

  return (
    <div style={{ padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 5, border: '1px solid var(--border)', fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Market Regime</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{regime.confidence}%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, color }}>{t(`regime.${regime.regime}`) || regime.labelId}</span>
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>ADX: {regime.adx}</span>
        <span>Vol: {regime.volatilityPct}%</span>
        <span style={{ color: regime.tradeAllowed ? 'var(--buy)' : 'var(--sell)' }}>
          {regime.tradeAllowed ? '✓ Trade OK' : '✗ No Trade'}
        </span>
      </div>
    </div>
  );
}
