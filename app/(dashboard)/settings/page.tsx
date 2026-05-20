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
    <div className="page-wrap-sm">
      <h1 className="page-title-mb">{t('nav.settings')}</h1>

      {/* Appearance */}
      <div className="card card-mb">
        <div className="card-title">Appearance</div>
        <div className="btn-group">
          {(['light', 'dark'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setTheme(m)}
              className={`btn-toggle${theme === m ? ' active' : ''}`}
            >
              {t(`settings.theme_${m}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="card card-mb">
        <div className="card-title">{t('settings.language')}</div>
        <div className="btn-group">
          {(['id', 'en'] as const).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`btn-toggle${lang === l ? ' active' : ''}`}
            >
              {l === 'id' ? '🇮🇩 Indonesia' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      </div>

      {/* Risk */}
      <div className="card">
        <div className="card-title">Risk Management</div>
        <div className="form-grid-2">
          {RISK_FIELDS.map(({ label, key, min, max, step }) => {
            const val = riskValues[key];
            const labelKey = label === 'cooldown' ? 'Cooldown (min)' : t(`settings.${label}`);
            return (
              <div key={key}>
                <label htmlFor={`risk-${key}`} className="form-label">
                  {labelKey}: <strong>{val}</strong>
                </label>
                <input
                  id={`risk-${key}`}
                  type="range" min={min} max={max} step={step} value={val}
                  onChange={e => updateRisk({ [key]: parseFloat(e.target.value) } as any)}
                  className="form-range"
                  title={labelKey}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
