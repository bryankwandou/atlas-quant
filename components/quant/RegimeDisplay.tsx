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
  if (!data?.regime) return null;

  const { regime } = data;
  const colorKey = regime.color || 'gray';

  return (
    <div className="regime-box">
      <div className="regime-header">
        <span className="regime-muted">Market Regime</span>
        <span className="regime-muted">{regime.confidence}%</span>
      </div>
      <div className="regime-row">
        <span className={`regime-dot regime-dot-${colorKey}`} />
        <span className={`regime-name regime-name-${colorKey}`}>
          {t(`regime.${regime.regime}`) || regime.labelId}
        </span>
      </div>
      <div className="regime-stats">
        <span>ADX: {regime.adx}</span>
        <span>Vol: {regime.volatilityPct}%</span>
        <span className={regime.tradeAllowed ? 'regime-trade-ok' : 'regime-trade-no'}>
          {regime.tradeAllowed ? '✓ Trade OK' : '✗ No Trade'}
        </span>
      </div>
    </div>
  );
}
