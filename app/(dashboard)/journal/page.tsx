'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { useUserStore } from '@/store/userStore';
import { useLanguage } from '@/hooks/useLanguage';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function JournalPage() {
  const { pubkey } = useUserStore();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    symbol: 'BTCUSDT', direction: 'LONG', entryPrice: '', quantity: '',
    tpPrice: '', slPrice: '', notes: '', strategy: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data, mutate, isLoading } = useSWR(
    pubkey ? `/api/journal?user=${pubkey}` : null,
    fetcher
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubkey) return alert('Please connect wallet first.');
    setSubmitting(true);
    await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPubkey: pubkey, ...form,
        entryPrice: parseFloat(form.entryPrice),
        quantity: parseFloat(form.quantity),
      }),
    });
    setSubmitting(false);
    mutate();
    setForm({ symbol: 'BTCUSDT', direction: 'LONG', entryPrice: '', quantity: '', tpPrice: '', slPrice: '', notes: '', strategy: '' });
    setShowForm(false);
  };

  const trades = data?.trades || [];
  const closed = trades.filter((tr: any) => tr.status === 'CLOSED');
  const wins   = closed.filter((tr: any) => (tr.pnl || 0) > 0);
  const losses = closed.filter((tr: any) => (tr.pnl || 0) < 0);
  const totalPnl = closed.reduce((s: number, tr: any) => s + (tr.pnl || 0), 0);
  const winRate  = closed.length > 0 ? (wins.length / closed.length * 100).toFixed(1) : '0';
  const avgWin   = wins.length   > 0 ? wins.reduce((s: number, tr: any) => s + (tr.pnl || 0), 0) / wins.length : 0;
  const avgLoss  = losses.length > 0 ? Math.abs(losses.reduce((s: number, tr: any) => s + (tr.pnl || 0), 0) / losses.length) : 1;
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length / (avgLoss * (losses.length || 1))).toFixed(2) : '—';
  const expectancy   = closed.length > 0
    ? ((wins.length / closed.length * avgWin) - (losses.length / closed.length * avgLoss)).toFixed(2)
    : '—';

  const stats = [
    { label: t('total_trades') || 'TOTAL TRADES', value: String(trades.length),        cls: '' },
    { label: t('win_rate')     || 'WIN RATE',      value: `${winRate}%`,               cls: '' },
    { label: t('total_pnl')    || 'TOTAL PNL',     value: `$${totalPnl.toFixed(2)}`,   cls: totalPnl >= 0 ? 'up' : 'down' },
    { label: 'Profit Factor',                       value: String(profitFactor),         cls: '' },
    { label: 'Expectancy',                          value: expectancy !== '—' ? `$${expectancy}` : '—', cls: '' },
  ];

  const FIELDS: Array<{ label: string; key: string; type: string; options?: string[] }> = [
    { label: 'SYMBOL',    key: 'symbol',     type: 'text'   },
    { label: 'DIRECTION', key: 'direction',  type: 'select', options: ['LONG', 'SHORT'] },
    { label: 'STRATEGY',  key: 'strategy',   type: 'text'   },
    { label: 'ENTRY',     key: 'entryPrice', type: 'number' },
    { label: 'QTY',       key: 'quantity',   type: 'number' },
    { label: 'TP PRICE',  key: 'tpPrice',    type: 'number' },
    { label: 'SL PRICE',  key: 'slPrice',    type: 'number' },
  ];

  return (
    <div className="panel-view journal-panel">
      <div className="panel-header">
        <div className="panel-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>{t('nav.journal')}</span>
        </div>
        <button type="button" className="panel-action-btn primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancel' : '+ New Trade'}
        </button>
      </div>

      <div className="panel-content">
        <div className="journal-stats">
          {stats.map(stat => (
            <div key={stat.label} className="journal-stat-card">
              <div className={`journal-stat-val mono${stat.cls ? ` ${stat.cls}` : ''}`}>{stat.value}</div>
              <div className="journal-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="journal-form">
            <div className="bt-config-grid">
              {FIELDS.map(({ label, key, type, options }) => (
                <div key={key} className="bt-config-item">
                  <label className="bt-config-label" htmlFor={`j-${key}`}>{label}</label>
                  {type === 'select' ? (
                    <select id={`j-${key}`} value={(form as any)[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="bt-config-input">
                      {(options || []).map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input id={`j-${key}`} type={type} value={(form as any)[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="bt-config-input" />
                  )}
                </div>
              ))}
              <div className="bt-config-item col-span-3">
                <label className="bt-config-label" htmlFor="j-notes">NOTES</label>
                <textarea id="j-notes" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="bt-config-input" />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="bt-run-btn">
              {submitting ? 'Saving...' : 'Add Trade'}
            </button>
          </form>
        )}

        <div className="journal-table-wrap">
          <table className="journal-table">
            <thead>
              <tr>
                {['Symbol', 'Dir', 'Entry', 'Exit', 'PnL', 'Strategy', 'Date', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-muted">{t('common.loading')}</td></tr>
              ) : trades.length === 0 ? (
                <tr><td colSpan={8} className="text-muted">No trades yet.</td></tr>
              ) : trades.map((trade: any) => (
                <tr key={trade.id} className={trade.status === 'OPEN' ? 'row-open' : ''}>
                  <td className="mono fw">{trade.symbol}</td>
                  <td><span className={`dir-badge ${trade.direction === 'LONG' ? 'up' : 'down'}`}>{trade.direction}</span></td>
                  <td className="mono">{trade.entry_price}</td>
                  <td className="mono">{trade.exit_price || '—'}</td>
                  <td className={`mono ${(trade.pnl || 0) >= 0 ? 'up' : 'down'}`}>
                    {trade.pnl != null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : 'OPEN'}
                  </td>
                  <td><span className="strat-tag">{trade.strategy || '—'}</span></td>
                  <td className="text-muted mono">
                    {trade.entry_at ? new Date(trade.entry_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <span className={`status-badge ${trade.status === 'CLOSED' ? 'closed' : 'open'}`}>
                      {trade.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
