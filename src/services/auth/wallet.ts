/**
 * Wallet signature verification — multi-chain (Solana sekarang; siap di-extend EVM).
 * TIDAK ada hardcoded master pubkey. Admin status berasal dari tabel `app_users`.
 *
 * Flow (challenge–response):
 *   1. Client minta `/api/auth/wallet/challenge` dengan { publicKey }.
 *      Server kembalikan { nonce, message, expiresAt }.
 *   2. Client meminta wallet user (Phantom / Solflare / lain) sign message
 *      mentah → mendapat signature base58/hex.
 *   3. Client POST `/api/auth/wallet/verify` dengan { publicKey, signature, nonce }.
 *      Server cek nonce belum kedaluwarsa, signature valid (ed25519),
 *      lalu lookup / create user dan issue session token.
 */
import bs58 from 'bs58';
import { sign } from 'tweetnacl';
import { randomUUID, createHmac } from 'crypto';

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 menit
const SECRET = process.env.SUPABASE_JWT_SECRET || process.env.CRON_SECRET || 'dev-secret';

export function buildChallenge(publicKey: string): { nonce: string; message: string; expiresAt: number; signed: string } {
  const nonce = randomUUID();
  const expiresAt = Date.now() + NONCE_TTL_MS;
  const message = [
    'Atlas Quant — Wallet Authentication',
    `Wallet: ${publicKey}`,
    `Nonce: ${nonce}`,
    `Expires: ${new Date(expiresAt).toISOString()}`,
    '',
    'By signing, you authenticate to Atlas Quant. Signing is GAS-FREE and cannot move any funds.',
  ].join('\n');
  const signed = createHmac('sha256', SECRET).update(`${publicKey}|${nonce}|${expiresAt}`).digest('hex');
  return { nonce, message, expiresAt, signed };
}

export function verifyChallenge(input: { publicKey: string; nonce: string; expiresAt: number; signed: string }): boolean {
  if (input.expiresAt < Date.now()) return false;
  const expected = createHmac('sha256', SECRET).update(`${input.publicKey}|${input.nonce}|${input.expiresAt}`).digest('hex');
  return expected === input.signed;
}

export function buildMessage(publicKey: string, nonce: string, expiresAt: number): string {
  return [
    'Atlas Quant — Wallet Authentication',
    `Wallet: ${publicKey}`,
    `Nonce: ${nonce}`,
    `Expires: ${new Date(expiresAt).toISOString()}`,
    '',
    'By signing, you authenticate to Atlas Quant. Signing is GAS-FREE and cannot move any funds.',
  ].join('\n');
}

export function verifySolanaSignature(opts: {
  publicKey: string;
  message: string;
  signature: string; // base58 or hex
}): boolean {
  try {
    const pubBytes = bs58.decode(opts.publicKey);
    if (pubBytes.length !== 32) return false;
    const msgBytes = new TextEncoder().encode(opts.message);
    let sigBytes: Uint8Array;
    try {
      sigBytes = bs58.decode(opts.signature);
    } catch {
      sigBytes = Buffer.from(opts.signature, 'hex');
    }
    if (sigBytes.length !== 64) return false;
    return sign.detached.verify(msgBytes, sigBytes, pubBytes);
  } catch {
    return false;
  }
}
