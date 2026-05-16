'use client';
import { useState } from 'react';
import { X, RotateCcw, Save, Plus, Trash2 } from 'lucide-react';
import { useChartStore, DEFAULT_FIB_RR_LEVELS, type FibLevel } from '@/store/chartStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Custom Fibonacci Risk-Reward Modal — mirrors TradingView's Fib Retracement
 * configuration UI. Anchors are set by clicking on the chart with the Fib
 * tool active; this modal handles level / color / extend / direction setup.
 */
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
      <div className="indicator-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="indmod-header">
          <div className="indmod-title">
            <span>Fib Retracement · Risk-Reward</span>
          </div>
          <button type="button" className="indmod-close" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2a2e39', padding: '0 16px' }}>
          {(['style', 'coords', 'visibility'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                color: tab === t ? '#fff' : '#787b86',
                fontSize: 12,
                fontWeight: 500,
                borderBottom: tab === t ? '2px solid #2962ff' : '2px solid transparent',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t === 'style' ? 'Style' : t === 'coords' ? 'Coordinates' : 'Visibility'}
            </button>
          ))}
        </div>

        <div className="indmod-body" style={{ flexDirection: 'column', padding: 16, gap: 12, maxHeight: 460, overflowY: 'auto' }}>
          {tab === 'style' && (
            <>
              {/* Direction */}
              <Row label="Trade Direction">
                <select
                  className="auth-input"
                  style={{ padding: '8px 10px', fontSize: 12, width: 140 }}
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
                  style={{ width: 32, height: 24, border: '1px solid #2a2e39', borderRadius: 4 }}
                />
                <label style={{ marginLeft: 12, fontSize: 11, color: '#787b86', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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
                  style={{ width: 32, height: 24, border: '1px solid #2a2e39', borderRadius: 4 }}
                />
              </Row>

              {/* Extend */}
              <Row label="Extend">
                <select
                  className="auth-input"
                  style={{ padding: '8px 10px', fontSize: 12, width: 140 }}
                  value={fib.extend}
                  onChange={(e) => setFibConfig({ extend: e.target.value as 'none' | 'right' | 'both' })}
                >
                  <option value="none">Don&apos;t extend</option>
                  <option value="right">Extend right</option>
                  <option value="both">Extend both</option>
                </select>
              </Row>

              <div style={{ borderTop: '1px solid #2a2e39', margin: '10px 0 0' }} />

              {/* Level table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {fib.levels.map((lvl: FibLevel) => (
                  <div key={lvl.ratio} style={{ display: 'grid', gridTemplateColumns: '20px 80px 1fr 32px 28px', alignItems: 'center', gap: 8 }}>
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
                      className="auth-input"
                      style={{ padding: '6px 8px', fontSize: 12 }}
                    />
                    <input
                      type="text"
                      value={lvl.label ?? ''}
                      placeholder="Label"
                      onChange={(e) => setFibLevel(lvl.ratio, { label: e.target.value })}
                      className="auth-input"
                      style={{ padding: '6px 8px', fontSize: 12 }}
                    />
                    <input
                      type="color"
                      value={lvl.color}
                      onChange={(e) => setFibLevel(lvl.ratio, { color: e.target.value })}
                      style={{ width: 32, height: 26, border: '1px solid #2a2e39', borderRadius: 4 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeLevel(lvl.ratio)}
                      title="Remove level"
                      style={{ background: 'transparent', border: '1px solid #2a2e39', borderRadius: 4, padding: 4, cursor: 'pointer', color: '#f23645' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {/* Add new */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    type="number"
                    step={0.1}
                    value={newRatio}
                    onChange={(e) => setNewRatio(e.target.value)}
                    placeholder="Custom ratio (e.g. 1.272)"
                    className="auth-input"
                    style={{ padding: '8px 10px', fontSize: 12, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={addLevel}
                    style={{ padding: '8px 12px', background: '#2962ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
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
                <div style={{ fontSize: 12, color: '#fff' }}>
                  {fib.anchorLow
                    ? `t=${new Date(fib.anchorLow.time * 1000).toISOString().slice(0, 16)} · ${fib.anchorLow.price}`
                    : 'Click on chart to anchor'}
                </div>
              </Row>
              <Row label="Anchor High (1R/TP1)">
                <div style={{ fontSize: 12, color: '#fff' }}>
                  {fib.anchorHigh
                    ? `t=${new Date(fib.anchorHigh.time * 1000).toISOString().slice(0, 16)} · ${fib.anchorHigh.price}`
                    : 'Click on chart to anchor'}
                </div>
              </Row>
              {fib.anchorLow && fib.anchorHigh && (
                <div style={{ marginTop: 12, padding: 10, border: '1px solid #2a2e39', borderRadius: 6, background: '#0d1117', fontSize: 11, color: '#b6bcc8' }}>
                  <div>Risk distance: <strong>{Math.abs(fib.anchorHigh.price - fib.anchorLow.price).toFixed(6)}</strong></div>
                  <div>1R target: <strong>{((fib.direction === 'long' ? fib.anchorHigh.price : fib.anchorLow.price)).toFixed(6)}</strong></div>
                  <div>Enabled levels: <strong>{fib.levels.filter((l) => l.enabled).length}</strong></div>
                </div>
              )}
            </>
          )}

          {tab === 'visibility' && (
            <div style={{ fontSize: 12, color: '#b6bcc8' }}>
              <p>Toggle which timeframes the Fib Retracement should be visible on. (Coming soon — currently visible on all.)</p>
            </div>
          )}
        </div>

        <div className="indmod-footer ind-modal-footer" style={{ gap: 8 }}>
          <button type="button" className="indmod-reset-btn" onClick={() => { resetFibLevels(); setFibConfig({ extend: 'right', direction: 'long' }); }}>
            <RotateCcw size={11} style={{ marginRight: 4 }} /> Reset
          </button>
          <button type="button" className="indmod-apply-btn" onClick={onClose}>
            <Save size={11} style={{ marginRight: 4 }} /> OK
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 11, color: '#787b86', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{children}</div>
    </div>
  );
}

/**
 * Resolve current chart price → list of FibLevel pricing using the stored anchors.
 * Useful for the chart overlay renderer.
 */
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
