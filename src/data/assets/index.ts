/**
 * Master asset registry — agrega seluruh kelas asset.
 * Bisa di-extend dengan fetch runtime (Binance exchangeInfo, DexScreener trending dll)
 * lewat `enrichAssetUniverse()`.
 */
import type { Asset } from '@/domain/asset';
import { CRYPTO_SPOT_ASSETS, CRYPTO_BTC_PAIRS } from './crypto-spot';
import { CRYPTO_DEX_ASSETS } from './crypto-dex';
import { STOCKS_US } from './stocks-us';
import { STOCKS_GLOBAL } from './stocks-global';
import { FOREX, COMMODITIES, INDICES, ETFS, BONDS } from './forex-commodity';

export const STATIC_ASSET_UNIVERSE: Asset[] = [
  ...CRYPTO_SPOT_ASSETS,
  ...CRYPTO_BTC_PAIRS,
  ...CRYPTO_DEX_ASSETS,
  ...STOCKS_US,
  ...STOCKS_GLOBAL,
  ...FOREX,
  ...COMMODITIES,
  ...INDICES,
  ...ETFS,
  ...BONDS,
];

export function countByAssetClass(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of STATIC_ASSET_UNIVERSE) {
    counts[a.assetClass] = (counts[a.assetClass] || 0) + 1;
  }
  counts.total = STATIC_ASSET_UNIVERSE.length;
  return counts;
}

export { CRYPTO_SPOT_ASSETS, CRYPTO_DEX_ASSETS, STOCKS_US, STOCKS_GLOBAL, FOREX, COMMODITIES, INDICES, ETFS, BONDS };
