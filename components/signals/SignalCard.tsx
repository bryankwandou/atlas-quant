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

  return (
    <div className={`card fade-in ${borderClass}`} style={{ marginBottom: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {signal.symbol} · {signal.timeframe}
          </span>
          <span className={`${sigClass}`} style={{ padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 700 }}>
            {t(`signal.${signal.signal_type.toLowerCase()}`)}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {signal.confidence}%
        </span>
      </div>

      {/* Confidence bar */}
      <div className="confidence-bar" style={{ marginBottom: 10 }}>
        <div className="confidence-fill" style={{
          width: `${signal.confidence}%`,
          background: isBuy ? 'var(--buy)' : isSell ? 'var(--sell)' : 'var(--neutral)',
        }} />
      </div>

      {/* Levels */}
      {!isNeutral && signal.entry_price && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8, fontSize: 12 }}>
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{t('signal.entry')}</div>
            <div className="mono" style={{ fontWeight: 500 }}>
              ${signal.entry_price?.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>R:R</div>
            <div className="mono" style={{ color: 'var(--accent)' }}>1:{signal.rr_ratio}</div>
          </div>
          {signal.tp1 && (
            <div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>TP1</div>
              <div className="mono text-buy">${signal.tp1?.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
            </div>
          )}
          {signal.tp2 && (
            <div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>TP2</div>
              <div className="mono text-buy">${signal.tp2?.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
            </div>
          )}
          {signal.sl && (
            <div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{t('signal.sl')}</div>
              <div className="mono text-sell">${signal.sl?.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
            </div>
          )}
          {signal.regime && (
            <div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{t('signal.regime')}</div>
              <div style={{ fontSize: 11 }}>{t(`regime.${signal.regime}`) || signal.regime}</div>
            </div>
          )}
        </div>
      )}

      {/* Strategy badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 2 }}>
          {signal.strategy}
        </span>
        {signal.generated_at && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {new Date(signal.generated_at).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* AI Analysis */}
      {signal.ai_analysis && (
        <div style={{ marginTop: 8, padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 4, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          🤖 {signal.ai_analysis}
        </div>
      )}
    </div>
  );
}
