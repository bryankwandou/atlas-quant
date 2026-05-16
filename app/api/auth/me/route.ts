/**
 * /api/auth/me — kembalikan info user dari session token.
 */
import { NextResponse } from 'next/server';
import { readSessionFromHeader } from '@/services/auth/session';
import { findUserById } from '@/services/auth/users';

export async function GET(req: Request) {
  const payload = readSessionFromHeader(req.headers.get('authorization'));
  if (!payload) return NextResponse.json({ authenticated: false }, { status: 401 });
  const user = await findUserById(payload.uid).catch(() => null);
  return NextResponse.json({
    authenticated: true,
    method: payload.method,
    user: user
      ? { id: user.id, email: user.email, wallet: user.walletAddress, role: user.isAdmin ? 'admin' : user.role, displayName: user.displayName }
      : { id: payload.uid, role: payload.role },
  });
}
