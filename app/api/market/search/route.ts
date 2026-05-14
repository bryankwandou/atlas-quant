import { NextRequest, NextResponse } from 'next/server';
import { SYMBOL_CATALOG } from '@/src/data/symbolCatalog';

const BINANCE_BASE = process.env.BINANCE_BASE_URL || 'https://api.binance.com/api/v3';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('q') || '';
  const q   = raw.trim();

  if (!q || q.length < 1) {
    // Return top defaults when no query
    const defaults = SYMBOL_CATALOG.slice(0, 12).map(s => ({
      symbol: s.symbol, name: s.name, exchange: s.exchange, assetClass: s.assetClass,
    }));
    return NextResponse.json({ results: defaults, query: '' });
  }

  const ql = q.toLowerCase();
  const qu = q.toUpperCase();

  // 1. Search local catalog (symbol + name)
  const exactSym  = SYMBOL_CATALOG.filter(s => s.symbol.toUpperCase() === qu);
  const startsSym = SYMBOL_CATALOG.filter(s => s.symbol.toUpperCase().startsWith(qu) && s.symbol.toUpperCase() !== qu);
  const startsName= SYMBOL_CATALOG.filter(s =>
    !s.symbol.toUpperCase().startsWith(qu) &&
    s.name.toLowerCase().startsWith(ql)
  );
  const containsSym = SYMBOL_CATALOG.filter(s =>
    !s.symbol.toUpperCase().startsWith(qu) &&
    !s.name.toLowerCase().startsWith(ql) &&
    s.symbol.toUpperCase().includes(qu)
  );
  const containsName= SYMBOL_CATALOG.filter(s =>
    !s.symbol.toUpperCase().startsWith(qu) &&
    !s.name.toLowerCase().startsWith(ql) &&
    !s.symbol.toUpperCase().includes(qu) &&
    s.name.toLowerCase().includes(ql)
  );

  const catalogResults = [...exactSym, ...startsSym, ...startsName, ...containsSym, ...containsName]
    .slice(0, 12)
    .map(s => ({
      symbol:     s.symbol,
      name:       s.name,
      exchange:   s.exchange,
      assetClass: s.assetClass,
    }));

  // 2. If fewer than 8 results and query looks like crypto, augment from Binance live
  const looksLikeCrypto = /^[A-Z0-9]{2,10}(USDT|BTC|ETH|BNB)?$/i.test(q);
  if (catalogResults.length < 8 && looksLikeCrypto) {
    try {
      const res = await fetch(`${BINANCE_BASE}/ticker/24hr`, { next: { revalidate: 120 } });
      if (res.ok) {
        const tickers = await res.json();
        const binanceResults = (tickers as any[])
          .filter((t: any) =>
            t.symbol.includes(qu) &&
            t.symbol.endsWith('USDT') &&
            !catalogResults.some(c => c.symbol === t.symbol)
          )
          .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
          .slice(0, 8 - catalogResults.length)
          .map((t: any) => ({
            symbol:     t.symbol,
            name:       t.symbol.replace('USDT', ''),
            exchange:   'BINANCE',
            assetClass: 'crypto',
            price:      parseFloat(t.lastPrice),
            change24h:  parseFloat(t.priceChangePercent),
          }));
        return NextResponse.json({
          results: [...catalogResults, ...binanceResults].slice(0, 12),
          query:   q,
        });
      }
    } catch { /* fall through */ }
  }

  return NextResponse.json({ results: catalogResults, query: q });
}
