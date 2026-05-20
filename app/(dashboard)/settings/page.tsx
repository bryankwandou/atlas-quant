'use client';
import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserStore } from '@/store/userStore';
import { useChartStore } from '@/store/chartStore';
import { DEFAULT_SYMBOLS, SUPPORTED_TIMEFRAMES } from '@/src/domain/constants';

const RISK_FIELDS = [
  { label: 'risk_per_trade', key: 'riskPerTrade',      min: 0.1, max: 5,   step: 0.1 },
  { label: 'max_daily_loss', key: 'maxDailyLoss',      min: 1,   max: 20,  step: 0.5 },
  { label: 'max_trades',     key: 'maxTradesDay',      min: 1,   max: 50,  step: 1   },
  { label: 'cooldown',       key: 'cooldownAfterLoss', min: 5,   max: 120, step: 5   },
] as const;

const FEATURE_FLAGS = [
  { label: 'AI Analysis (Groq)',   key: 'aiEnabled',   defaultOn: true  },
  { label: 'Scalping 1M Panel',    key: 'scalping1m',  defaultOn: true  },
  { label: 'SMC Overlay',          key: 'smcEnabled',  defaultOn: false },
  { label: 'ICT Concepts',         key: 'ictEnabled',  defaultOn: false },
  { label: 'Auto Signal Refresh',  key: 'autoRefresh', defaultOn: true  },
  { label: 'Sound Alerts',         key: 'sounds',      defaultOn: false },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { symbol, setSymbol, timeframe, setTimeframe } = useChartStore();
  const { riskPerTrade, maxDailyLoss, maxTradesDay, cooldownAfterLoss, updateRisk } = useUserStore();

  const [flags, setFlags] = useState<Record<string, boolean>>(
    Object.fromEntries(FEATURE_FLAGS.map(f => [f.key, f.defaultOn]))
  );

  const riskValues: Record<string, number> = { riskPerTrade, maxDailyLoss, maxTradesDay, cooldownAfterLoss };

  const tfs = SUPPORTED_TIMEFRAMES.filter(tf => ['1m','5m','15m','1h','4h','1d'].includes(tf.value));

  return (
    <div className="panel-view">
      <div className="panel-header">
        <div className="panel-title">
          <span>⚙️</span>
          <span>{t('nav.settings')}</span>
        </div>
      </div>

      <div className="panel-content">
        <div className="settings-sections">

          {/* Appearance */}
          <div className="settings-section">
            <div className="settings-section-title">Appearance</div>
            <div className="settings-row">
              <span className="settings-label">Theme</span>
              <div className="settings-control">
                {(['dark', 'light'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setTheme(m)}
                    className={`settings-option-btn${theme === m ? ' active' : ''}`}>
                    {t(`settings.theme_${m}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">{t('settings.language')}</span>
              <div className="settings-control">
                {(['id', 'en'] as const).map(l => (
                  <button key={l} type="button" onClick={() => setLang(l)}
                    className={`settings-option-btn${lang === l ? ' active' : ''}`}>
                    {l === 'id' ? '🇮🇩 Indonesia' : '🇬🇧 English'}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">Default Symbol</span>
              <div className="settings-control">
                <select className="settings-select" value={symbol}
                  onChange={e => setSymbol(e.target.value)} title="Default symbol">
                  {DEFAULT_SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">Default TF</span>
              <div className="settings-control">
                <select className="settings-select" value={timeframe}
                  onChange={e => setTimeframe(e.target.value)} title="Default timeframe">
                  {tfs.map(tf => <option key={tf.value} value={tf.value}>{tf.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Risk Management */}
          <div className="settings-section">
            <div className="settings-section-title">Risk Management</div>
            {RISK_FIELDS.map(({ label, key, min, max, step }) => {
              const val = riskValues[key];
              const labelText = label === 'cooldown' ? 'Cooldown (min)' : t(`settings.${label}`);
              return (
                <div key={key} className="settings-row">
                  <span className="settings-label">
                    {labelText}: <strong>{val}</strong>
                  </span>
                  <div className="settings-control">
                    <input
                      id={`risk-${key}`}
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={val}
                      onChange={e => updateRisk({ [key]: parseFloat(e.target.value) } as any)}
                      className="form-range"
                      title={labelText}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature Flags */}
          <div className="settings-section">
            <div className="settings-section-title">Feature Flags</div>
            {FEATURE_FLAGS.map(({ label, key }) => (
              <div key={key} className="settings-row">
                <span className="settings-label">{label}</span>
                <div className="settings-control">
                  <div
                    className={`settings-toggle${flags[key] ? ' on' : ''}`}
                    onClick={() => setFlags(prev => ({ ...prev, [key]: !prev[key] }))}
                    role="switch"
                    aria-checked={flags[key]}
                  >
                    <div className="toggle-knob" />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
