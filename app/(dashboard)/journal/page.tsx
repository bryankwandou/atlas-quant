'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { useUserStore } from '@/store/userStore';
import { useLanguage } from '@/hooks/useLanguage';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function JournalPage() {
  const { pubkey } = useUserStore();
  const { t } = useLanguage();
  const [form, setForm] = useState({ symbol: 'BTCUSDT', direction: 'LONG', entryPrice: '', quantity: '', tpPrice: '', slPrice: '', notes: '' });
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
      body: JSON.stringify({ userPubkey: pubkey, ...form, entryPrice: parseFloat(form.entryPrice), quantity: parseFloat(form.quantity) }),
    });
    setSubmitting(false);
    mutate();
    setForm({ symbol: 'BTCUSDT', direction: 'LONG', entryPrice: '', quantity: '', tpPrice: '', slPrice: '', notes: '' });
    setShowForm(false);
  };

  const trades = data?.trades || [];
  const closed = trades.filter((tr: any) => tr.status === 'CLOSED');
  const wins   = closed.filter((tr: any) => (tr.pnl || 0) > 0).length;
  const totalPnl = closed.reduce((s: number, tr: any) => s + (tr.pnl || 0), 0);
  const winRate = closed.length > 0 ? (wins / closed.length * 100).toFixed(1) : '0';

  const stats = [
    { label: 'TOTAL TRADES', value: String(trades.length),              cls: '' },
    { label: 'CLOSED',       value: String(closed.length),              cls: '' },
    { label: 'WIN RATE',     value: `${winRate}%`,                      cls: '' },
    { label: 'TOTAL PNL',    value: `$${totalPnl.toFixed(2)}`,          cls: totalPnl >= 0 ? 'up' : 'down' },
    { label: 'OPEN',         value: String(trades.length - closed.length), cls: '' },
  ];

  const FIELDS: Array<{ label: string; key: string; type: string; options?: string[] }> = [
    { label: 'SYMBOL',      key: 'symbol',     type: 'text' },
    { label: 'DIRECTION',   key: 'direction',  type: 'select', options: ['LONG', 'SHORT'] },
    { label: 'ENTRY PRICE', key: 'entryPrice', type: 'number' },
    { label: 'QUANTITY',    key: 'quantity',   type: 'number' },
    { label: 'TP PRICE',    key: 'tpPrice',    type: 'number' },
    { label: 'SL PRICE',    key: 'slPrice',    type: 'number' },
  ];

  return (
    <div className="panel-view">
      <div className="panel-header">
        <div className="panel-title">
          <span>📒</span>
          <span>{t('nav.journal')}</span>
        </div>
        <button type="button" className="panel-action-btn primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancel' : '+ Add Trade'}
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
                    <select
                      id={`j-${key}`}
                      value={(form as any)[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="bt-config-input"
                    >
                      {(options || []).map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      id={`j-${key}`}
                      type={type}
                      value={(form as any)[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="bt-config-input"
                    />
                  )}
                </div>
              ))}
              <div className="bt-config-item col-span-3">
                <label className="bt-config-label" htmlFor="j-notes">NOTES</label>
                <textarea
                  id="j-notes"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="bt-config-input"
                />
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
                {['Symbol', 'Dir', 'Status', 'Entry', 'Exit', 'PnL', 'Notes', 'Date'].map(h => (
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
                <tr key={trade.id}>
                  <td className="mono">{trade.symbol}</td>
                  <td><span className={`dir-badge ${trade.direction === 'LONG' ? 'up' : 'down'}`}>{trade.direction}</span></td>
                  <td><span className={`status-badge-tv ${trade.status === 'CLOSED' ? 'closed' : 'open'}`}>{trade.status}</span></td>
                  <td className="mono">{trade.entry_price}</td>
                  <td className="mono">{trade.exit_price || '—'}</td>
                  <td className={`mono ${(trade.pnl || 0) >= 0 ? 'up' : 'down'}`}>
                    {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '—'}
                  </td>
                  <td className="text-muted">{trade.notes || '—'}</td>
                  <td className="text-muted mono">
                    {trade.entry_at ? new Date(trade.entry_at).toLocaleDateString() : '—'}
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
