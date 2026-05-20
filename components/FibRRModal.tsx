'use client';
import { useState } from 'react';
import { X, RotateCcw, Save, Plus, Trash2 } from 'lucide-react';
import { useChartStore, DEFAULT_FIB_RR_LEVELS, type FibLevel } from '@/store/chartStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FibRRModal({ open, onClose }: Props) {
  const fib = useChartStore((s) => s.fibConfig);
  const setFibConfig = useChartStore((s) => s.setFibConfig);
  const setFibLevel = useChartStore((s) => s.setFibLevel);
  const resetFibLevels = useChartStore((s) => s.resetFibLevels);

  const [tab, setTab] = useState<'style' | 'coords' | 'visibility'>('style');
  const [newRatio, setNewRatio] = useState('');

  if (!open) return null;

  const addLevel = () => {
    const r = parseFloat(newRatio);
    if (Number.isNaN(r)) return;
    if (fib.levels.some((l) => l.ratio === r)) return;
    setFibConfig({
      levels: [...fib.levels, { ratio: r, enabled: true, color: r >= 1 ? '#22c55e' : '#f23645', label: `${r}R` }]
        .sort((a, b) => a.ratio - b.ratio),
    });
    setNewRatio('');
  };

  const removeLevel = (ratio: number) => {
    setFibConfig({ levels: fib.levels.filter((l) => l.ratio !== ratio) });
  };

  return (
    <div className="indicator-modal-overlay" onClick={onClose}>
      <div className="indicator-modal fibrr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="indmod-header">
          <div className="indmod-title">
            <span>Fib Retracement · Risk-Reward</span>
          </div>
          <button type="button" className="indmod-close" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="fibrr-tabs-header">
          {(['style', 'coords', 'visibility'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`fibrr-tab-btn${tab === t ? ' active' : ''}`}
            >
              {t === 'style' ? 'Style' : t === 'coords' ? 'Coordinates' : 'Visibility'}
            </button>
          ))}
        </div>

        <div className="indmod-body indmod-body-col">
          {tab === 'style' && (
            <>
              {/* Direction */}
              <Row label="Trade Direction">
                <select
                  className="auth-input fibrr-select"
                  value={fib.direction}
                  onChange={(e) => setFibConfig({ direction: e.target.value as 'long' | 'short' })}
                >
                  <option value="long">Long (SL→TP up)</option>
                  <option value="short">Short (SL→TP down)</option>
                </select>
              </Row>

              {/* Trend line */}
              <Row label="Trend line">
                <input
                  type="color"
                  value={fib.trendLineColor}
                  onChange={(e) => setFibConfig({ trendLineColor: e.target.value })}
                  className="fibrr-color-input"
                />
                <label className="fibrr-checkbox-label">
                  <input
                    type="checkbox"
                    checked={fib.trendLineDashed}
                    onChange={(e) => setFibConfig({ trendLineDashed: e.target.checked })}
                  /> Dashed
                </label>
              </Row>

              {/* Levels line */}
              <Row label="Levels line color">
                <input
                  type="color"
                  value={fib.levelsLineColor}
                  onChange={(e) => setFibConfig({ levelsLineColor: e.target.value })}
                  className="fibrr-color-input"
                />
              </Row>

              {/* Extend */}
              <Row label="Extend">
                <select
                  className="auth-input fibrr-select"
                  value={fib.extend}
                  onChange={(e) => setFibConfig({ extend: e.target.value as 'none' | 'right' | 'both' })}
                >
                  <option value="none">Don&apos;t extend</option>
                  <option value="right">Extend right</option>
                  <option value="both">Extend both</option>
                </select>
              </Row>

              <div className="fibrr-divider" />

              {/* Level table */}
              <div className="fibrr-levels-wrap">
                {fib.levels.map((lvl: FibLevel) => (
                  <div key={lvl.ratio} className="fibrr-level-row">
                    <input
                      type="checkbox"
                      checked={lvl.enabled}
                      onChange={(e) => setFibLevel(lvl.ratio, { enabled: e.target.checked })}
                    />
                    <input
                      type="number"
                      value={lvl.ratio}
                      step={0.1}
                      onChange={(e) => {
                        const r = parseFloat(e.target.value);
                        if (!Number.isNaN(r)) setFibLevel(lvl.ratio, { ratio: r });
                      }}
                      className="auth-input fibrr-input-sm"
                    />
                    <input
                      type="text"
                      value={lvl.label ?? ''}
                      placeholder="Label"
                      onChange={(e) => setFibLevel(lvl.ratio, { label: e.target.value })}
                      className="auth-input fibrr-input-sm"
                    />
                    <input
                      type="color"
                      value={lvl.color}
                      onChange={(e) => setFibLevel(lvl.ratio, { color: e.target.value })}
                      className="fibrr-color-input-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeLevel(lvl.ratio)}
                      title="Remove level"
                      className="fibrr-del-btn"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {/* Add new */}
                <div className="fibrr-add-row">
                  <input
                    type="number"
                    step={0.1}
                    value={newRatio}
                    onChange={(e) => setNewRatio(e.target.value)}
                    placeholder="Custom ratio (e.g. 1.272)"
                    className="auth-input fibrr-input-sm fibrr-input-flex"
                  />
                  <button
                    type="button"
                    onClick={addLevel}
                    className="fibrr-add-btn"
                  >
                    <Plus size={12} /> Add level
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'coords' && (
            <>
              <Row label="Anchor Low (Entry/SL)">
                <div className="fibrr-coord-val">
                  {fib.anchorLow
                    ? `t=${new Date(fib.anchorLow.time * 1000).toISOString().slice(0, 16)} · ${fib.anchorLow.price}`
                    : 'Click on chart to anchor'}
                </div>
              </Row>
              <Row label="Anchor High (1R/TP1)">
                <div className="fibrr-coord-val">
                  {fib.anchorHigh
                    ? `t=${new Date(fib.anchorHigh.time * 1000).toISOString().slice(0, 16)} · ${fib.anchorHigh.price}`
                    : 'Click on chart to anchor'}
                </div>
              </Row>
              {fib.anchorLow && fib.anchorHigh && (
                <div className="fibrr-anchor-info">
                  <div>Risk distance: <strong>{Math.abs(fib.anchorHigh.price - fib.anchorLow.price).toFixed(6)}</strong></div>
                  <div>1R target: <strong>{((fib.direction === 'long' ? fib.anchorHigh.price : fib.anchorLow.price)).toFixed(6)}</strong></div>
                  <div>Enabled levels: <strong>{fib.levels.filter((l) => l.enabled).length}</strong></div>
                </div>
              )}
            </>
          )}

          {tab === 'visibility' && (
            <p className="fibrr-visibility-text">
              Toggle which timeframes the Fib Retracement should be visible on. (Coming soon — currently visible on all.)
            </p>
          )}
        </div>

        <div className="indmod-footer ind-modal-footer indmod-footer-gap">
          <button type="button" className="indmod-reset-btn" onClick={() => { resetFibLevels(); setFibConfig({ extend: 'right', direction: 'long' }); }}>
            <RotateCcw size={11} className="btn-icon-mr" /> Reset
          </button>
          <button type="button" className="indmod-apply-btn" onClick={onClose}>
            <Save size={11} className="btn-icon-mr" /> OK
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fibrr-row">
      <span className="fibrr-row-label">{label}</span>
      <div className="fibrr-row-right">{children}</div>
    </div>
  );
}

export function computeFibPrices(anchorLow: number, anchorHigh: number, levels: FibLevel[], direction: 'long' | 'short') {
  const range = anchorHigh - anchorLow;
  return levels
    .filter((l) => l.enabled)
    .map((l) => ({
      ...l,
      price: direction === 'long'
        ? anchorLow + l.ratio * range
        : anchorHigh - l.ratio * range,
    }));
}
