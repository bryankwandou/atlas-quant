import { NextResponse } from 'next/server';
import { clearedAdminSessionCookie } from '@/src/services/admin/session';

export async function POST() {
  const c = clearedAdminSessionCookie();
  const res = NextResponse.json({ success: true });
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
