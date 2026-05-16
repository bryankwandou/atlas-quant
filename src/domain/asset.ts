/**
 * Atlas Quant — domain types untuk aset & instrumen.
 */
export type AssetClass =
  | 'crypto'
  | 'dex'
  | 'perp'
  | 'futures'
  | 'stock'
  | 'etf'
  | 'forex'
  | 'index'
  | 'commodity'
  | 'bond';

export interface Asset {
  symbol: string;
  base?: string;
  quote?: string;
  assetClass: AssetClass;
  exchange: string;
  name: string;
  description?: string;
  sector?: string;
  industry?: string;
  country?: string;
  currency?: string;
  iconUrl?: string;
  decimals?: number;
  volume24h?: number;
  liquidityUsd?: number;
  marketCapUsd?: number;
  priceUsd?: number;
  isTradable?: boolean;
  isListed?: boolean;
  tags?: string[];
  aliases?: string[];
  metadata?: Record<string, unknown>;
}

export interface AssetSearchResult extends Asset {
  score: number;
  matches: string[];
}

export interface AssetCategoryStat {
  assetClass: AssetClass;
  count: number;
  totalVolumeUsd: number;
  topExchanges: string[];
}
