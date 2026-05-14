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

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{t('nav.journal')}</h1>

      {/* Stats */}
      {closed.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: t('journal.total_trades'), value: closed.length },
            { label: t('journal.win_rate'), value: `${winRate}%` },
            { label: t('journal.total_pnl'), value: `$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? 'var(--buy)' : 'var(--sell)' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4, color: stat.color || 'var(--text-primary)', fontFamily: 'monospace' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>New Trade</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Symbol', key: 'symbol', type: 'text' },
            { label: 'Direction', key: 'direction', type: 'select', options: ['LONG', 'SHORT'] },
            { label: 'Entry Price', key: 'entryPrice', type: 'number' },
            { label: 'Quantity', key: 'quantity', type: 'number' },
            { label: 'TP Price', key: 'tpPrice', type: 'number' },
            { label: 'SL Price', key: 'slPrice', type: 'number' },
          ].map(({ label, key, type, options }) => (
            <div key={key}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{label}</label>
              {type === 'select' ? (
                <select
                  value={(form as any)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12 }}
                >
                  {(options || []).map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12 }}
                />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2}
            style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12, resize: 'vertical' }}
          />
        </div>
        <button type="submit" disabled={submitting} style={{ marginTop: 8, padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          {submitting ? 'Saving...' : 'Add Trade'}
        </button>
      </form>

      {/* Trade Table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Symbol', 'Dir', 'Status', 'Entry', 'Exit', 'PnL', 'Notes', 'Date'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: 12, color: 'var(--text-muted)' }}>{t('common.loading')}</td></tr>
            ) : trades.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 12, color: 'var(--text-muted)' }}>No trades yet.</td></tr>
            ) : trades.map((trade: any) => (
              <tr key={trade.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 8px', fontWeight: 500 }}>{trade.symbol}</td>
                <td style={{ padding: '6px 8px', color: trade.direction === 'LONG' ? 'var(--buy)' : 'var(--sell)', fontWeight: 600 }}>{trade.direction}</td>
                <td style={{ padding: '6px 8px' }}><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--bg-tertiary)' }}>{trade.status}</span></td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{trade.entry_price}</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{trade.exit_price || '—'}</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: (trade.pnl || 0) >= 0 ? 'var(--buy)' : 'var(--sell)' }}>
                  {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trade.notes || '—'}</td>
                <td style={{ padding: '6px 8px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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
