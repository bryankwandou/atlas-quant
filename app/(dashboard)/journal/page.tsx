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
  };

  const trades = data?.trades || [];
  const closed = trades.filter((t: any) => t.status === 'CLOSED');
  const wins   = closed.filter((t: any) => (t.pnl || 0) > 0).length;
  const totalPnl = closed.reduce((s: number, t: any) => s + (t.pnl || 0), 0);
  const winRate = closed.length > 0 ? (wins / closed.length * 100).toFixed(1) : '0';

  const stats = [
    { label: t('journal.total_trades'), value: closed.length, cls: '' },
    { label: t('journal.win_rate'),     value: `${winRate}%`, cls: '' },
    { label: t('journal.total_pnl'),    value: `$${totalPnl.toFixed(2)}`, cls: totalPnl >= 0 ? 'up' : 'down' },
  ];

  return (
    <div className="page-wrap-lg">
      <h1 className="page-title">{t('nav.journal')}</h1>

      {/* Stats */}
      {closed.length > 0 && (
        <div className="stats-grid-3 card-mb-lg">
          {stats.map(stat => (
            <div key={stat.label} className="card stat-card">
              <div className="stat-label-med">{stat.label}</div>
              <div className={`stat-value-lg mono ${stat.cls}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card card-mb-lg">
        <div className="card-title">New Trade</div>
        <div className="form-grid-3">
          {[
            { label: 'Symbol',      key: 'symbol',     type: 'text' },
            { label: 'Direction',   key: 'direction',  type: 'select', options: ['LONG', 'SHORT'] },
            { label: 'Entry Price', key: 'entryPrice', type: 'number' },
            { label: 'Quantity',    key: 'quantity',   type: 'number' },
            { label: 'TP Price',    key: 'tpPrice',    type: 'number' },
            { label: 'SL Price',    key: 'slPrice',    type: 'number' },
          ].map(({ label, key, type, options }) => (
            <div key={key}>
              <label className="form-label">{label}</label>
              {type === 'select' ? (
                <select
                  value={(form as any)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="form-input"
                >
                  {(options || []).map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="form-input"
                />
              )}
            </div>
          ))}
        </div>
        <div className="form-row-mt">
          <label className="form-label">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="form-textarea"
          />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary btn-primary-mt">
          {submitting ? 'Saving...' : 'Add Trade'}
        </button>
      </form>

      {/* Trade Table */}
      <div className="card card-overflow">
        <table className="page-table">
          <thead>
            <tr className="page-table-tr">
              {['Symbol', 'Dir', 'Status', 'Entry', 'Exit', 'PnL', 'Notes', 'Date'].map(h => (
                <th key={h} className="page-table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="page-table-td loading-msg">{t('common.loading')}</td></tr>
            ) : trades.length === 0 ? (
              <tr><td colSpan={8} className="page-table-td loading-msg">No trades yet.</td></tr>
            ) : trades.map((trade: any) => (
              <tr key={trade.id} className="page-table-tr">
                <td className="page-table-td td-sym">{trade.symbol}</td>
                <td className={`page-table-td ${trade.direction === 'LONG' ? 'td-dir-buy' : 'td-dir-sell'}`}>{trade.direction}</td>
                <td className="page-table-td"><span className="td-badge">{trade.status}</span></td>
                <td className="page-table-td td-mono">{trade.entry_price}</td>
                <td className="page-table-td td-mono">{trade.exit_price || '—'}</td>
                <td className={`page-table-td td-mono ${(trade.pnl || 0) >= 0 ? 'up' : 'down'}`}>
                  {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '—'}
                </td>
                <td className="page-table-td td-muted td-noflow">{trade.notes || '—'}</td>
                <td className="page-table-td td-muted td-nowrap">
                  {trade.entry_at ? new Date(trade.entry_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
