import { Connection, PublicKey } from '@solana/web3.js';
import { ENV } from '@/config/env';

export const solanaConnection = new Connection(ENV.SOLANA_RPC_URL, 'confirmed');

/**
 * Returns the configured master/treasury pubkey or null when not set.
 * Code paths that previously used a hardcoded fallback now treat the
 * absence of MASTER_PUBLIC_KEY as "no special master account exists" —
 * the dashboard-admin flow does NOT require it, and the on-chain
 * approval path is only consulted when signup mode is 'approval'.
 */
export const getMasterPublicKey = (): PublicKey | null => {
  const v = ENV.MASTER_PUBLIC_KEY;
  if (!v) return null;
  try { return new PublicKey(v); } catch { return null; }
};
