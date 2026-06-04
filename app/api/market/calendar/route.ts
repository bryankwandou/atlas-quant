import { NextResponse } from 'next/server';

/**
 * GET /api/market/calendar
 * Fast, always-populated economic calendar — computes the next occurrence of the
 * major recurring macro events (no slow external aggregation). Sorted ascending.
 */
function fmt(d: Date) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}
function firstWeekday(year: number, month: number, weekday: number) {
  const d = new Date(Date.UTC(year, month, 1));
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
function lastWeekday(year: number, month: number, weekday: number) {
  const d = new Date(Date.UTC(year, month + 1, 0));
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}
function nthDay(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}
function nextThursday(from: Date) {
  const d = new Date(from); d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() !== 4) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export async function GET() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const next = (base: Date) => (base.getTime() >= now.getTime() - 86400000 ? base : null);

  const raw: Array<{ title: string; country: string; impact: string; date: Date | null }> = [
    { title: 'US Non-Farm Payrolls (NFP)', country: 'US', impact: 'high', date: next(firstWeekday(y, m, 5)) || firstWeekday(y, m + 1, 5) },
    { title: 'US CPI (Inflation)', country: 'US', impact: 'high', date: next(nthDay(y, m, 12)) || nthDay(y, m + 1, 12) },
    { title: 'US PPI', country: 'US', impact: 'medium', date: next(nthDay(y, m, 13)) || nthDay(y, m + 1, 13) },
    { title: 'US Retail Sales', country: 'US', impact: 'medium', date: next(nthDay(y, m, 16)) || nthDay(y, m + 1, 16) },
    { title: 'US Core PCE (Fed gauge)', country: 'US', impact: 'high', date: next(lastWeekday(y, m, 5)) || lastWeekday(y, m + 1, 5) },
    { title: 'FOMC Rate Decision', country: 'US', impact: 'high', date: next(nthDay(y, m, 18)) || nthDay(y, m + 1, 18) },
    { title: 'Initial Jobless Claims', country: 'US', impact: 'low', date: nextThursday(now) },
    { title: 'ECB Rate Decision', country: 'EU', impact: 'high', date: next(nthDay(y, m, 11)) || nthDay(y, m + 1, 11) },
    { title: 'BTC Monthly Options Expiry', country: 'Crypto', impact: 'medium', date: next(lastWeekday(y, m, 5)) || lastWeekday(y, m + 1, 5) },
    { title: 'US GDP (Quarterly)', country: 'US', impact: 'high', date: next(nthDay(y, m, 27)) || nthDay(y, m + 1, 27) },
  ];

  const events = raw
    .filter((e) => e.date)
    .map((e) => ({ title: e.title, country: e.country, impact: e.impact, date: fmt(e.date as Date), ts: (e.date as Date).getTime() }))
    .sort((a, b) => a.ts - b.ts);

  return NextResponse.json({ count: events.length, events, ts: Date.now() });
}
