/**
 * DEPRECATED legacy verify route. Hardcoded master & admin token bypass
 * telah dihapus. Lakukan auth via:
 *   - /api/auth/wallet/challenge + /api/auth/wallet/verify
 *   - /api/auth/email/login
 *
 * Route ini hanya akan menolak request untuk mencegah path lama dipakai
 * tanpa migrasi.
 */
import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json({
        error: 'Legacy /api/auth/verify dinonaktifkan. Pakai /api/auth/wallet/* atau /api/auth/email/* di Atlas Quant v2.',
        migration: ['POST /api/auth/email/login', 'POST /api/auth/wallet/challenge', 'POST /api/auth/wallet/verify'],
    }, { status: 410 });
}
