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
  if (!data?.price) return <span className="screener-price-muted">—</span>;
  const isUp = (data.change24h || 0) >= 0;
  return (
    <span className={`screener-td-mono ${isUp ? 'screener-price-up' : 'screener-price-down'}`}>
      {Number(data.price).toLocaleString('en-US', { maximumFractionDigits: 6 })}
    </span>
  );
}

function ChangeCell({ symbol }: { symbol: string }) {
  const { data } = useSWR(`/api/market/price?symbol=${encodeURIComponent(symbol)}`, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: false,
  });
  if (data?.change24h == null) return <span className="screener-price-muted">—</span>;
  const c = Number(data.change24h);
  return (
    <span className={`screener-td-mono ${c >= 0 ? 'screener-price-up' : 'screener-price-down'}`}>
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
      const res = await fetch(`/api/market/symbols?assetClass=${tab}&limit=100`);
      const data = await res.json();
      if (data.symbols && data.symbols.length > 0) {
        setRows(data.symbols);
        return;
      }
    } catch {}

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
  };

  return (
    <div className="screener-wrap">
      <div className="screener-header">
        <span className="screener-title">Market Screener</span>
        <div className="screener-spacer" />
        <input
          placeholder="Search symbol or name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="screener-search"
          title="Search symbols"
        />
      </div>

      <div className="screener-tabs">
        {ASSET_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`screener-tab-btn${activeTab === tab.id ? ' active' : ''}`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      <div className="screener-table-wrap">
        <table className="page-table">
          <thead className="screener-sticky-head">
            <tr>
              {[
                { h: '#',         right: false },
                { h: 'Symbol',    right: false },
                { h: 'Name',      right: false },
                { h: 'Exchange',  right: false },
                { h: 'Price',     right: true  },
                { h: '24h Change',right: true  },
                { h: 'Volume',    right: true  },
                { h: 'Action',    right: true  },
              ].map(({ h, right }) => (
                <th key={h} className={`screener-th${right ? ' screener-th-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="screener-loading">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="screener-loading">No symbols found</td></tr>
            ) : filtered.map((s, i) => (
              <tr key={s.symbol} className="screener-row">
                <td className="screener-td screener-td-num">{i + 1}</td>
                <td className="screener-td screener-td-sym">{s.symbol}</td>
                <td className="screener-td screener-td-name">{s.name || '—'}</td>
                <td className="screener-td screener-td-exc">{s.exchange || '—'}</td>
                <td className="screener-td screener-td-right">
                  {s.price != null ? (
                    <span className="screener-td-mono">{Number(s.price).toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
                  ) : <PriceCell symbol={s.symbol} />}
                </td>
                <td className="screener-td screener-td-right">
                  {s.change24h != null ? (
                    <span className={`screener-td-mono ${s.change24h >= 0 ? 'screener-price-up' : 'screener-price-down'}`}>
                      {s.change24h >= 0 ? '+' : ''}{Number(s.change24h).toFixed(2)}%
                    </span>
                  ) : <ChangeCell symbol={s.symbol} />}
                </td>
                <td className="screener-td screener-td-vol">
                  {s.volume24h != null && s.volume24h > 0 ? `${(s.volume24h / 1e6).toFixed(1)}M` : '—'}
                </td>
                <td className="screener-td screener-td-right">
                  <button
                    type="button"
                    onClick={() => handleSelect(s.symbol)}
                    className="screener-chart-btn"
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
