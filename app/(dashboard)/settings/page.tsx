'use client';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserStore } from '@/store/userStore';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { riskPerTrade, maxDailyLoss, maxTradesDay, cooldownAfterLoss, updateRisk } = useUserStore();

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('nav.settings')}</h1>

      {/* Appearance */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Appearance</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['light', 'dark'] as const).map(m => (
            <button
              key={m}
              onClick={() => setTheme(m)}
              style={{
                padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                background: theme === m ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: theme === m ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border)', borderRadius: 4,
              }}
            >
              {t(`settings.theme_${m}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>{t('settings.language')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['id', 'en'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                background: lang === l ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: lang === l ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border)', borderRadius: 4,
              }}
            >
              {l === 'id' ? '🇮🇩 Indonesia' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      </div>

      {/* Risk */}
      <div className="card">
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Risk Management</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: t('settings.risk_per_trade'), key: 'riskPerTrade', value: riskPerTrade, min: 0.1, max: 5, step: 0.1 },
            { label: t('settings.max_daily_loss'), key: 'maxDailyLoss', value: maxDailyLoss, min: 1, max: 20, step: 0.5 },
            { label: t('settings.max_trades'), key: 'maxTradesDay', value: maxTradesDay, min: 1, max: 50, step: 1 },
            { label: 'Cooldown (min)', key: 'cooldownAfterLoss', value: cooldownAfterLoss, min: 5, max: 120, step: 5 },
          ].map(({ label, key, value, min, max, step }) => (
            <div key={key}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                {label}: <strong>{value}</strong>
              </label>
              <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => updateRisk({ [key]: parseFloat(e.target.value) } as any)}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
