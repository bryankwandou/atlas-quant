'use client';
import { useSignals, useGenerateSignal } from '@/hooks/useSignals';
import { useChartStore } from '@/store/chartStore';
import SignalCard from '@/components/signals/SignalCard';
import RegimeDisplay from '@/components/quant/RegimeDisplay';
import { useLanguage } from '@/hooks/useLanguage';
import { DEFAULT_SYMBOLS } from '@/src/domain/constants';
import { SUPPORTED_TIMEFRAMES } from '@/src/domain/constants';

export default function SignalsPage() {
  const { symbol, timeframe, setSymbol, setTimeframe } = useChartStore();
  const { signals, isLoading, refresh } = useSignals(undefined, 30);
  const { generate, loading } = useGenerateSignal();
  const { t } = useLanguage();

  const handleGenerate = async () => {
    await generate(symbol, timeframe);
    refresh();
  };

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{t('nav.signals')}</h1>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12 }}
        >
          {DEFAULT_SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={timeframe}
          onChange={e => setTimeframe(e.target.value)}
          style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12 }}
        >
          {SUPPORTED_TIMEFRAMES.filter(tf => ['1m','5m','15m','1h','4h','1d'].includes(tf.value)).map(tf => (
            <option key={tf.value} value={tf.value}>{tf.label}</option>
          ))}
        </select>

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: '5px 14px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
        >
          {loading ? 'Generating...' : '⚡ Generate Signal'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Signals list */}
        <div>
          {isLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('common.loading')}</div>
          ) : signals.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No signals yet. Click Generate Signal above.</div>
          ) : (
            signals.map((s: any) => <SignalCard key={s.id} signal={s} />)
          )}
        </div>

        {/* Regime */}
        <div>
          <RegimeDisplay symbol={symbol} timeframe={timeframe} />
        </div>
      </div>
    </div>
  );
}
