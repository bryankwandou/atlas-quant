'use client';
import { useEffect, useMemo, useState } from 'react';
import { X, RotateCcw, Save } from 'lucide-react';
import { useChartStore } from '@/store/chartStore';
import { INDICATOR_INDEX } from '@/core/indicators/registry';
import { resolveSchema, type ParamField, type ParamSchema } from '@/core/indicators/paramSchema';

interface Props {
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
        <div className="indicator-modal indmod-param-modal-sm" onClick={(e) => e.stopPropagation()}>
          <div className="indmod-header">
            <div className="indmod-title">
              <span>{preset.name}</span>
            </div>
            <button type="button" className="indmod-close" onClick={onClose} aria-label="Close">
              <X size={15} />
            </button>
          </div>
          <div className="indmod-body indmod-no-params-body">
            <p>This indicator has no editable parameters.</p>
            <p className="indmod-no-params-desc">{preset.description}</p>
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
      <div className="indicator-modal indmod-param-modal" onClick={(e) => e.stopPropagation()}>
        <div className="indmod-header">
          <div className="indmod-title">
            <span>{preset.name}</span>
            <span className="indmod-meta">
              · {schema.category} · {preset.author}
            </span>
          </div>
          <button type="button" className="indmod-close" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="indmod-body indmod-body-params">
          {schema.fields.map((field) => (
            <ParamRow
              key={field.key}
              field={field}
              value={draft[field.key] ?? field.defaultValue}
              onChange={(v) => update(field.key, v)}
            />
          ))}
        </div>

        <div className="indmod-footer ind-modal-footer indmod-footer-gap">
          <button type="button" className="indmod-reset-btn" onClick={reset}>
            <RotateCcw size={11} className="btn-icon-mr" /> Reset
          </button>
          <button type="button" className="indmod-apply-btn" onClick={save}>
            <Save size={11} className="btn-icon-mr" /> Apply
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
      <label className="param-row-col">
        <span className="param-row-label">{field.label}</span>
        <input
          type="number"
          className="auth-input param-input-sm"
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
      <label className="param-row-inline">
        <span className="param-row-label">{field.label}</span>
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
      <label className="param-row-col">
        <span className="param-row-label">{field.label}</span>
        <select
          className="auth-input param-input-sm"
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
      <label className="param-row-inline">
        <span className="param-row-label">{field.label}</span>
        <input
          type="color"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className="param-color-input"
        />
      </label>
    );
  }
  return null;
}
