/**
 * Wallet auth — verifier & session issuer.
 * POST { publicKey, signature, nonce, expiresAt, signed, chain? }
 *
 * - Validasi challenge (HMAC tidak palsu, belum kedaluwarsa)
 * - Verifikasi ed25519 signature (Solana)
 * - Lookup user di tabel `app_users`; auto-create jika baru
 * - Approval policy: ENV WALLET_AUTO_APPROVE=true → langsung approved
 *   ELSE → status pending sampai admin promote
 */
import { NextResponse } from 'next/server';
import { verifyChallenge, verifySolanaSignature, buildMessage } from '@/services/auth/wallet';
import { createWalletUser, findUserByWallet } from '@/services/auth/users';
import { issueSession } from '@/services/auth/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { publicKey, signature, nonce, expiresAt, signed, chain } = body ?? {};
    if (!publicKey || !signature || !nonce || !expiresAt || !signed) {
      return NextResponse.json({ error: 'Field wajib hilang.' }, { status: 400 });
    }

    if (!verifyChallenge({ publicKey, nonce, expiresAt: Number(expiresAt), signed })) {
      return NextResponse.json({ error: 'Challenge tidak valid atau kedaluwarsa.' }, { status: 401 });
    }

    const message = buildMessage(publicKey, nonce, Number(expiresAt));
    const sigOk = verifySolanaSignature({ publicKey, message, signature });
    if (!sigOk) {
      return NextResponse.json({ error: 'Signature tidak cocok.' }, { status: 401 });
    }

    let user = await findUserByWallet(publicKey);
    if (!user) user = await createWalletUser({ wallet: publicKey, chain });

    if (!user.isApproved) {
      return NextResponse.json({
        status: 'pending',
        error: 'Wallet belum disetujui admin.',
        wallet: publicKey,
      }, { status: 403 });
    }

    const token = issueSession({
      uid: user.id,
      method: 'wallet',
      wallet: user.walletAddress,
      role: user.isAdmin ? 'admin' : user.role,
    });

    return NextResponse.json({
      token,
      session_token: token,
      user: {
        id: user.id,
        wallet: user.walletAddress,
        chain: user.walletChain,
        displayName: user.displayName,
        role: user.isAdmin ? 'admin' : user.role,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error', detail: String(e) }, { status: 500 });
  }
}
