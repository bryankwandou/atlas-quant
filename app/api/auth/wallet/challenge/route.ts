/**
 * Wallet auth — challenge issuer.
 * POST { publicKey }
 * → { nonce, message, expiresAt, signed }
 *
 * Client harus minta wallet menandatangani field `message` MENTAH, lalu kirim
 * { publicKey, signature, nonce, expiresAt, signed } ke /api/auth/wallet/verify.
 */
import { NextResponse } from 'next/server';
import { buildChallenge } from '@/services/auth/wallet';

export async function POST(req: Request) {
  try {
    const { publicKey } = await req.json();
    if (!publicKey || typeof publicKey !== 'string') {
      return NextResponse.json({ error: 'publicKey wajib.' }, { status: 400 });
    }
    const c = buildChallenge(publicKey.trim());
    return NextResponse.json(c);
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error', detail: String(e) }, { status: 500 });
  }
}
