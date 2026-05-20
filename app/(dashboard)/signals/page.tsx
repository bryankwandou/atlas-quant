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
    <div className="page-wrap">
      <h1 className="page-title">{t('nav.signals')}</h1>

      <div className="controls-row">
        <select
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          className="form-select"
        >
          {DEFAULT_SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={timeframe}
          onChange={e => setTimeframe(e.target.value)}
          className="form-select"
        >
          {SUPPORTED_TIMEFRAMES.filter(tf => ['1m','5m','15m','1h','4h','1d'].includes(tf.value)).map(tf => (
            <option key={tf.value} value={tf.value}>{tf.label}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Generating...' : '⚡ Generate Signal'}
        </button>
      </div>

      <div className="signals-grid">
        <div>
          {isLoading ? (
            <div className="loading-msg">{t('common.loading')}</div>
          ) : signals.length === 0 ? (
            <div className="loading-msg">No signals yet. Click Generate Signal above.</div>
          ) : (
            signals.map((s: any) => <SignalCard key={s.id} signal={s} />)
          )}
        </div>
        <div>
          <RegimeDisplay symbol={symbol} timeframe={timeframe} />
        </div>
      </div>
    </div>
  );
}
