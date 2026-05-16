/**
 * DEPRECATED LEGACY LOGIN ROUTE.
 * Hardcoded master pubkey & password telah dihapus karena dianggap kompromi.
 * Gunakan endpoint baru:
 *   - /api/auth/email/login    (email + password via Supabase)
 *   - /api/auth/wallet/challenge + /api/auth/wallet/verify (signature flow)
 */
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { email, password, username } = body ?? {};
        const finalEmail = email || (username && username.includes('@') ? username : null);
        if (!finalEmail || !password) {
            return NextResponse.json({
                error: 'Hardcoded master login dinonaktifkan. Pakai email+password via /api/auth/email/login atau wallet via /api/auth/wallet/*',
            }, { status: 410 });
        }
        const fwd = await fetch(new URL('/api/auth/email/login', request.url), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: finalEmail, password }),
        });
        const data = await fwd.json();
        return NextResponse.json(data, { status: fwd.status });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error', detail: String(error) }, { status: 500 });
    }
}
