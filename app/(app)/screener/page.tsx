'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Asset } from '@/domain/asset';

const CLASSES: Array<{ k: string; label: string }> = [
  { k: '', label: 'Semua' },
  { k: 'crypto', label: 'Crypto' },
  { k: 'dex', label: 'DEX' },
  { k: 'stock', label: 'Stocks' },
  { k: 'etf', label: 'ETF' },
  { k: 'forex', label: 'Forex' },
  { k: 'index', label: 'Indices' },
  { k: 'commodity', label: 'Komoditas' },
];

export default function ScreenerPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [klass, setKlass] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const url = `/api/market/symbols?limit=500${klass ? `&class=${klass}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      fetch(url).then((r) => r.json()).then((d) => {
        setItems(d.results ?? []);
        setTotal(d.total ?? 0);
        setCounts(d.counts ?? {});
      }).finally(() => setLoading(false));
    }, 150);
    return () => clearTimeout(t);
  }, [klass, q]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-2xl">Universe Screener</h1>
          <p className="text-xs text-[var(--text-muted)]">{total.toLocaleString()} aset terindeks · {Object.keys(counts).length - 1} kelas</p>
        </div>
        <Link href="/dashboard" className="aq-btn aq-btn-secondary text-xs">← Dashboard</Link>
      </header>

      <div className="aq-card p-4 mb-4 flex gap-3 items-center">
        <input
          className="aq-input flex-1"
          placeholder="Cari simbol, nama, alias…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="aq-input w-48" value={klass} onChange={(e) => setKlass(e.target.value)}>
          {CLASSES.map((c) => <option key={c.k} value={c.k}>{c.label}{counts[c.k] ? ` (${counts[c.k]})` : ''}</option>)}
        </select>
      </div>

      <div className="aq-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-elevated)]">
            <tr className="text-left text-[10px] uppercase text-[var(--text-muted)] tracking-widest">
              <th className="px-3 py-2">Symbol</th>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">Exchange</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2 text-right">Tags</th>
              <th className="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.symbol + a.exchange} className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]/40">
                <td className="px-3 py-2 mono font-semibold">{a.symbol}</td>
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-3 py-2"><span className="aq-pill text-[10px]">{a.assetClass}</span></td>
                <td className="px-3 py-2 text-xs text-[var(--text-muted)] uppercase">{a.exchange}</td>
                <td className="px-3 py-2 text-xs text-[var(--text-muted)] uppercase">{a.country || '-'}</td>
                <td className="px-3 py-2 text-right text-[10px] text-[var(--text-muted)]">{a.tags?.slice(0, 3).join(' · ')}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/dashboard?symbol=${encodeURIComponent(a.symbol)}`} className="aq-btn aq-btn-secondary text-[10px]">Buka</Link>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={7} className="py-12 text-center text-[var(--text-muted)]">{loading ? 'Memuat…' : 'Tidak ada hasil.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
