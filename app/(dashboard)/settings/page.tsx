'use client';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserStore } from '@/store/userStore';

const RISK_FIELDS = [
  { label: 'risk_per_trade', key: 'riskPerTrade',      min: 0.1, max: 5,   step: 0.1 },
  { label: 'max_daily_loss', key: 'maxDailyLoss',      min: 1,   max: 20,  step: 0.5 },
  { label: 'max_trades',     key: 'maxTradesDay',      min: 1,   max: 50,  step: 1   },
  { label: 'cooldown',       key: 'cooldownAfterLoss', min: 5,   max: 120, step: 5   },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { riskPerTrade, maxDailyLoss, maxTradesDay, cooldownAfterLoss, updateRisk } = useUserStore();

  const riskValues: Record<string, number> = { riskPerTrade, maxDailyLoss, maxTradesDay, cooldownAfterLoss };

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
                {(['light', 'dark'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTheme(m)}
                    className={`settings-option-btn${theme === m ? ' active' : ''}`}
                  >
                    {t(`settings.theme_${m}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="settings-section">
            <div className="settings-section-title">{t('settings.language')}</div>
            <div className="settings-row">
              <span className="settings-label">Language</span>
              <div className="settings-control">
                {(['id', 'en'] as const).map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`settings-option-btn${lang === l ? ' active' : ''}`}
                  >
                    {l === 'id' ? '🇮🇩 Indonesia' : '🇬🇧 English'}
                  </button>
                ))}
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

        </div>
      </div>
    </div>
  );
}
