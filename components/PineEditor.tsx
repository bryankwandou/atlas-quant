'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useChartStore } from '@/store/chartStore';
import { useMarketData } from '@/hooks/useMarketData';
import { runPine, PINE_EXAMPLE } from '@/lib/pineLite';

interface Props { open: boolean; onClose: () => void; }

/**
 * Pine-lite editor — write a script, validate it live against the current
 * symbol's candles, save it, and toggle it on/off as a chart overlay.
 * The interpreter (lib/pineLite) supports a common subset of Pine v5.
 */
export default function PineEditor({ open, onClose }: Props) {
  const { symbol, timeframe, pineScripts, addPineScript, updatePineScript, removePineScript, togglePineScript } = useChartStore();
  const { candles } = useMarketData(symbol, timeframe);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('My Script');
  const [code, setCode] = useState(PINE_EXAMPLE);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // Live-validate on each code change against the current candles.
  useEffect(() => {
    if (!open) return;
    const rows = (candles || []).map((c: any) => ({
      open: +c.open, high: +c.high, low: +c.low, close: +c.close, volume: +c.volume,
    })).filter((c: any) => c.close > 0);
    if (rows.length < 5) { setStatus(null); return; }
    const res = runPine(code, {
      open: rows.map(r => r.open), high: rows.map(r => r.high), low: rows.map(r => r.low),
      close: rows.map(r => r.close), volume: rows.map(r => r.volume),
    });
    if (res.error) setStatus({ ok: false, msg: res.error });
    else setStatus({ ok: true, msg: `OK — ${res.plots.length} plot${res.plots.length === 1 ? '' : 's'}` });
  }, [code, candles, open]);

  if (!open) return null;

  const loadScript = (id: string) => {
    const s = pineScripts.find(p => p.id === id); if (!s) return;
    setEditId(s.id); setName(s.name); setCode(s.code);
  };
  const newScript = () => { setEditId(null); setName('My Script'); setCode(PINE_EXAMPLE); };

  const save = (enable: boolean) => {
    if (editId) {
      updatePineScript(editId, { name, code, ...(enable ? { enabled: true } : {}) });
    } else {
      const id = `pine_${Date.now()}`;
      addPineScript({ id, name, code, enabled: enable });
      setEditId(id);
    }
  };

  return (
    <div className="pine-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pine-modal">
        <div className="pine-head">
          <h3>Pine-lite Editor</h3>
          <span style={{ fontSize: 10, color: 'var(--aq-text2)' }}>{symbol} · {timeframe}</span>
          <button type="button" className="pine-x" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="pine-body">
          <div className="pine-left">
            <input className="pine-name" value={name} onChange={e => setName(e.target.value)} placeholder="Script name" />
            <textarea
              className="pine-code" value={code} spellCheck={false}
              onChange={e => setCode(e.target.value)}
              placeholder="plot(ema(close, 21), &quot;EMA&quot;, color=color.aqua)"
            />
            {status && (status.ok
              ? <div className="pine-ok">✓ {status.msg}</div>
              : <div className="pine-err">✕ {status.msg}</div>)}
          </div>
          <div className="pine-right">
            <div className="pine-right-h">SAVED SCRIPTS</div>
            <div className="pine-saved">
              {pineScripts.length === 0 && <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--aq-text2)' }}>No scripts yet</div>}
              {pineScripts.map(s => (
                <div key={s.id} className="pine-saved-item">
                  <span className="nm" onClick={() => loadScript(s.id)} title="Edit">{s.name}</span>
                  <button type="button" className={`pine-toggle ${s.enabled ? 'on' : 'off'}`} onClick={() => togglePineScript(s.id)}>
                    {s.enabled ? 'ON' : 'OFF'}
                  </button>
                  <button type="button" className="pine-x" onClick={() => { removePineScript(s.id); if (editId === s.id) newScript(); }}><X size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="pine-foot">
          <button type="button" className="pine-btn" onClick={newScript}>+ New</button>
          <button type="button" className="pine-btn" onClick={() => save(false)} disabled={!status?.ok}>Save</button>
          <button type="button" className="pine-btn primary" onClick={() => { save(true); onClose(); }} disabled={!status?.ok}>Save &amp; Apply</button>
          <button type="button" className="pine-btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
