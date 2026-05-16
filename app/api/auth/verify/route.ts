import { NextResponse } from 'next/server';
import { verifySignature } from '@/services/auth/verify';
import { isUserApproved } from '@/services/solana/approval';
import { hasMinimumBalance } from '@/services/solana/balance';
import { isSignupOpen } from '@/src/services/admin/store';
import crypto from 'crypto';

/**
 * Issues a short-lived HMAC-signed session token.
 * No hardcoded wallet addresses, no master-token bypass.
 */
const SESSION_SECRET = process.env.CRON_SECRET || 'fallback-secret';

const issueToken = (publicKey: string) => {
  const payload = Buffer.from(
    JSON.stringify({ publicKey, exp: Date.now() + 24 * 60 * 60 * 1000 })
  ).toString('base64');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
};

export async function POST(request: Request) {
  try {
    const { publicKey, signature, challenge } = await request.json();

    if (!publicKey || !signature || !challenge) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // 1. Verify cryptographic signature
    const isValid = verifySignature(publicKey, signature, challenge);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Ensure Solana balance (skipped in dev when devnet is unreachable)
    const hasBalance = await hasMinimumBalance(publicKey);
    if (!hasBalance) {
      return NextResponse.json({ error: 'Insufficient SOL balance' }, { status: 403 });
    }

    // 3. Approval gate honors the admin "signup mode":
    //      - 'open'     → anyone with a verified signature + balance can in
    //      - 'approval' → must be approved on-chain
    const open = await isSignupOpen();
    if (!open) {
      const isApproved = await isUserApproved(publicKey);
      if (!isApproved) {
        return NextResponse.json({ error: 'Pending approval', status: 'pending' }, { status: 403 });
      }
    }

    // 4. Issue session token
    const token = issueToken(publicKey);
    return NextResponse.json({ token, publicKey });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
