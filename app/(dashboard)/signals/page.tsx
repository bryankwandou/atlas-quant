'use client';
import { useSignals, useGenerateSignal } from '@/hooks/useSignals';
import { useChartStore } from '@/store/chartStore';
import SignalCard from '@/components/signals/SignalCard';
import RegimeDisplay from '@/components/quant/RegimeDisplay';
import { useLanguage } from '@/hooks/useLanguage';
import { DEFAULT_SYMBOLS, SUPPORTED_TIMEFRAMES } from '@/src/domain/constants';

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
    <div className="panel-view">
      <div className="panel-header">
        <div className="panel-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>{t('nav.signals')}</span>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="panel-action-btn primary"
        >
          {loading ? 'Generating...' : 'Generate Signal'}
        </button>
      </div>

      <div className="panel-content">
        <div className="signals-controls">
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="settings-select"
            title="Symbol"
          >
            {DEFAULT_SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={timeframe}
            onChange={e => setTimeframe(e.target.value)}
            className="settings-select"
            title="Timeframe"
          >
            {SUPPORTED_TIMEFRAMES.filter(tf => ['1m','5m','15m','1h','4h','1d'].includes(tf.value)).map(tf => (
              <option key={tf.value} value={tf.value}>{tf.label}</option>
            ))}
          </select>
        </div>

        <div className="signals-layout">
          <div>
            {isLoading ? (
              <div className="signals-empty">{t('common.loading')}</div>
            ) : signals.length === 0 ? (
              <div className="signals-empty">No signals yet. Click Generate Signal above.</div>
            ) : (
              signals.map((s: any) => <SignalCard key={s.id} signal={s} />)
            )}
          </div>
          <div>
            <RegimeDisplay symbol={symbol} timeframe={timeframe} />
          </div>
        </div>
      </div>
    </div>
  );
}
