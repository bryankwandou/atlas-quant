'use client';
/**
 * TradingView-style indicator modal:
 *   - Kategori di kiri (dot color + count)
 *   - List indikator di kanan (search box di atas)
 *   - Klik = toggle, checked = ada di chart
 *   - Footer dengan "Active count + Reset + Apply"
 */
import { useEffect, useMemo, useState } from 'react';

interface IndicatorMeta {
  code: string;
  name: string;
  category: string;
  description?: string;
  tags?: string[];
  inputs?: Array<{ key: string; label?: string; default: unknown; type: string }>;
}

interface IndicatorModalProps {
  open: boolean;
  activeCodes: string[];
  onClose: () => void;
  onChange: (codes: string[]) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  trend: '#2962ff',
  momentum: '#089981',
  volatility: '#ff9800',
  volume: '#26c6da',
  mean_reversion: '#a855f7',
  fibonacci: '#fbbf24',
  smc: '#ec4899',
  ict: '#e91e63',
  composite: '#9c27b0',
  pattern: '#26a69a',
  cycle: '#7e57c2',
  adaptive: '#42a5f5',
  alt_data: '#10b981',
  risk: '#f23645',
};

export default function IndicatorModal({ open, activeCodes, onClose, onChange }: IndicatorModalProps) {
  const [all, setAll] = useState<IndicatorMeta[]>([]);
  const [active, setActive] = useState<string[]>(activeCodes);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');

  useEffect(() => { setActive(activeCodes); }, [activeCodes]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/quant/indicators').then((r) => r.json()).then((d) => {
      setAll((d.indicators || []) as IndicatorMeta[]);
    }).catch(() => setAll([]));
  }, [open]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return all.filter((i) => {
      if (cat !== 'all' && i.category !== cat) return false;
      if (!ql) return true;
      return (
        i.code.toLowerCase().includes(ql) ||
        i.name.toLowerCase().includes(ql) ||
        (i.description || '').toLowerCase().includes(ql) ||
        (i.tags || []).some((t) => t.toLowerCase().includes(ql))
      );
    });
  }, [all, q, cat]);

  const cats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of all) map[i.category] = (map[i.category] || 0) + 1;
    return Object.entries(map).map(([k, v]) => ({ key: k, count: v }));
  }, [all]);

  function toggle(code: string) {
    setActive((cur) => cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]);
  }
  function apply() { onChange(active); onClose(); }
  function reset() { setActive([]); }

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="indicator-modal" onClick={(e) => e.stopPropagation()}>
        <div className="indmod-header">
          <div className="indmod-title">≡ Indicators &amp; Strategies</div>
          <div className="indmod-search-wrap">
            <span style={{ opacity: 0.5 }}>🔍</span>
            <input placeholder="Search indicator by name, code, tag, description…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          <button className="indmod-close" onClick={onClose}>✕</button>
        </div>
        <div className="indmod-body">
          <div className="indmod-cats">
            <button className={`indmod-cat-btn ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
              <span className="indmod-cat-dot" style={{ background: '#94a3b8' }} />
              <span className="indmod-cat-name">All</span>
              <span className="indmod-cat-count">{all.length}</span>
            </button>
            {cats.map(({ key, count }) => (
              <button key={key} className={`indmod-cat-btn ${cat === key ? 'active' : ''}`} onClick={() => setCat(key)}>
                <span className="indmod-cat-dot" style={{ background: CATEGORY_COLORS[key] || '#94a3b8' }} />
                <span className="indmod-cat-name">{key.replace(/_/g, ' ')}</span>
                <span className="indmod-cat-count" style={{ background: CATEGORY_COLORS[key] || '#94a3b8' }}>{count}</span>
              </button>
            ))}
          </div>
          <div className="indmod-items">
            {filtered.length === 0 && <div className="indmod-empty">Tidak ada indikator yang cocok dengan &quot;{q}&quot;.</div>}
            {filtered.map((i) => {
              const isActive = active.includes(i.code);
              const isDefault = ['EMA_9', 'EMA_21', 'VWAP', 'RSI_7', 'ATR', 'T1MO_CORE', 'SMC_RR_FIB'].includes(i.code);
              return (
                <div key={i.code} className={`indmod-item ${isActive ? 'active' : ''}`} onClick={() => toggle(i.code)}>
                  <div className="indmod-item-left">
                    <div className={`indmod-item-check ${isActive ? 'checked' : ''}`}>{isActive ? '✓' : ''}</div>
                    <div>
                      <div className="indmod-item-name">{i.name}</div>
                      <div className="indmod-item-id">{i.code} · {i.category} · {i.inputs?.length || 0} param</div>
                    </div>
                  </div>
                  {isDefault && <span className="indmod-default-badge">default</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="indmod-footer">
          <span className="indmod-active-count">{active.length} aktif · {all.length} total tersedia</span>
          <button className="indmod-reset-btn" onClick={reset}>Reset</button>
          <button className="indmod-apply-btn" onClick={apply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
