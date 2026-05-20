'use client';
import { useLanguage } from '@/hooks/useLanguage';

interface SignalCardProps {
  signal: {
    signal_type: 'BUY' | 'SELL' | 'NEUTRAL';
    strategy: string;
    confidence: number;
    entry_price?: number;
    tp1?: number; tp2?: number; tp3?: number;
    sl?: number;
    rr_ratio?: number;
    atr_value?: number;
    regime?: string;
    ai_analysis?: string;
    generated_at?: string;
    symbol?: string;
    timeframe?: string;
  };
}

export default function SignalCard({ signal }: SignalCardProps) {
  const { t } = useLanguage();
  const isBuy     = signal.signal_type === 'BUY';
  const isSell    = signal.signal_type === 'SELL';
  const isNeutral = signal.signal_type === 'NEUTRAL';
  const sigClass  = isBuy ? 'signal-buy' : isSell ? 'signal-sell' : 'signal-neutral';
  const borderClass = isBuy ? 'border-buy' : isSell ? 'border-sell' : 'border-neutral';
  const fillClass = isBuy ? 'conf-fill-buy' : isSell ? 'conf-fill-sell' : 'conf-fill-neutral';

  return (
    <div className={`card fade-in ${borderClass} sc-mb`}>
      {/* Header */}
      <div className="sc-header">
        <div className="sc-header-left">
          <span className="sc-symbol">
            {signal.symbol} · {signal.timeframe}
          </span>
          <span className={`${sigClass} sc-badge`}>
            {t(`signal.${signal.signal_type.toLowerCase()}`)}
          </span>
        </div>
        <span className="sc-conf-pct">
          {signal.confidence}%
        </span>
      </div>

      {/* Confidence bar */}
      <div className={`confidence-bar sc-conf-bar-mb`}>
        <div className={`confidence-fill ${fillClass}`} style={{ width: `${signal.confidence}%` }} />
      </div>

      {/* Levels */}
      {!isNeutral && signal.entry_price && (
        <div className="sc-levels">
          <div>
            <div className="sc-sublabel">{t('signal.entry')}</div>
            <div className="mono sc-val">
              ${signal.entry_price?.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </div>
          </div>
          <div>
            <div className="sc-sublabel">R:R</div>
            <div className="mono sc-rr">1:{signal.rr_ratio}</div>
          </div>
          {signal.tp1 && (
            <div>
              <div className="sc-sublabel">TP1</div>
              <div className="mono text-buy">${signal.tp1?.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
            </div>
          )}
          {signal.tp2 && (
            <div>
              <div className="sc-sublabel">TP2</div>
              <div className="mono text-buy">${signal.tp2?.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
            </div>
          )}
          {signal.sl && (
            <div>
              <div className="sc-sublabel">{t('signal.sl')}</div>
              <div className="mono text-sell">${signal.sl?.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
            </div>
          )}
          {signal.regime && (
            <div>
              <div className="sc-sublabel">{t('signal.regime')}</div>
              <div className="sc-regime-val">{t(`regime.${signal.regime}`) || signal.regime}</div>
            </div>
          )}
        </div>
      )}

      {/* Strategy badge */}
      <div className="sc-footer">
        <span className="sc-strategy-badge">
          {signal.strategy}
        </span>
        {signal.generated_at && (
          <span className="sc-time">
            {new Date(signal.generated_at).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* AI Analysis */}
      {signal.ai_analysis && (
        <div className="sc-ai">
          🤖 {signal.ai_analysis}
        </div>
      )}
    </div>
  );
}
