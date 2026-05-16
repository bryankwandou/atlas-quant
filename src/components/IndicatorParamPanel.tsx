'use client';
/**
 * IndicatorParamPanel — render dynamic form berdasarkan IndicatorDef.inputs.
 * Mendukung tipe input: int, float, bool, enum, color, source, levels.
 *
 * Levels: comma-separated angka (mis. "-0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5").
 */
import { useState } from 'react';
import type { IndicatorDef, IndicatorInput } from '@/domain/indicator';

export interface IndicatorParamPanelProps {
  def: IndicatorDef;
  initial?: Record<string, unknown>;
  onApply: (params: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export default function IndicatorParamPanel({ def, initial, onApply, onCancel }: IndicatorParamPanelProps) {
  const defaults: Record<string, unknown> = {};
  for (const inp of def.inputs) defaults[inp.key] = initial?.[inp.key] !== undefined ? initial[inp.key] : inp.default;
  const [vals, setVals] = useState<Record<string, unknown>>(defaults);

  function update(k: string, v: unknown) {
    setVals((prev) => ({ ...prev, [k]: v }));
  }

  function renderInput(inp: IndicatorInput) {
    const val = vals[inp.key];
    switch (inp.type) {
      case 'int':
      case 'float':
        return (
          <input
            type="number"
            className="aq-input"
            value={val as number}
            min={inp.min}
            max={inp.max}
            step={inp.step ?? (inp.type === 'int' ? 1 : 0.01)}
            onChange={(e) => update(inp.key, inp.type === 'int' ? parseInt(e.target.value || '0', 10) : parseFloat(e.target.value || '0'))}
          />
        );
      case 'bool':
        return (
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={!!val} onChange={(e) => update(inp.key, e.target.checked)} />
            <span className="text-xs text-[var(--text-secondary)]">{val ? 'aktif' : 'nonaktif'}</span>
          </label>
        );
      case 'enum':
        return (
          <select className="aq-input" value={String(val)} onChange={(e) => update(inp.key, e.target.value)}>
            {(inp.options ?? []).map((o) => (
              <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
            ))}
          </select>
        );
      case 'color':
        return (
          <input type="color" className="h-9 w-16 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]" value={String(val)} onChange={(e) => update(inp.key, e.target.value)} />
        );
      case 'source':
        return (
          <select className="aq-input" value={String(val)} onChange={(e) => update(inp.key, e.target.value)}>
            {['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4', 'volume'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        );
      case 'levels': {
        const arr = Array.isArray(val) ? val : [];
        return (
          <input
            type="text"
            className="aq-input mono"
            value={arr.join(', ')}
            onChange={(e) => update(inp.key, e.target.value
              .split(',')
              .map((s) => parseFloat(s.trim()))
              .filter((v) => Number.isFinite(v)))}
            placeholder="-0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5"
          />
        );
      }
      default:
        return <input className="aq-input" value={String(val ?? '')} onChange={(e) => update(inp.key, e.target.value)} />;
    }
  }

  return (
    <div className="aq-card p-5 aq-fade">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="font-semibold">{def.name}</h3>
          <p className="text-xs text-[var(--text-muted)]">{def.descriptionId || def.description}</p>
        </div>
        <span className="aq-pill">{def.category}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {def.inputs.map((inp) => (
          <div key={inp.key} className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">{inp.labelId || inp.label}</label>
            {renderInput(inp)}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        {onCancel && <button onClick={onCancel} className="aq-btn aq-btn-secondary">Batal</button>}
        <button onClick={() => onApply(vals)} className="aq-btn">Terapkan</button>
      </div>
    </div>
  );
}
