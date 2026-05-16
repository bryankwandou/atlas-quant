/**
 * DEX / On-chain tokens registry — Solana (Jupiter, Raydium, Orca),
 * Ethereum (Uniswap), Base, Arbitrum, BNB Chain.
 * Symbol prefix DEX: kelas asset 'dex'. Liquidity & volume akan dirresh
 * runtime via DexScreener / GeckoTerminal / Jupiter API.
 */
import type { Asset } from '@/domain/asset';

const dex = (
  symbol: string,
  name: string,
  chain: string,
  pool: string,
  tags: string[] = [],
  addr?: string
): Asset => ({
  symbol,
  base: symbol.replace('DEX_', ''),
  quote: 'USD',
  assetClass: 'dex',
  exchange: pool,
  name,
  currency: 'USD',
  isTradable: true,
  isListed: true,
  tags: ['dex', chain, ...tags],
  aliases: [name, name.toLowerCase()],
  metadata: { chain, pool, contract: addr },
});

export const CRYPTO_DEX_ASSETS: Asset[] = [
  // === SOLANA DEX (Jupiter + Raydium + Orca) ===
  dex('DEX_WIF', 'dogwifhat (Solana)', 'solana', 'raydium', ['memecoin', 'solana'], 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'),
  dex('DEX_BONK', 'Bonk (Solana)', 'solana', 'raydium', ['memecoin', 'solana'], 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'),
  dex('DEX_JUP', 'Jupiter', 'solana', 'jupiter', ['dex-token', 'solana'], 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'),
  dex('DEX_JTO', 'Jito', 'solana', 'raydium', ['lsd', 'solana'], 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL'),
  dex('DEX_PYTH', 'Pyth Network', 'solana', 'raydium', ['oracle', 'solana'], 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3'),
  dex('DEX_RAY', 'Raydium', 'solana', 'raydium', ['dex-token', 'solana'], '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'),
  dex('DEX_ORCA', 'Orca', 'solana', 'orca', ['dex-token', 'solana'], 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE'),
  dex('DEX_BOME', 'Book of Meme', 'solana', 'raydium', ['memecoin', 'solana'], 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82'),
  dex('DEX_POPCAT', 'Popcat', 'solana', 'raydium', ['memecoin', 'solana'], '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr'),
  dex('DEX_MEW', 'cat in a dogs world', 'solana', 'raydium', ['memecoin', 'solana'], 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5'),
  dex('DEX_MYRO', 'Myro', 'solana', 'raydium', ['memecoin', 'solana'], 'HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4'),
  dex('DEX_SLERF', 'Slerf', 'solana', 'raydium', ['memecoin', 'solana']),
  dex('DEX_PONKE', 'Ponke', 'solana', 'raydium', ['memecoin', 'solana']),
  dex('DEX_PNUT', 'Peanut the Squirrel', 'solana', 'raydium', ['memecoin', 'solana']),
  dex('DEX_GOAT', 'Goatseus Maximus', 'solana', 'raydium', ['ai', 'memecoin', 'solana']),
  dex('DEX_FWOG', 'Fwog', 'solana', 'raydium', ['memecoin', 'solana']),
  dex('DEX_MOTHER', 'MOTHER IGGY', 'solana', 'raydium', ['memecoin', 'solana']),
  dex('DEX_CHILLGUY', 'Just a Chill Guy', 'solana', 'raydium', ['memecoin', 'solana']),
  dex('DEX_ACT', 'Act I: The AI Prophecy', 'solana', 'raydium', ['ai', 'solana']),
  dex('DEX_NEIRO', 'Neiro', 'solana', 'raydium', ['memecoin', 'solana']),
  dex('DEX_HARAMBE', 'Harambe', 'solana', 'raydium', ['memecoin', 'solana']),
  dex('DEX_AI16Z', 'ai16z', 'solana', 'raydium', ['ai', 'agent', 'solana']),
  dex('DEX_GRIFFAIN', 'Griffain', 'solana', 'raydium', ['ai', 'solana']),

  // === ETHEREUM DEX (Uniswap) ===
  dex('DEX_PEPE', 'Pepe', 'ethereum', 'uniswap-v2', ['memecoin', 'eth']),
  dex('DEX_MOG', 'Mog Coin', 'ethereum', 'uniswap-v2', ['memecoin', 'eth']),
  dex('DEX_TURBO', 'Turbo', 'ethereum', 'uniswap-v2', ['memecoin', 'eth']),
  dex('DEX_HPOS10I', 'HarryPotterObamaSonic10Inu', 'ethereum', 'uniswap-v2', ['memecoin', 'eth']),
  dex('DEX_WOJAK', 'Wojak', 'ethereum', 'uniswap-v2', ['memecoin', 'eth']),
  dex('DEX_LADYS', 'Milady', 'ethereum', 'uniswap-v2', ['memecoin', 'eth']),
  dex('DEX_BITCOIN', 'HarryPotterObamaSonic10', 'ethereum', 'uniswap-v2', ['memecoin', 'eth']),
  dex('DEX_LDO', 'Lido (DEX)', 'ethereum', 'uniswap-v3', ['defi', 'lsd', 'eth']),
  dex('DEX_RPL', 'Rocket Pool (DEX)', 'ethereum', 'uniswap-v3', ['defi', 'lsd', 'eth']),

  // === BASE DEX ===
  dex('DEX_BRETT', 'Brett (Base)', 'base', 'uniswap-v3', ['memecoin', 'base']),
  dex('DEX_DEGEN', 'Degen', 'base', 'uniswap-v3', ['memecoin', 'base']),
  dex('DEX_AERO', 'Aerodrome', 'base', 'aerodrome', ['dex-token', 'base']),
  dex('DEX_TOSHI', 'Toshi', 'base', 'uniswap-v3', ['memecoin', 'base']),
  dex('DEX_HIGHER', 'higher', 'base', 'uniswap-v3', ['memecoin', 'base']),
  dex('DEX_MIGGLES', 'Mister Miggles', 'base', 'uniswap-v3', ['memecoin', 'base']),
  dex('DEX_KEYCAT', 'Keyboard Cat', 'base', 'uniswap-v3', ['memecoin', 'base']),

  // === ARBITRUM DEX ===
  dex('DEX_GMX_ARB', 'GMX (Arbitrum)', 'arbitrum', 'camelot', ['defi', 'perp', 'arb']),
  dex('DEX_MAGIC', 'MAGIC', 'arbitrum', 'camelot', ['gaming', 'arb']),
  dex('DEX_RDNT', 'Radiant', 'arbitrum', 'camelot', ['defi', 'arb']),
  dex('DEX_ARB_USDC', 'ARB/USDC (Camelot)', 'arbitrum', 'camelot', ['lp', 'arb']),

  // === BNB CHAIN DEX (PancakeSwap) ===
  dex('DEX_CAKE', 'PancakeSwap', 'bsc', 'pancakeswap', ['dex-token', 'bsc']),
  dex('DEX_FLOKI_BSC', 'Floki (BSC)', 'bsc', 'pancakeswap', ['memecoin', 'bsc']),
  dex('DEX_BABYDOGE_BSC', 'Baby Doge (BSC)', 'bsc', 'pancakeswap', ['memecoin', 'bsc']),
  dex('DEX_TST', 'Test (BSC)', 'bsc', 'pancakeswap', ['memecoin', 'bsc']),

  // === BTC LAYER (Runestone, BRC-20 wrap) ===
  dex('DEX_ORDI', 'Ordinals (BRC-20)', 'btc', 'unisat', ['brc20', 'btc-layer']),
  dex('DEX_SATS', 'SATS (BRC-20)', 'btc', 'unisat', ['brc20', 'btc-layer']),
];
