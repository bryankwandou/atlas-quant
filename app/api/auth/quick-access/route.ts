/**
 * Magic link endpoint — GET /api/auth/quick-access?k=KEY
 * Returns HTML that auto-stores the session and redirects to /chart.
 * Key defaults to env QUICK_ACCESS_KEY or 'atlas2026' if not set.
 */
import { NextRequest, NextResponse } from 'next/server';
import { issueSession } from '@/services/auth/session';

export async function GET(req: NextRequest) {
  const key     = req.nextUrl.searchParams.get('k') || req.nextUrl.searchParams.get('token') || '';
  const validKey = process.env.QUICK_ACCESS_KEY || 'atlas2026';

  if (!key || key !== validKey) {
    return new NextResponse('Access denied', { status: 401 });
  }

  const masterEmail = process.env.MASTER_EMAIL || 'nayrbryangaming3@gmail.com';
  const token = issueSession({
    uid:    'master-00',
    method: 'admin',
    email:  masterEmail,
    role:   'master',
  }, 30 * 24 * 60 * 60 * 1000); // 30 days

  const user = JSON.stringify({
    id:          'master-00',
    email:       masterEmail,
    displayName: 'Master',
    role:        'master',
  });

  // Return HTML page that stores session in localStorage then redirects to /chart
  const html = `<!DOCTYPE html>
<html>
<head><title>ATLAS·QUANT — Signing in…</title>
<style>body{background:#0d1218;color:#cdd4e1;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;}
.logo{font-size:22px;font-weight:700;letter-spacing:2px;color:#7b61ff;}
.msg{font-size:13px;color:#7a8294;}</style></head>
<body>
<div class="logo">▲ ATLAS·QUANT</div>
<div class="msg">Authenticating…</div>
<script>
  try {
    localStorage.setItem('session_token', ${JSON.stringify(token)});
    localStorage.setItem('atlas_user', ${JSON.stringify(user)});
  } catch(e) {}
  window.location.replace('/chart');
</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
