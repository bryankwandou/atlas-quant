/**
 * On-chain & exchange-flow feeds (best-effort, no auth required).
 * Sources:
 *   - mempool.space      → BTC hashrate / mempool / fees
 *   - blockchain.info    → BTC exchange flow proxy
 *   - etherscan public   → Ethereum gas tracker (no key endpoint where possible)
 *   - coingecko          → stablecoin supply trends
 *   - solana RPC (devnet/mainnet) → recent blockhash latency proxy
 */

interface OnChainBitcoin {
  hashrateEH: number | null;
  difficulty: number | null;
  mempoolPendingTx: number | null;
  feeFastSatVb: number | null;
  blockHeight: number | null;
}

interface OnChainEthereum {
  gasGwei: number | null;
  baseFee: number | null;
  lastBlock: number | null;
}

interface StablecoinSnapshot {
  usdtMarketCap: number | null;
  usdcMarketCap: number | null;
  totalStableMarketCap: number | null;
  pct24h: number | null;
}

export interface OnChainSnapshot {
  bitcoin: OnChainBitcoin | null;
  ethereum: OnChainEthereum | null;
  stablecoins: StablecoinSnapshot | null;
  solanaSlot: number | null;
  notes: string[];
  timestamp: number;
}

async function fetchBitcoin(): Promise<OnChainBitcoin | null> {
  try {
    const [hashr, mempool, fees, blockHeight] = await Promise.all([
      fetch('https://mempool.space/api/v1/mining/hashrate/3d', { next: { revalidate: 1800 } }).then((r) => (r.ok ? r.json() : null)),
      fetch('https://mempool.space/api/mempool', { next: { revalidate: 120 } }).then((r) => (r.ok ? r.json() : null)),
      fetch('https://mempool.space/api/v1/fees/recommended', { next: { revalidate: 120 } }).then((r) => (r.ok ? r.json() : null)),
      fetch('https://mempool.space/api/blocks/tip/height', { next: { revalidate: 120 } }).then((r) => (r.ok ? r.text() : null)),
    ]);
    return {
      hashrateEH: hashr?.currentHashrate ? parseFloat((hashr.currentHashrate / 1e18).toFixed(3)) : null,
      difficulty: hashr?.currentDifficulty ?? null,
      mempoolPendingTx: mempool?.count ?? null,
      feeFastSatVb: fees?.fastestFee ?? null,
      blockHeight: blockHeight ? parseInt(blockHeight, 10) : null,
    };
  } catch {
    return null;
  }
}

async function fetchEthereum(): Promise<OnChainEthereum | null> {
  try {
    const res = await fetch('https://api.blocknative.com/gasprices/blockprices', {
      next: { revalidate: 180 },
    });
    if (res.ok) {
      const data = await res.json();
      const est = data?.blockPrices?.[0]?.estimatedPrices?.[0];
      const base = data?.blockPrices?.[0]?.baseFeePerGas;
      return {
        gasGwei: est?.price ?? null,
        baseFee: base ?? null,
        lastBlock: data?.blockPrices?.[0]?.blockNumber ?? null,
      };
    }
  } catch { /* fall through */ }
  // Fallback: Cloudflare-Ethereum RPC eth_gasPrice
  try {
    const rpc = await fetch('https://cloudflare-eth.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }),
      next: { revalidate: 180 },
    });
    if (!rpc.ok) return null;
    const data = await rpc.json();
    const wei = parseInt(data?.result ?? '0', 16);
    return { gasGwei: wei > 0 ? parseFloat((wei / 1e9).toFixed(2)) : null, baseFee: null, lastBlock: null };
  } catch {
    return null;
  }
}

async function fetchStablecoins(): Promise<StablecoinSnapshot | null> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=tether,usd-coin,dai,first-digital-usd,paypal-usd,trueusd&price_change_percentage=24h',
      { next: { revalidate: 1800 } },
    );
    if (!res.ok) return null;
    const data: any[] = await res.json();
    if (!data?.length) return null;
    const find = (id: string) => data.find((d) => d.id === id);
    const usdt = find('tether');
    const usdc = find('usd-coin');
    const total = data.reduce((acc, d) => acc + (d?.market_cap ?? 0), 0);
    return {
      usdtMarketCap: usdt?.market_cap ?? null,
      usdcMarketCap: usdc?.market_cap ?? null,
      totalStableMarketCap: total,
      pct24h: usdt?.price_change_percentage_24h ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchSolanaSlot(): Promise<number | null> {
  try {
    const res = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSlot' }),
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.result ?? null;
  } catch {
    return null;
  }
}

export async function getOnChainSnapshot(): Promise<OnChainSnapshot> {
  const [bitcoin, ethereum, stablecoins, solanaSlot] = await Promise.all([
    fetchBitcoin(),
    fetchEthereum(),
    fetchStablecoins(),
    fetchSolanaSlot(),
  ]);
  const notes: string[] = [];
  if (ethereum?.gasGwei && ethereum.gasGwei > 80) notes.push(`Ethereum gas elevated (${ethereum.gasGwei} gwei)`);
  if (bitcoin?.mempoolPendingTx && bitcoin.mempoolPendingTx > 150000) notes.push(`BTC mempool congested (${bitcoin.mempoolPendingTx} tx)`);
  if (stablecoins?.totalStableMarketCap && stablecoins.totalStableMarketCap > 0) {
    notes.push(`Stablecoin total: $${Math.round(stablecoins.totalStableMarketCap / 1e9)}B`);
  }
  return { bitcoin, ethereum, stablecoins, solanaSlot, notes, timestamp: Date.now() };
}

export function scoreOnChain(s: OnChainSnapshot | null): { multiplier: number; note: string } {
  if (!s) return { multiplier: 1.0, note: '' };
  let mult = 1.0;
  if (s.ethereum?.gasGwei && s.ethereum.gasGwei > 120) { mult *= 0.95; }
  if (s.stablecoins?.pct24h && s.stablecoins.pct24h > 0.5) { mult *= 1.04; }
  if (s.stablecoins?.pct24h && s.stablecoins.pct24h < -0.5) { mult *= 0.96; }
  return { multiplier: parseFloat(mult.toFixed(3)), note: '' };
}
