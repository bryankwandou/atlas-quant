/**
 * Atlas Quant · TradingView-style smart symbol search
 *
 * Scoring layers (higher = better):
 *  1000  exact symbol match
 *   800  exact name match (case-insensitive)
 *   600  symbol prefix match
 *   500  name word starts-with match
 *   350  symbol contains
 *   300  name contains
 *   200  alias / category keyword hit
 *   100  fuzzy edit-distance proximity
 *  -200  asset class mismatch when filter active
 *
 * Plus weighting bonuses for liquid majors (BTC/ETH/SPY/AAPL...).
 */

import { SYMBOL_CATALOG, type SymbolMeta, type AssetClass } from '@/src/data/symbolCatalog';

export interface SearchOpts {
  /** Maximum results to return. Default 25. */
  limit?: number;
  /** Optional asset-class filter — null/undefined keeps all. */
  assetClass?: AssetClass | 'all';
  /** Optional category filter. */
  category?: string;
  /** Optional list of explicit symbols to surface first (recent / favorites). */
  pinned?: string[];
}

export interface SearchHit extends SymbolMeta {
  score: number;
  highlight: string;
}

// Liquid majors that should rank up across queries
const PRIORITY_SYMBOLS = new Set([
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','LINKUSDT','AVAXUSDT',
  'SPY','QQQ','DIA','IWM','VOO','VTI','AAPL','MSFT','GOOGL','AMZN','NVDA','TSLA','META','NFLX',
  '^GSPC','^IXIC','^DJI','^VIX','^TNX','DX-Y.NYB','^N225','^HSI','^FTSE','^GDAXI',
  'GC=F','SI=F','CL=F','NG=F','EURUSD','GBPUSD','USDJPY',
  'BBCA.JK','BBRI.JK','TLKM.JK',
]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Levenshtein distance, capped early-exit
function editDistance(a: string, b: string, max = 4): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j - 1], dp[j]);
      prev = tmp;
      if (dp[j] < rowMin) rowMin = dp[j];
    }
    if (rowMin > max) return max + 1; // pruning
  }
  return dp[n];
}

function highlight(text: string, q: string): string {
  if (!q) return text;
  const re = new RegExp(`(${escapeRegExp(q)})`, 'i');
  return text.replace(re, '<mark>$1</mark>');
}

function scoreOne(meta: SymbolMeta, qOriginal: string): number {
  if (!qOriginal) return 0;
  const q = qOriginal.toUpperCase().trim();
  if (!q) return 0;

  const sym = meta.symbol.toUpperCase();
  const name = meta.name.toUpperCase();
  const cat = (meta.category || '').toUpperCase();
  const exch = meta.exchange.toUpperCase();

  let score = 0;

  // 1) Exact symbol match
  if (sym === q) score += 1000;
  // 2) Exact name match
  if (name === q) score += 800;
  // 3) Symbol prefix
  if (sym.startsWith(q)) score += 600;
  // 4) Name word starts-with (e.g. "Bitcoin" matches "BIT")
  if (name.split(/\W+/).some((w) => w && w.startsWith(q))) score += 500;
  // 5) Symbol contains
  if (sym.includes(q) && score < 600) score += 350;
  // 6) Name contains
  if (name.includes(q) && score < 500) score += 300;
  // 7) Category / exchange contains
  if (cat.includes(q) || exch.includes(q)) score += 200;
  // 8) Fuzzy on symbol or name word
  const fuzz = editDistance(q, sym, 3);
  if (fuzz <= 2) score += 100 - fuzz * 20;
  const fuzzName = editDistance(q, name.slice(0, q.length + 4), 3);
  if (fuzzName <= 2) score += 80 - fuzzName * 20;

  // 9) Priority symbol bonus
  if (PRIORITY_SYMBOLS.has(sym)) score += 75;

  // 10) USDT pairs ranked higher than cross pairs for crypto base queries
  if (meta.assetClass === 'crypto' && sym.endsWith('USDT')) score += 10;

  return score;
}

export function searchSymbols(query: string, opts: SearchOpts = {}): SearchHit[] {
  const limit = opts.limit ?? 25;
  const q = (query || '').trim();
  let pool: SymbolMeta[] = SYMBOL_CATALOG;

  if (opts.assetClass && opts.assetClass !== 'all') {
    pool = pool.filter((s) => s.assetClass === opts.assetClass);
  }
  if (opts.category) {
    const cQ = opts.category.toUpperCase();
    pool = pool.filter((s) => (s.category || '').toUpperCase() === cQ);
  }

  // Empty query → priorities + first N from pool
  if (!q) {
    const seen = new Set<string>();
    const out: SearchHit[] = [];
    for (const p of opts.pinned ?? []) {
      const m = pool.find((s) => s.symbol.toUpperCase() === p.toUpperCase());
      if (m && !seen.has(m.symbol)) {
        out.push({ ...m, score: 9999, highlight: m.name });
        seen.add(m.symbol);
      }
    }
    for (const s of pool) {
      if (seen.has(s.symbol)) continue;
      if (PRIORITY_SYMBOLS.has(s.symbol.toUpperCase()) || out.length < limit) {
        out.push({ ...s, score: PRIORITY_SYMBOLS.has(s.symbol.toUpperCase()) ? 100 : 50, highlight: s.name });
        seen.add(s.symbol);
        if (out.length >= limit) break;
      }
    }
    return out.slice(0, limit);
  }

  const hits: SearchHit[] = [];
  for (const meta of pool) {
    const s = scoreOne(meta, q);
    if (s > 0) {
      hits.push({
        ...meta,
        score: s,
        highlight: highlight(meta.name, q),
      });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/** Group hits by asset class for TradingView-style tabs. */
export function groupHitsByAssetClass(hits: SearchHit[]): Record<string, SearchHit[]> {
  const groups: Record<string, SearchHit[]> = {};
  for (const h of hits) {
    const key = h.assetClass;
    (groups[key] ||= []).push(h);
  }
  return groups;
}
