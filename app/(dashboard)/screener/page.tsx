'use client';
import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { useChartStore } from '@/store/chartStore';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const ASSET_TABS = [
  { id: 'crypto',    label: 'Crypto',      emoji: '₿' },
  { id: 'index',     label: 'Indices',     emoji: '📈' },
  { id: 'stock_us',  label: 'US Stocks',   emoji: '🇺🇸' },
  { id: 'stock_id',  label: 'IDX',         emoji: '🇮🇩' },
  { id: 'stock_cn',  label: 'China',       emoji: '🇨🇳' },
  { id: 'stock_eu',  label: 'Europe',      emoji: '🇪🇺' },
  { id: 'stock_sa',  label: 'Saudi/Arab',  emoji: '🇸🇦' },
  { id: 'commodity', label: 'Commodities', emoji: '🥇' },
  { id: 'forex',     label: 'Forex',       emoji: '💱' },
  { id: 'memecoin',  label: 'Memecoins',   emoji: '🐸' },
  { id: 'dex',       label: 'DEX',         emoji: '🔮' },
];

interface SymbolRow {
  symbol: string;
  name?: string;
  exchange?: string;
  assetClass?: string;
  price?: number;
  change24h?: number;
  volume24h?: number;
}

function PriceCell({ symbol }: { symbol: string }) {
  const { data } = useSWR(`/api/market/price?symbol=${encodeURIComponent(symbol)}`, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: false,
  });
  if (!data?.price) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const isUp = (data.change24h || 0) >= 0;
  return (
    <span style={{ fontFamily: 'monospace', color: isUp ? 'var(--buy)' : 'var(--sell)' }}>
      {Number(data.price).toLocaleString('en-US', { maximumFractionDigits: 6 })}
    </span>
  );
}

function ChangeCell({ symbol }: { symbol: string }) {
  const { data } = useSWR(`/api/market/price?symbol=${encodeURIComponent(symbol)}`, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: false,
  });
  if (data?.change24h == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const c = Number(data.change24h);
  return (
    <span style={{ fontFamily: 'monospace', color: c >= 0 ? 'var(--buy)' : 'var(--sell)' }}>
      {c >= 0 ? '+' : ''}{c.toFixed(2)}%
    </span>
  );
}

export default function ScreenerPage() {
  const { setSymbol } = useChartStore();
  const [activeTab, setActiveTab] = useState('crypto');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<SymbolRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSymbols = useCallback(async (tab: string) => {
    setLoading(true);
    try {
      // Try to get from symbol catalog API first
      const res = await fetch(`/api/market/symbols?assetClass=${tab}&limit=100`);
      const data = await res.json();
      if (data.symbols && data.symbols.length > 0) {
        setRows(data.symbols);
        return;
      }
    } catch {}

    // Fallback: direct Binance for crypto/memecoin
    if (tab === 'crypto' || tab === 'memecoin') {
      try {
        const res2 = await fetch('/api/market/symbols');
        const data2 = await res2.json();
        setRows(data2.symbols || []);
      } catch {
        setRows([]);
      }
    } else {
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSymbols(activeTab);
  }, [activeTab, loadSymbols]);

  const filtered = rows.filter(s =>
    !search || s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (symbol: string) => {
    setSymbol(symbol);
    // Optionally navigate to chart
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--tv-border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tv-text)' }}>Market Screener</span>
        <div style={{ flex: 1 }} />
        <input
          placeholder="Search symbol or name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            height: 28, padding: '0 10px', fontSize: 11, borderRadius: 4,
            border: '1px solid var(--tv-border)', background: 'var(--tv-bg2)',
            color: 'var(--tv-text)', outline: 'none', width: 200,
          }}
        />
      </div>

      {/* Asset class tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--tv-border)', flexShrink: 0, overflowX: 'auto' }}>
        {ASSET_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '7px 14px', fontSize: 11, fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--tv-accent)' : 'var(--tv-text2)',
              borderBottom: activeTab === tab.id ? '2px solid var(--tv-accent)' : '2px solid transparent',
              background: 'none', border: 'none', borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === tab.id ? 'var(--tv-accent)' : 'transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--tv-bg2)', zIndex: 1 }}>
            <tr>
              {['#', 'Symbol', 'Name', 'Exchange', 'Price', '24h Change', 'Volume', 'Action'].map((h, i) => (
                <th key={h} style={{
                  padding: '7px 8px', textAlign: i > 3 ? 'right' : 'left',
                  color: 'var(--tv-text2)', fontWeight: 500, fontSize: 10,
                  borderBottom: '1px solid var(--tv-border)', whiteSpace: 'nowrap',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 24, color: 'var(--tv-text2)', textAlign: 'center' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 24, color: 'var(--tv-text2)', textAlign: 'center' }}>No symbols found</td></tr>
            ) : filtered.map((s, i) => (
              <tr
                key={s.symbol}
                style={{ borderBottom: '1px solid var(--tv-border)', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--tv-bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '5px 8px', color: 'var(--tv-text2)', width: 36 }}>{i + 1}</td>
                <td style={{ padding: '5px 8px', fontWeight: 600, color: 'var(--tv-text)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{s.symbol}</td>
                <td style={{ padding: '5px 8px', color: 'var(--tv-text2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || '—'}</td>
                <td style={{ padding: '5px 8px', color: 'var(--tv-text2)', fontSize: 10 }}>{s.exchange || '—'}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  {s.price != null ? (
                    <span style={{ fontFamily: 'monospace' }}>{Number(s.price).toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
                  ) : <PriceCell symbol={s.symbol} />}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  {s.change24h != null ? (
                    <span style={{ fontFamily: 'monospace', color: s.change24h >= 0 ? 'var(--tv-up)' : 'var(--tv-down)' }}>
                      {s.change24h >= 0 ? '+' : ''}{Number(s.change24h).toFixed(2)}%
                    </span>
                  ) : <ChangeCell symbol={s.symbol} />}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--tv-text2)', fontFamily: 'monospace' }}>
                  {s.volume24h != null && s.volume24h > 0 ? `${(s.volume24h / 1e6).toFixed(1)}M` : '—'}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <button
                    onClick={() => handleSelect(s.symbol)}
                    style={{
                      padding: '2px 10px', fontSize: 10, fontWeight: 600,
                      background: 'var(--tv-accent-transparent)', color: 'var(--tv-accent)',
                      border: '1px solid var(--tv-accent)', borderRadius: 3, cursor: 'pointer',
                    }}
                  >
                    Chart
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
