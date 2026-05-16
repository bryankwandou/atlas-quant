/**
 * Smart Search — keyword + fuzzy + scoring engine mirip TradingView.
 *
 * Strategi scoring (compound):
 *   - Exact symbol match  → +1000
 *   - Symbol prefix match → +500 + (1 / position)
 *   - Symbol substring     → +200
 *   - Alias exact          → +400
 *   - Name word boundary   → +300
 *   - Name substring       → +100
 *   - Tag match            → +60
 *   - Sector/industry      → +40
 *   - Fuse fuzzy           → +score * 50
 *   - Bonus volume liquid  → +log10(volume24h)
 *   - Bonus asset class boost (user-selected) → +120
 *
 * Hasil di-sort desc by score, lalu cap N hasil. Mendukung filter:
 *   - assetClass[]
 *   - exchanges[]
 *   - tags[]
 *   - country[]
 *   - quote (USDT, USD, IDR, etc.)
 */
import Fuse from 'fuse.js';
import type { Asset, AssetSearchResult } from '@/domain/asset';
import type { IndicatorDef } from '@/domain/indicator';

export interface SearchOptions {
  query: string;
  limit?: number;
  assetClasses?: string[];
  exchanges?: string[];
  tags?: string[];
  country?: string[];
  quote?: string;
  boostClass?: string;
}

export class AssetSearchEngine {
  private fuse: Fuse<Asset>;
  private allAssets: Asset[];

  constructor(assets: Asset[]) {
    this.allAssets = assets;
    this.fuse = new Fuse(assets, {
      keys: [
        { name: 'symbol', weight: 0.5 },
        { name: 'name', weight: 0.3 },
        { name: 'aliases', weight: 0.15 },
        { name: 'tags', weight: 0.05 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 1,
    });
  }

  search(opts: SearchOptions): AssetSearchResult[] {
    const q = opts.query.trim().toLowerCase();
    if (!q) return this.topByVolume(opts.limit ?? 20, opts);

    const scored = new Map<string, AssetSearchResult>();

    for (const asset of this.allAssets) {
      if (!this.passesFilter(asset, opts)) continue;
      let score = 0;
      const matches: string[] = [];

      const sym = asset.symbol.toLowerCase();
      const name = asset.name.toLowerCase();
      const aliases = (asset.aliases || []).map((a) => a.toLowerCase());
      const tags = (asset.tags || []).map((t) => t.toLowerCase());

      if (sym === q) { score += 1000; matches.push('symbol:exact'); }
      else if (sym.startsWith(q)) { score += 500 + (q.length / sym.length) * 100; matches.push('symbol:prefix'); }
      else if (sym.includes(q)) { score += 200; matches.push('symbol:substring'); }

      if (aliases.includes(q)) { score += 400; matches.push('alias:exact'); }
      else if (aliases.some((a) => a.startsWith(q))) { score += 250; matches.push('alias:prefix'); }
      else if (aliases.some((a) => a.includes(q))) { score += 80; matches.push('alias:substring'); }

      if (name === q) { score += 600; matches.push('name:exact'); }
      else if (name.startsWith(q)) { score += 350; matches.push('name:prefix'); }
      else if (new RegExp(`\\b${escape(q)}\\b`).test(name)) { score += 220; matches.push('name:word'); }
      else if (name.includes(q)) { score += 100; matches.push('name:substring'); }

      if (tags.some((t) => t === q)) { score += 60; matches.push('tag:exact'); }
      else if (tags.some((t) => t.startsWith(q))) { score += 30; matches.push('tag:prefix'); }

      if (asset.sector?.toLowerCase().includes(q)) { score += 40; matches.push('sector'); }
      if (asset.industry?.toLowerCase().includes(q)) { score += 30; matches.push('industry'); }
      if (asset.country?.toLowerCase() === q) { score += 50; matches.push('country'); }

      if (opts.boostClass && asset.assetClass === opts.boostClass) score += 120;

      if (score > 0) {
        if (asset.volume24h && asset.volume24h > 0) score += Math.log10(asset.volume24h);
        scored.set(asset.symbol + '|' + asset.exchange, { ...asset, score, matches });
      }
    }

    // Fuzzy pass (handles typos)
    const fuzzy = this.fuse.search(q, { limit: 50 });
    for (const r of fuzzy) {
      if (!this.passesFilter(r.item, opts)) continue;
      const key = r.item.symbol + '|' + r.item.exchange;
      const fuzzyScore = (1 - (r.score ?? 1)) * 80;
      if (scored.has(key)) {
        scored.get(key)!.score += fuzzyScore;
        scored.get(key)!.matches.push('fuzzy');
      } else if (fuzzyScore > 25) {
        scored.set(key, { ...r.item, score: fuzzyScore, matches: ['fuzzy'] });
      }
    }

    return Array.from(scored.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.limit ?? 20);
  }

  topByVolume(n: number, opts: SearchOptions): AssetSearchResult[] {
    return [...this.allAssets]
      .filter((a) => this.passesFilter(a, opts))
      .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
      .slice(0, n)
      .map((a) => ({ ...a, score: a.volume24h || 0, matches: ['top'] }));
  }

  private passesFilter(a: Asset, opts: SearchOptions): boolean {
    if (opts.assetClasses?.length && !opts.assetClasses.includes(a.assetClass)) return false;
    if (opts.exchanges?.length && !opts.exchanges.includes(a.exchange)) return false;
    if (opts.country?.length && a.country && !opts.country.includes(a.country)) return false;
    if (opts.quote && a.quote && a.quote.toLowerCase() !== opts.quote.toLowerCase()) return false;
    if (opts.tags?.length && a.tags && !opts.tags.some((t) => a.tags!.includes(t))) return false;
    return true;
  }
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class IndicatorSearchEngine {
  private fuse: Fuse<IndicatorDef>;
  private all: IndicatorDef[];
  constructor(defs: IndicatorDef[]) {
    this.all = defs;
    this.fuse = new Fuse(defs, {
      keys: [
        { name: 'code', weight: 0.4 },
        { name: 'name', weight: 0.3 },
        { name: 'nameId', weight: 0.1 },
        { name: 'description', weight: 0.05 },
        { name: 'tags', weight: 0.1 },
        { name: 'category', weight: 0.05 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      includeScore: true,
    });
  }
  search(q: string, limit = 30, category?: string): IndicatorDef[] {
    const queryNorm = q.trim().toLowerCase();
    if (!queryNorm) {
      return (category ? this.all.filter((d) => d.category === category) : this.all).slice(0, limit);
    }
    const fz = this.fuse.search(queryNorm, { limit: limit * 2 });
    let res = fz.map((r) => r.item);
    if (category) res = res.filter((d) => d.category === category);
    return res.slice(0, limit);
  }
}
