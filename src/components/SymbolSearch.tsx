'use client';
/**
 * SymbolSearch — TradingView-style spotlight palette dengan smart fuzzy search,
 * kategori chips (All / Crypto / Stock / Forex / DEX / Index / Commodity / ETF),
 * keyboard navigasi (↑↓ + Enter).
 *
 * Fetch dari /api/market/symbols dengan debounce 150ms.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Asset } from '@/domain/asset';

const CATEGORIES = [
  { key: '', label: 'Semua' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'dex', label: 'DEX' },
  { key: 'stock', label: 'Saham' },
  { key: 'etf', label: 'ETF' },
  { key: 'forex', label: 'Forex' },
  { key: 'index', label: 'Indeks' },
  { key: 'commodity', label: 'Komoditas' },
  { key: 'bond', label: 'Bonds' },
];

export interface SymbolSearchProps {
  initialSymbol?: string;
  onSelect: (a: Asset) => void;
  onClose?: () => void;
}

export default function SymbolSearch({ initialSymbol, onSelect, onClose }: SymbolSearchProps) {
  const [q, setQ] = useState('');
  const [klass, setKlass] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `/api/market/symbols?limit=80&q=${encodeURIComponent(q)}${klass ? `&class=${klass}` : ''}`;
        const r = await fetch(url);
        const d = await r.json();
        setResults(d.results ?? []);
        setTotal(d.total ?? 0);
        setCounts(d.counts ?? {});
      } finally { setLoading(false); }
    }, 150);
    return () => clearTimeout(t);
  }, [q, klass]);

  const groupedResults = useMemo(() => results, [results]);

  function pick(a: Asset) {
    onSelect(a);
    onClose?.();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, groupedResults.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (groupedResults[hi]) pick(groupedResults[hi]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose?.(); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="aq-card w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] mono text-xs">▶</span>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => { setQ(e.target.value); setHi(0); }}
              onKeyDown={onKey}
              placeholder={`Cari simbol… (contoh: ${initialSymbol || 'BTC, AAPL, EURUSD, TLKM.JK'})`}
              className="flex-1 bg-transparent outline-none text-base"
            />
            {loading && <div className="aq-spinner" />}
          </div>
          <div className="flex gap-1 mt-3 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setKlass(c.key)}
                className={`px-2.5 py-1 text-xs rounded-md border ${
                  klass === c.key
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {c.label}
                {c.key && counts[c.key] ? <span className="ml-1 text-[10px] opacity-60">{counts[c.key]}</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!groupedResults.length && !loading && (
            <div className="p-6 text-center text-sm text-[var(--text-muted)]">
              Tidak ada hasil untuk &quot;{q}&quot;. Coba kata kunci lain.
            </div>
          )}
          {groupedResults.map((a, i) => (
            <button
              key={`${a.symbol}-${a.exchange}-${i}`}
              onClick={() => pick(a)}
              onMouseEnter={() => setHi(i)}
              className={`w-full px-4 py-2 flex items-center gap-3 text-left border-b border-[var(--border-subtle)]/40 hover:bg-[var(--bg-hover)] ${i === hi ? 'bg-[var(--bg-hover)]' : ''}`}
            >
              <div className="w-9 h-9 rounded-md bg-[var(--bg-elevated)] grid place-items-center font-bold text-xs text-[var(--text-secondary)]">
                {(a.base ?? a.symbol).slice(0, 3)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm mono">{a.symbol}</span>
                  <span className="aq-pill text-[10px]">{a.assetClass}</span>
                  {a.exchange && <span className="text-[10px] text-[var(--text-muted)] uppercase">{a.exchange}</span>}
                </div>
                <div className="text-xs text-[var(--text-secondary)] truncate">{a.name}</div>
              </div>
              {a.country && <span className="text-xs text-[var(--text-muted)] uppercase mono">{a.country}</span>}
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex justify-between">
          <span>{total.toLocaleString()} aset · ↑↓ navigasi · Enter pilih · Esc tutup</span>
          <span className="mono">Atlas Quant Universe</span>
        </div>
      </div>
    </div>
  );
}
