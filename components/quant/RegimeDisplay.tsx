'use client';
import useSWR from 'swr';
import { useLanguage } from '@/hooks/useLanguage';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function RegimeDisplay({ symbol, timeframe }: { symbol: string; timeframe: string }) {
  const { t } = useLanguage();
  const { data, isLoading } = useSWR(
    `/api/quant/regime?symbol=${symbol}&timeframe=${timeframe}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) return <div className="regime-loading">Detecting regime...</div>;
  if (!data || data.error) return <div className="regime-loading">Regime data unavailable.</div>;

  const regime = data?.regime ?? data;
  const regimeName = typeof regime === 'string' ? regime : (regime?.regime ?? regime?.label ?? 'RANGING');
  const confidence = regime?.confidence ?? data?.confidence ?? '—';
  const adx        = regime?.adx       ?? data?.adx       ?? '—';
  const volPct     = regime?.volatilityPct ?? data?.volatilityPct ?? '—';
  const tradeOk    = regime?.tradeAllowed ?? true;
  const colorKey   = regime?.color ?? (regimeName.includes('UP') ? 'green' : regimeName.includes('DOWN') ? 'red' : 'orange');

  return (
    <div className="regime-box">
      <div className="regime-header">
        <span className="regime-muted">Market Regime</span>
        <span className="regime-muted">{confidence}%</span>
      </div>
      <div className="regime-row">
        <span className={`regime-dot regime-dot-${colorKey}`} />
        <span className={`regime-name regime-name-${colorKey}`}>{regimeName}</span>
      </div>
      <div className="regime-stats">
        <span>ADX: {adx}</span>
        <span>Vol: {volPct}%</span>
        <span className={tradeOk ? 'regime-trade-ok' : 'regime-trade-no'}>
          {tradeOk ? 'Trade OK' : 'No Trade'}
        </span>
      </div>
    </div>
  );
}
