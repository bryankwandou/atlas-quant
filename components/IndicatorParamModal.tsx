'use client';
import { useEffect, useMemo, useState } from 'react';
import { X, RotateCcw, Save } from 'lucide-react';
import { useChartStore } from '@/store/chartStore';
import { INDICATOR_INDEX } from '@/src/core/indicators/registry';
import { resolveSchema, type ParamField, type ParamSchema } from '@/src/core/indicators/paramSchema';

interface Props {
  /** Registry id, e.g. "rsi_14" / "bb_20_2" / "ema_50_lux". null = closed. */
  presetId: string | null;
  onClose: () => void;
}

function makeDefaults(schema: ParamSchema): Record<string, number | string | boolean> {
  const out: Record<string, number | string | boolean> = {};
  for (const f of schema.fields) out[f.key] = f.defaultValue;
  return out;
}

export default function IndicatorParamModal({ presetId, onClose }: Props) {
  const indicatorParams = useChartStore((s) => s.indicatorParams);
  const setIndicatorParams = useChartStore((s) => s.setIndicatorParams);
  const clearIndicatorParams = useChartStore((s) => s.clearIndicatorParams);

  const preset = presetId ? INDICATOR_INDEX[presetId] : null;
  const schema = useMemo(() => (preset ? resolveSchema(preset.id, preset.indicator) : undefined), [preset]);

  const [draft, setDraft] = useState<Record<string, number | string | boolean>>({});

  useEffect(() => {
    if (!preset || !schema) {
      setDraft({});
      return;
    }
    const saved = indicatorParams[preset.id];
    setDraft(saved ?? makeDefaults(schema));
  }, [preset, schema, indicatorParams]);

  if (!presetId || !preset) return null;

  if (!schema) {
    return (
      <div className="indicator-modal-overlay" onClick={onClose}>
        <div className="indicator-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
          <div className="indmod-header">
            <div className="indmod-title">
              <span>{preset.name}</span>
            </div>
            <button type="button" className="indmod-close" onClick={onClose} aria-label="Close">
              <X size={15} />
            </button>
          </div>
          <div className="indmod-body" style={{ flexDirection: 'column', padding: 24, color: 'var(--tv-text2, #787b86)' }}>
            <p>This indicator has no editable parameters.</p>
            <p style={{ marginTop: 12, fontSize: 11 }}>{preset.description}</p>
          </div>
          <div className="indmod-footer ind-modal-footer">
            <button type="button" className="indmod-apply-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const update = (key: string, value: number | string | boolean) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const save = () => {
    setIndicatorParams(preset.id, draft);
    onClose();
  };

  const reset = () => {
    setDraft(makeDefaults(schema));
    clearIndicatorParams(preset.id);
  };

  return (
    <div className="indicator-modal-overlay" onClick={onClose}>
      <div className="indicator-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="indmod-header">
          <div className="indmod-title">
            <span>{preset.name}</span>
            <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--tv-text2, #787b86)', fontWeight: 500 }}>
              · {schema.category} · {preset.author}
            </span>
          </div>
          <button type="button" className="indmod-close" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="indmod-body" style={{ flexDirection: 'column', padding: '14px 16px', gap: 10 }}>
          {schema.fields.map((field) => (
            <ParamRow
              key={field.key}
              field={field}
              value={draft[field.key] ?? field.defaultValue}
              onChange={(v) => update(field.key, v)}
            />
          ))}
        </div>

        <div className="indmod-footer ind-modal-footer" style={{ gap: 8 }}>
          <button type="button" className="indmod-reset-btn" onClick={reset}>
            <RotateCcw size={11} style={{ marginRight: 4 }} /> Reset
          </button>
          <button type="button" className="indmod-apply-btn" onClick={save}>
            <Save size={11} style={{ marginRight: 4 }} /> Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function ParamRow({
  field,
  value,
  onChange,
}: {
  field: ParamField;
  value: number | string | boolean;
  onChange: (v: number | string | boolean) => void;
}) {
  if (field.type === 'number') {
    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--tv-text2, #787b86)' }}>{field.label}</span>
        <input
          type="number"
          className="auth-input"
          style={{ padding: '8px 10px', fontSize: 12 }}
          value={value as number}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </label>
    );
  }
  if (field.type === 'boolean') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--tv-text2, #787b86)' }}>{field.label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--tv-text2, #787b86)' }}>{field.label}</span>
        <select
          className="auth-input"
          style={{ padding: '8px 10px', fontSize: 12 }}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        >
          {(field.options ?? []).map((o) => (
            <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
          ))}
        </select>
      </label>
    );
  }
  if (field.type === 'color') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--tv-text2, #787b86)' }}>{field.label}</span>
        <input
          type="color"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 40, height: 28, border: '1px solid #2a2e39', borderRadius: 4, background: 'transparent' }}
        />
      </label>
    );
  }
  return null;
}
