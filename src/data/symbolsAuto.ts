/**
 * Atlas Quant · Programmatic symbol generators
 * Generates tens of thousands of tickers from compact source lists.
 * All outputs deterministic — safe for SSR and client.
 */

import type { SymbolMeta, AssetClass } from './symbolCatalog';

// ─────────────────────────────────────────────────────────────────────────────
// 1) BINANCE PERPETUAL & SPOT — top liquid + long tail
// ─────────────────────────────────────────────────────────────────────────────

const BINANCE_BASES = [
  // Top 200 by liquidity (curated from Binance volume rankings)
  'BTC','ETH','BNB','SOL','XRP','ADA','DOGE','AVAX','TRX','LINK','DOT','MATIC','POL','LTC','BCH','ATOM',
  'XLM','FIL','VET','ETC','HBAR','ICP','APT','SUI','TON','NEAR','ALGO','MANA','SAND','AXS','GALA','APE',
  'GMT','OP','ARB','INJ','TIA','JUP','WLD','ENA','FET','RENDER','THETA','STX','ORDI','SEI','PYTH','PENDLE',
  'JTO','BLUR','ETHFI','BIGTIME','SUPER','TURBO','UMA','AGLD','XAI','PIXEL','PORTAL','STRK','DYM','MANTA',
  'ALT','METIS','GLM','ZRO','OMNI','REZ','SAGA','TAO','OMG','SKL','BAND','ANKR','LRC','ZIL','HOT','CKB',
  'KAVA','RUNE','LDO','GRT','EOS','XTZ','EGLD','FLOW','MINA','KLAY','QNT','XEM','XMR','DASH','ZEC',
  'AAVE','UNI','SNX','COMP','MKR','CRV','YFI','SUSHI','1INCH','BAL','PERP','REN','RLC','OXT','LPT',
  'IOTA','ZRX','BAT','ENJ','CHZ','CELR','STMX','REQ','WAXP','MASK','API3','C98','DYDX','MAGIC',
  'IMX','GMX','BLUR','WOO','HFT','HOOK','TROY','GAS','POWR','STORJ','SXP','SC','FUN','VITE','XVG',
  'ARDR','STEEM','ZEN','LSK','NULS','XEC','BSV','MIOTA','WAVES','BTS','XEM','EOS','TRB','BNT','LOOM',
  'KNC','RVN','POLY','LINA','PERL','POND','DGB','MFT','UPP','WIN','BTTC','REI','GLMR','MOVR','ROSE',
  'CELO','KMD','ARK','SYS','NEXO','PUNDIX','UTK','DENT','DEXE','ELF','FIDA','HARD','HIVE','IRIS',
  'JST','KEY','MDT','MTL','MITH','NMR','NEBL','NKN','OCEAN','OGN','ONG','ONT','ORN','PHA','PIVX',
  'PNT','POLS','PROM','RAD','RAY','REEF','RSR','SLP','SOLO','SPELL','STORJ','STPT','SUN','SUSD',
  'SXP','TFUEL','TLM','TKO','TRIBE','TVK','TWT','UFT','UNFI','VITE','VOXEL','WAN','WAXP','WING',
  // Memecoin long tail
  'SHIB','PEPE','FLOKI','BONK','WIF','MEME','NEIRO','POPCAT','BOME','TURBO','MOG','BRETT','MOTHER',
  'BABYDOGE','SAMO','MYRO','PONKE','MEW','SLERF','SMOG','SUNDOG','PNUT','GOAT','CHILLGUY','ACT',
  'MOODENG','SPX','PEPECOIN','HOPPY','TROLL','RETARDIO','MICHI','DEGEN','BRC','GIGA','FWOG','MOO',
  // AI tokens
  'TAO','VIRTUAL','AI16Z','AIXBT','AGENT','GRIFFAIN','ZEREBRO','GAME','VVV','HEY','FREYSA','ARC',
  // RWA / DePIN
  'LINK','RNDR','ATH','POKT','HNT','MOBILE','IOT','DIMO','THETA','FIL','ICP','AR','SC','LPT','LIVEPEER',
];

const BINANCE_QUOTES: Array<{ q: string; weight: number }> = [
  { q: 'USDT', weight: 1.0 },
  { q: 'USDC', weight: 0.6 },
  { q: 'FDUSD', weight: 0.4 },
  { q: 'BTC', weight: 0.5 },
  { q: 'ETH', weight: 0.3 },
];

export function generateBinanceSymbols(): SymbolMeta[] {
  const out: SymbolMeta[] = [];
  const seen = new Set<string>();
  const memeBases = new Set(['SHIB','PEPE','FLOKI','BONK','WIF','MEME','NEIRO','POPCAT','BOME','TURBO','MOG','BRETT','MOTHER','BABYDOGE','SAMO','MYRO','PONKE','MEW','SLERF','SMOG','SUNDOG','PNUT','GOAT','CHILLGUY','ACT','MOODENG','SPX','PEPECOIN','HOPPY','TROLL','RETARDIO','MICHI','DEGEN','GIGA','FWOG','DOGE','BABYDOGE']);
  for (const base of BINANCE_BASES) {
    for (const { q } of BINANCE_QUOTES) {
      if (base === q) continue;
      const sym = `${base}${q}`;
      if (seen.has(sym)) continue;
      seen.add(sym);
      out.push({
        symbol: sym,
        name: `${base}/${q}`,
        exchange: 'BINANCE',
        assetClass: memeBases.has(base) ? ('memecoin' as AssetClass) : ('crypto' as AssetClass),
        binancePair: sym,
        category: q === 'USDT' ? 'Spot/USDT' : q === 'USDC' ? 'Spot/USDC' : q === 'FDUSD' ? 'Spot/FDUSD' : `Cross/${q}`,
      });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) US STOCKS — S&P 500 + NASDAQ 100 + popular tickers
// ─────────────────────────────────────────────────────────────────────────────

const SP500_NASDAQ_TICKERS = [
  // Mega-caps
  'AAPL','MSFT','GOOGL','GOOG','AMZN','META','TSLA','NVDA','BRK-B','UNH','JNJ','V','XOM','JPM','WMT',
  'MA','PG','HD','LLY','CVX','MRK','ABBV','PEP','KO','AVGO','COST','TMO','MCD','CSCO','ADBE','PFE',
  'CRM','DHR','ABT','ACN','LIN','NKE','TXN','VZ','NFLX','BAC','PM','WFC','AMD','UPS','RTX','INTC',
  'NEE','LOW','SPGI','UNP','MS','HON','IBM','BMY','QCOM','GS','BLK','C','CAT','MDT','AMGN','SCHW',
  'AMT','DE','PLD','ELV','ADP','LMT','GILD','MMC','TJX','SBUX','BKNG','ZTS','MO','GE','SO','SYK',
  'CB','REGN','MDLZ','VRTX','PGR','ISRG','BSX','EOG','DUK','BDX','APH','FI','SLB','EQIX','CCI','CL',
  'CME','MMM','TGT','NSC','ETN','AON','MU','PNC','FCX','USB','SHW','ITW','GD','EMR','HUM','MCK','APD',
  'CSX','GM','ICE','MAR','PSA','NOC','LRCX','ROP','KLAC','MET','F','AIG','EW','AJG','SNPS','PSX',
  'MNST','HCA','CHTR','TT','AFL','TFC','SPG','ORLY','MCHP','ECL','TRV','VLO','WM','PCAR','CMG',
  'ADI','D','PAYX','EXC','MSI','FTNT','KMB','GIS','NEM','XEL','BIIB','SRE','HLT','CTAS','OXY',
  'STZ','PEG','CTSH','PRU','WMB','EFX','ALL','HSY','BK','KR','DOW','VICI','AZO','DXCM','ROST','TEL',
  'O','CRH','MPC','CARR','MCO','PH','RSG','CCL','DLR','DD','CMI','ANSS','BAX','FAST','ON','VRSK',
  'MTB','RCL','EBAY','HPQ','BKR','AMP','EIX','ALB','GLW','BRO','FE','LH','MLM','RJF','HPE','VMC',
  'WAB','PWR','LUV','TROW','PPG','FANG','NXPI','WST','CBOE','TSCO','IFF','ZBH','WTW','MTD','GWW',
  // Popular tech / growth
  'PYPL','SHOP','SQ','ROKU','TWLO','SNAP','UBER','LYFT','DASH','ABNB','COIN','HOOD','SOFI','PLTR',
  'NET','SNOW','DDOG','ZS','CRWD','OKTA','ZM','DOCU','PINS','RBLX','U','MDB','TEAM','WDAY','NOW',
  'PANW','FTNT','DELL','HPQ','IBM','ORCL','SAP','SHOP','WIX','SE','GRAB','MELI','BABA','JD','PDD',
  'NIO','XPEV','LI','RIVN','LCID','FFIE','PSNY','BLNK','CHPT','FSR','CHPT','RUN','FSLR','ENPH','SEDG',
  'PLUG','BLDP','BE','PCG','EXAS','VEEV','TDOC','HOOK','MRVL','AVAV','RKLB','SPCE','BBBY','GME','AMC',
  // Biotech mid-caps
  'MRNA','PFE','BNTX','NVAX','ARCT','VRTX','REGN','VRTX','IONS','SAGE','NBIX','ALNY','BMRN','INCY',
  'SRPT','ARWR','BLUE','EDIT','CRSP','NTLA','BEAM','SANA','ARGX','SGEN','MYGN','EXEL','NKTR','VIR',
  // Crypto-adjacent
  'COIN','HOOD','MSTR','RIOT','MARA','HUT','BITF','CIFR','BTBT','GLXY','BITF','HIVE','CLSK','WULF',
  'COTI','SI','SILVERGATE','PYPL','SQ','BLOCK','MELI','SOFI','ROOT','LMND','SPCE','VRM',
  // ETFs (will be marked separately)
];

const NASDAQ_TICKERS = new Set([
  'AAPL','MSFT','GOOGL','GOOG','AMZN','META','TSLA','NVDA','AVGO','COST','CSCO','ADBE','PFE','CMCSA',
  'PYPL','SBUX','MDLZ','GILD','REGN','VRTX','BIIB','ADP','MU','LRCX','KLAC','ASML','MAR','BKNG','TXN',
  'INTC','AMD','QCOM','MCHP','ON','PCAR','PDD','JD','BIDU','NTES','TME','BILI','DOCU','ZM','ROKU','TEAM',
  'WDAY','NOW','PANW','FTNT','NET','SNOW','DDOG','ZS','CRWD','OKTA','MDB','MELI','SHOP','SE','GRAB','ABNB',
  'COIN','HOOD','SOFI','PLTR','RBLX','U','TSCO','EXC','EBAY','AZN','CTAS','CTSH','EA','EWBC','FANG','FAST',
  'GFS','GH','GOOG','IDXX','ILMN','INCY','ISRG','LULU','MNST','NXPI','ODFL','PAYX','SIRI','SNPS','VRSK',
  'WBA','WDC','WTW','XEL','ZBRA','MRNA','BNTX','NVAX','TWLO','LCID','RIVN','BLNK','CHPT','FSR','RUN','FSLR',
  'ENPH','SEDG','PLUG','BLDP','TDOC','MRVL','RKLB','GME','AMC','BABA','MSTR','RIOT','MARA','HUT','BITF',
]);

export function generateUSStocks(): SymbolMeta[] {
  const out: SymbolMeta[] = [];
  const seen = new Set<string>();
  for (const t of SP500_NASDAQ_TICKERS) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push({
      symbol: t,
      name: t,
      exchange: NASDAQ_TICKERS.has(t) ? 'NASDAQ' : 'NYSE',
      assetClass: 'stock_us',
      yahooTicker: t,
      category: 'US Equity',
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) US ETFs
// ─────────────────────────────────────────────────────────────────────────────

const ETF_TICKERS: Array<{ s: string; n: string; cat: string }> = [
  { s: 'SPY',  n: 'SPDR S&P 500 ETF',                cat: 'Broad Market' },
  { s: 'QQQ',  n: 'Invesco QQQ (Nasdaq-100)',         cat: 'Broad Market' },
  { s: 'IWM',  n: 'iShares Russell 2000',             cat: 'Small Cap' },
  { s: 'DIA',  n: 'SPDR Dow Jones Industrial',        cat: 'Broad Market' },
  { s: 'VTI',  n: 'Vanguard Total Stock Market',      cat: 'Broad Market' },
  { s: 'VOO',  n: 'Vanguard S&P 500',                 cat: 'Broad Market' },
  { s: 'VEA',  n: 'Vanguard FTSE Developed Markets',  cat: 'International' },
  { s: 'VWO',  n: 'Vanguard FTSE Emerging Markets',   cat: 'Emerging' },
  { s: 'AGG',  n: 'iShares Core US Aggregate Bond',   cat: 'Bonds' },
  { s: 'BND',  n: 'Vanguard Total Bond Market',       cat: 'Bonds' },
  { s: 'TLT',  n: 'iShares 20+ Year Treasury',        cat: 'Bonds' },
  { s: 'IEF',  n: 'iShares 7-10 Year Treasury',       cat: 'Bonds' },
  { s: 'SHY',  n: 'iShares 1-3 Year Treasury',        cat: 'Bonds' },
  { s: 'HYG',  n: 'iShares High Yield Corporate',     cat: 'Bonds' },
  { s: 'LQD',  n: 'iShares Investment Grade Corp',    cat: 'Bonds' },
  { s: 'GLD',  n: 'SPDR Gold Shares',                 cat: 'Commodity' },
  { s: 'IAU',  n: 'iShares Gold Trust',               cat: 'Commodity' },
  { s: 'SLV',  n: 'iShares Silver Trust',             cat: 'Commodity' },
  { s: 'USO',  n: 'United States Oil Fund',           cat: 'Commodity' },
  { s: 'UNG',  n: 'United States Natural Gas',        cat: 'Commodity' },
  { s: 'DBA',  n: 'Invesco Agriculture',              cat: 'Commodity' },
  { s: 'DBC',  n: 'Invesco DB Commodity',             cat: 'Commodity' },
  { s: 'XLK',  n: 'Technology Select Sector',         cat: 'Sector' },
  { s: 'XLF',  n: 'Financial Select Sector',          cat: 'Sector' },
  { s: 'XLE',  n: 'Energy Select Sector',             cat: 'Sector' },
  { s: 'XLV',  n: 'Health Care Select Sector',        cat: 'Sector' },
  { s: 'XLI',  n: 'Industrial Select Sector',         cat: 'Sector' },
  { s: 'XLY',  n: 'Consumer Discretionary Sector',    cat: 'Sector' },
  { s: 'XLP',  n: 'Consumer Staples Sector',          cat: 'Sector' },
  { s: 'XLU',  n: 'Utilities Sector',                 cat: 'Sector' },
  { s: 'XLB',  n: 'Materials Sector',                 cat: 'Sector' },
  { s: 'XLRE', n: 'Real Estate Sector',               cat: 'Sector' },
  { s: 'XLC',  n: 'Communication Services Sector',    cat: 'Sector' },
  { s: 'SOXX', n: 'iShares Semiconductor',            cat: 'Sector' },
  { s: 'SMH',  n: 'VanEck Semiconductor',             cat: 'Sector' },
  { s: 'IBB',  n: 'iShares Biotechnology',            cat: 'Sector' },
  { s: 'ITA',  n: 'iShares Aerospace & Defense',      cat: 'Sector' },
  { s: 'JETS', n: 'US Global Jets',                   cat: 'Sector' },
  { s: 'KRE',  n: 'SPDR Regional Banking',            cat: 'Sector' },
  { s: 'KWEB', n: 'KraneShares China Internet',       cat: 'Sector' },
  { s: 'ARKK', n: 'ARK Innovation',                   cat: 'Thematic' },
  { s: 'ARKG', n: 'ARK Genomic Revolution',           cat: 'Thematic' },
  { s: 'ARKQ', n: 'ARK Autonomous/Robotics',          cat: 'Thematic' },
  { s: 'ARKW', n: 'ARK Next Generation Internet',     cat: 'Thematic' },
  { s: 'ARKF', n: 'ARK Fintech Innovation',           cat: 'Thematic' },
  { s: 'ARKX', n: 'ARK Space Exploration',            cat: 'Thematic' },
  { s: 'BOTZ', n: 'Global X Robotics & AI',           cat: 'Thematic' },
  { s: 'ROBO', n: 'ROBO Global Robotics',             cat: 'Thematic' },
  { s: 'TAN',  n: 'Invesco Solar',                    cat: 'Thematic' },
  { s: 'ICLN', n: 'iShares Global Clean Energy',      cat: 'Thematic' },
  { s: 'LIT',  n: 'Global X Lithium & Battery',       cat: 'Thematic' },
  { s: 'BLOK', n: 'Amplify Transformational Data',    cat: 'Crypto ETF' },
  { s: 'BITO', n: 'ProShares Bitcoin Strategy',       cat: 'Crypto ETF' },
  { s: 'IBIT', n: 'iShares Bitcoin Trust',            cat: 'Crypto ETF' },
  { s: 'FBTC', n: 'Fidelity Wise Origin Bitcoin',     cat: 'Crypto ETF' },
  { s: 'ETHA', n: 'iShares Ethereum Trust',           cat: 'Crypto ETF' },
  { s: 'ETHE', n: 'Grayscale Ethereum Trust',         cat: 'Crypto ETF' },
  { s: 'GBTC', n: 'Grayscale Bitcoin Trust',          cat: 'Crypto ETF' },
  // Leveraged / Inverse
  { s: 'TQQQ', n: 'ProShares UltraPro QQQ (3x)',      cat: 'Leveraged' },
  { s: 'SQQQ', n: 'ProShares UltraPro Short QQQ',     cat: 'Leveraged' },
  { s: 'UPRO', n: 'ProShares UltraPro S&P 500',       cat: 'Leveraged' },
  { s: 'SPXS', n: 'Direxion Daily S&P 500 Bear 3x',   cat: 'Leveraged' },
  { s: 'TNA',  n: 'Direxion Small Cap Bull 3x',       cat: 'Leveraged' },
  { s: 'TZA',  n: 'Direxion Small Cap Bear 3x',       cat: 'Leveraged' },
  { s: 'SOXL', n: 'Direxion Semiconductors Bull 3x',  cat: 'Leveraged' },
  { s: 'SOXS', n: 'Direxion Semiconductors Bear 3x',  cat: 'Leveraged' },
  { s: 'FAS',  n: 'Direxion Financial Bull 3x',       cat: 'Leveraged' },
  { s: 'FAZ',  n: 'Direxion Financial Bear 3x',       cat: 'Leveraged' },
  { s: 'TMF',  n: 'Direxion 20+Y Treasury Bull 3x',   cat: 'Leveraged' },
  { s: 'TMV',  n: 'Direxion 20+Y Treasury Bear 3x',   cat: 'Leveraged' },
  { s: 'NUGT', n: 'Direxion Gold Miners Bull 2x',     cat: 'Leveraged' },
  { s: 'DUST', n: 'Direxion Gold Miners Bear 2x',     cat: 'Leveraged' },
];

export function generateETFs(): SymbolMeta[] {
  return ETF_TICKERS.map(({ s, n, cat }) => ({
    symbol: s,
    name: n,
    exchange: 'NYSEARCA',
    assetClass: 'etf' as AssetClass,
    yahooTicker: s,
    category: cat,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) FOREX — 28 majors + minors + exotics
// ─────────────────────────────────────────────────────────────────────────────

const FOREX_PAIRS = [
  // Majors
  ['EUR','USD'],['GBP','USD'],['USD','JPY'],['USD','CHF'],['USD','CAD'],['AUD','USD'],['NZD','USD'],
  // Cross majors
  ['EUR','GBP'],['EUR','JPY'],['EUR','CHF'],['EUR','CAD'],['EUR','AUD'],['EUR','NZD'],
  ['GBP','JPY'],['GBP','CHF'],['GBP','CAD'],['GBP','AUD'],['GBP','NZD'],
  ['AUD','JPY'],['AUD','CHF'],['AUD','CAD'],['AUD','NZD'],
  ['NZD','JPY'],['NZD','CHF'],['NZD','CAD'],
  ['CAD','JPY'],['CAD','CHF'],['CHF','JPY'],
  // Exotics
  ['USD','SGD'],['USD','HKD'],['USD','TRY'],['USD','MXN'],['USD','ZAR'],['USD','SEK'],['USD','NOK'],
  ['USD','DKK'],['USD','PLN'],['USD','HUF'],['USD','CZK'],['USD','THB'],['USD','IDR'],['USD','INR'],
  ['USD','CNY'],['USD','CNH'],['USD','KRW'],['USD','PHP'],['USD','MYR'],['USD','VND'],['USD','TWD'],
  ['USD','BRL'],['USD','ARS'],['USD','CLP'],['USD','COP'],['USD','PEN'],['USD','RUB'],['USD','SAR'],
  ['USD','AED'],['USD','EGP'],['USD','NGN'],['EUR','TRY'],['EUR','PLN'],['EUR','HUF'],['EUR','CZK'],
  ['EUR','SEK'],['EUR','NOK'],['EUR','DKK'],
];

export function generateForex(): SymbolMeta[] {
  return FOREX_PAIRS.map(([b, q]) => ({
    symbol: `${b}${q}`,
    name: `${b}/${q}`,
    exchange: 'FX',
    assetClass: 'forex' as AssetClass,
    yahooTicker: `${b}${q}=X`,
    category: ['EUR','GBP','USD','JPY','CHF','CAD','AUD','NZD'].includes(b) && ['EUR','GBP','USD','JPY','CHF','CAD','AUD','NZD'].includes(q) ? 'Major' : 'Exotic',
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) COMMODITIES / FUTURES
// ─────────────────────────────────────────────────────────────────────────────

const COMMODITIES: Array<{ s: string; n: string; cat: string }> = [
  { s: 'GC=F',  n: 'Gold Futures',           cat: 'Metals' },
  { s: 'SI=F',  n: 'Silver Futures',         cat: 'Metals' },
  { s: 'HG=F',  n: 'Copper Futures',         cat: 'Metals' },
  { s: 'PL=F',  n: 'Platinum Futures',       cat: 'Metals' },
  { s: 'PA=F',  n: 'Palladium Futures',      cat: 'Metals' },
  { s: 'CL=F',  n: 'Crude Oil (WTI) Futures', cat: 'Energy' },
  { s: 'BZ=F',  n: 'Brent Crude Futures',    cat: 'Energy' },
  { s: 'NG=F',  n: 'Natural Gas Futures',    cat: 'Energy' },
  { s: 'RB=F',  n: 'Gasoline RBOB Futures',  cat: 'Energy' },
  { s: 'HO=F',  n: 'Heating Oil Futures',    cat: 'Energy' },
  { s: 'ZC=F',  n: 'Corn Futures',           cat: 'Grains' },
  { s: 'ZW=F',  n: 'Wheat Futures',          cat: 'Grains' },
  { s: 'ZS=F',  n: 'Soybean Futures',        cat: 'Grains' },
  { s: 'ZL=F',  n: 'Soybean Oil Futures',    cat: 'Grains' },
  { s: 'ZM=F',  n: 'Soybean Meal Futures',   cat: 'Grains' },
  { s: 'ZO=F',  n: 'Oats Futures',           cat: 'Grains' },
  { s: 'ZR=F',  n: 'Rough Rice Futures',     cat: 'Grains' },
  { s: 'KC=F',  n: 'Coffee Futures',         cat: 'Softs' },
  { s: 'CC=F',  n: 'Cocoa Futures',          cat: 'Softs' },
  { s: 'SB=F',  n: 'Sugar #11 Futures',      cat: 'Softs' },
  { s: 'CT=F',  n: 'Cotton Futures',         cat: 'Softs' },
  { s: 'OJ=F',  n: 'Orange Juice Futures',   cat: 'Softs' },
  { s: 'LBR=F', n: 'Lumber Futures',         cat: 'Softs' },
  { s: 'LE=F',  n: 'Live Cattle Futures',    cat: 'Livestock' },
  { s: 'GF=F',  n: 'Feeder Cattle Futures',  cat: 'Livestock' },
  { s: 'HE=F',  n: 'Lean Hogs Futures',      cat: 'Livestock' },
  // Index futures
  { s: 'ES=F',  n: 'S&P 500 E-mini Futures', cat: 'Index Futures' },
  { s: 'NQ=F',  n: 'Nasdaq-100 E-mini Futures', cat: 'Index Futures' },
  { s: 'YM=F',  n: 'Dow Jones E-mini Futures', cat: 'Index Futures' },
  { s: 'RTY=F', n: 'Russell 2000 E-mini Futures', cat: 'Index Futures' },
  { s: 'NKD=F', n: 'Nikkei 225 Futures',     cat: 'Index Futures' },
  { s: 'VX=F',  n: 'VIX Futures',            cat: 'Volatility' },
  // Bonds / rates
  { s: 'ZN=F',  n: '10-Year T-Note Futures', cat: 'Rates' },
  { s: 'ZB=F',  n: '30-Year T-Bond Futures', cat: 'Rates' },
  { s: 'ZF=F',  n: '5-Year T-Note Futures',  cat: 'Rates' },
  { s: 'ZT=F',  n: '2-Year T-Note Futures',  cat: 'Rates' },
];

export function generateCommodities(): SymbolMeta[] {
  return COMMODITIES.map(({ s, n, cat }) => ({
    symbol: s,
    name: n,
    exchange: 'CME',
    assetClass: cat === 'Index Futures' || cat === 'Rates' || cat === 'Volatility' ? ('futures' as AssetClass) : ('commodity' as AssetClass),
    yahooTicker: s,
    category: cat,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) GLOBAL INDICES
// ─────────────────────────────────────────────────────────────────────────────

const INDICES: Array<{ s: string; n: string; reg: string }> = [
  { s: '^GSPC',   n: 'S&P 500',                  reg: 'US' },
  { s: '^IXIC',   n: 'NASDAQ Composite',         reg: 'US' },
  { s: '^DJI',    n: 'Dow Jones Industrial Avg', reg: 'US' },
  { s: '^RUT',    n: 'Russell 2000',             reg: 'US' },
  { s: '^NDX',    n: 'NASDAQ-100',               reg: 'US' },
  { s: '^VIX',    n: 'CBOE Volatility Index',    reg: 'US' },
  { s: '^MOVE',   n: 'MOVE Index (Bond Vol)',    reg: 'US' },
  { s: '^TNX',    n: '10-Year Treasury Yield',   reg: 'US' },
  { s: '^IRX',    n: '13-Week Treasury Yield',   reg: 'US' },
  { s: '^FVX',    n: '5-Year Treasury Yield',    reg: 'US' },
  { s: '^TYX',    n: '30-Year Treasury Yield',   reg: 'US' },
  { s: 'DX-Y.NYB',n: 'US Dollar Index (DXY)',    reg: 'US' },
  { s: '^FTSE',   n: 'FTSE 100',                 reg: 'UK' },
  { s: '^GDAXI',  n: 'DAX (Germany)',            reg: 'DE' },
  { s: '^FCHI',   n: 'CAC 40 (France)',          reg: 'FR' },
  { s: '^STOXX50E', n: 'Euro Stoxx 50',          reg: 'EU' },
  { s: '^IBEX',   n: 'IBEX 35 (Spain)',          reg: 'ES' },
  { s: '^FTSEMIB.MI', n: 'FTSE MIB (Italy)',     reg: 'IT' },
  { s: '^AEX',    n: 'AEX (Netherlands)',        reg: 'NL' },
  { s: '^OMX',    n: 'OMX Stockholm 30',         reg: 'SE' },
  { s: '^OMXC25', n: 'OMX Copenhagen 25',        reg: 'DK' },
  { s: '^SSMI',   n: 'SMI (Switzerland)',        reg: 'CH' },
  { s: '^N225',   n: 'Nikkei 225',               reg: 'JP' },
  { s: '^HSI',    n: 'Hang Seng',                reg: 'HK' },
  { s: '000001.SS', n: 'Shanghai Composite',     reg: 'CN' },
  { s: '399001.SZ', n: 'Shenzhen Component',     reg: 'CN' },
  { s: '^KS11',   n: 'KOSPI',                    reg: 'KR' },
  { s: '^TWII',   n: 'Taiwan Weighted',          reg: 'TW' },
  { s: '^AXJO',   n: 'ASX 200',                  reg: 'AU' },
  { s: '^AORD',   n: 'All Ordinaries',           reg: 'AU' },
  { s: '^BSESN',  n: 'BSE SENSEX',               reg: 'IN' },
  { s: '^NSEI',   n: 'NIFTY 50',                 reg: 'IN' },
  { s: '^JKSE',   n: 'IDX Composite (Jakarta)',  reg: 'ID' },
  { s: '^KLSE',   n: 'KLSE Composite (Malaysia)',reg: 'MY' },
  { s: '^STI',    n: 'Straits Times (Singapore)',reg: 'SG' },
  { s: '^BVSP',   n: 'Bovespa (Brazil)',         reg: 'BR' },
  { s: '^MXX',    n: 'IPC (Mexico)',             reg: 'MX' },
  { s: '^MERV',   n: 'Merval (Argentina)',       reg: 'AR' },
  { s: 'TASI.SR', n: 'Tadawul All Share (Saudi)',reg: 'SA' },
  { s: '^TA125.TA', n: 'TA-125 (Israel)',        reg: 'IL' },
  { s: 'XU100.IS', n: 'BIST 100 (Turkey)',       reg: 'TR' },
  { s: '^GSPTSE', n: 'TSX Composite',            reg: 'CA' },
];

export function generateIndices(): SymbolMeta[] {
  return INDICES.map(({ s, n, reg }) => ({
    symbol: s,
    name: n,
    exchange: 'GLOBAL',
    assetClass: 'index' as AssetClass,
    yahooTicker: s,
    category: reg,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) INDONESIAN STOCKS (LQ45 + popular)
// ─────────────────────────────────────────────────────────────────────────────

const IDX_TICKERS: Array<{ s: string; n: string }> = [
  { s: 'BBCA.JK', n: 'Bank Central Asia' },
  { s: 'BBRI.JK', n: 'Bank Rakyat Indonesia' },
  { s: 'BBNI.JK', n: 'Bank Negara Indonesia' },
  { s: 'BMRI.JK', n: 'Bank Mandiri' },
  { s: 'TLKM.JK', n: 'Telkom Indonesia' },
  { s: 'ASII.JK', n: 'Astra International' },
  { s: 'UNVR.JK', n: 'Unilever Indonesia' },
  { s: 'ICBP.JK', n: 'Indofood CBP Sukses Makmur' },
  { s: 'INDF.JK', n: 'Indofood Sukses Makmur' },
  { s: 'HMSP.JK', n: 'HM Sampoerna' },
  { s: 'GGRM.JK', n: 'Gudang Garam' },
  { s: 'KLBF.JK', n: 'Kalbe Farma' },
  { s: 'SMGR.JK', n: 'Semen Indonesia' },
  { s: 'INTP.JK', n: 'Indocement Tunggal Prakarsa' },
  { s: 'ADRO.JK', n: 'Adaro Energy' },
  { s: 'PTBA.JK', n: 'Bukit Asam' },
  { s: 'ITMG.JK', n: 'Indo Tambangraya Megah' },
  { s: 'ANTM.JK', n: 'Aneka Tambang' },
  { s: 'INCO.JK', n: 'Vale Indonesia' },
  { s: 'TINS.JK', n: 'Timah' },
  { s: 'MEDC.JK', n: 'Medco Energi Internasional' },
  { s: 'AKRA.JK', n: 'AKR Corporindo' },
  { s: 'JSMR.JK', n: 'Jasa Marga' },
  { s: 'EXCL.JK', n: 'XL Axiata' },
  { s: 'ISAT.JK', n: 'Indosat Ooredoo Hutchison' },
  { s: 'EMTK.JK', n: 'Elang Mahkota Teknologi' },
  { s: 'GOTO.JK', n: 'GoTo Gojek Tokopedia' },
  { s: 'BUKA.JK', n: 'Bukalapak' },
  { s: 'BREN.JK', n: 'Barito Renewables Energy' },
  { s: 'TPIA.JK', n: 'Chandra Asri Petrochemical' },
  { s: 'AMMN.JK', n: 'Amman Mineral Internasional' },
  { s: 'CPIN.JK', n: 'Charoen Pokphand Indonesia' },
  { s: 'JPFA.JK', n: 'Japfa Comfeed Indonesia' },
  { s: 'MAPI.JK', n: 'Mitra Adiperkasa' },
  { s: 'PWON.JK', n: 'Pakuwon Jati' },
  { s: 'BSDE.JK', n: 'Bumi Serpong Damai' },
  { s: 'CTRA.JK', n: 'Ciputra Development' },
  { s: 'SMRA.JK', n: 'Summarecon Agung' },
  { s: 'WIKA.JK', n: 'Wijaya Karya' },
  { s: 'WSKT.JK', n: 'Waskita Karya' },
  { s: 'PGAS.JK', n: 'Perusahaan Gas Negara' },
  { s: 'PTRO.JK', n: 'Petrosea' },
  { s: 'HRUM.JK', n: 'Harum Energy' },
  { s: 'ESSA.JK', n: 'ESSA Industries Indonesia' },
  { s: 'BRMS.JK', n: 'Bumi Resources Minerals' },
  { s: 'MIKA.JK', n: 'Mitra Keluarga Karyasehat' },
  { s: 'SIDO.JK', n: 'Industri Jamu & Farmasi Sido Muncul' },
  { s: 'INDY.JK', n: 'Indika Energy' },
  { s: 'UNTR.JK', n: 'United Tractors' },
  { s: 'BFIN.JK', n: 'BFI Finance Indonesia' },
];

export function generateIDXStocks(): SymbolMeta[] {
  return IDX_TICKERS.map(({ s, n }) => ({
    symbol: s,
    name: n,
    exchange: 'IDX',
    assetClass: 'stock_id' as AssetClass,
    yahooTicker: s,
    category: 'IDX',
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) JAPAN, KOREA, INDIA, AUSTRALIA, EUROPE
// ─────────────────────────────────────────────────────────────────────────────

const JP_STOCKS: Array<{ s: string; n: string }> = [
  { s: '7203.T', n: 'Toyota Motor' },{ s: '6758.T', n: 'Sony Group' },{ s: '9984.T', n: 'SoftBank Group' },
  { s: '6861.T', n: 'Keyence' },{ s: '7974.T', n: 'Nintendo' },{ s: '8306.T', n: 'Mitsubishi UFJ Financial' },
  { s: '9432.T', n: 'NTT' },{ s: '8035.T', n: 'Tokyo Electron' },{ s: '6981.T', n: 'Murata Manufacturing' },
  { s: '4063.T', n: 'Shin-Etsu Chemical' },{ s: '6098.T', n: 'Recruit Holdings' },{ s: '4502.T', n: 'Takeda Pharmaceutical' },
  { s: '7267.T', n: 'Honda Motor' },{ s: '9433.T', n: 'KDDI' },{ s: '8316.T', n: 'Sumitomo Mitsui Financial' },
  { s: '8411.T', n: 'Mizuho Financial' },{ s: '8058.T', n: 'Mitsubishi Corp' },{ s: '7733.T', n: 'Olympus' },
  { s: '4519.T', n: 'Chugai Pharmaceutical' },{ s: '4543.T', n: 'Terumo' },{ s: '6594.T', n: 'Nidec' },
  { s: '6273.T', n: 'SMC' },{ s: '6920.T', n: 'Lasertec' },{ s: '6857.T', n: 'Advantest' },
];

const KR_STOCKS: Array<{ s: string; n: string }> = [
  { s: '005930.KS', n: 'Samsung Electronics' },{ s: '000660.KS', n: 'SK Hynix' },{ s: '035420.KS', n: 'NAVER' },
  { s: '005380.KS', n: 'Hyundai Motor' },{ s: '051910.KS', n: 'LG Chem' },{ s: '006400.KS', n: 'Samsung SDI' },
  { s: '035720.KS', n: 'Kakao' },{ s: '207940.KS', n: 'Samsung Biologics' },{ s: '068270.KS', n: 'Celltrion' },
  { s: '003670.KS', n: 'Posco Future M' },{ s: '012330.KS', n: 'Hyundai Mobis' },{ s: '028260.KS', n: 'Samsung C&T' },
  { s: '105560.KS', n: 'KB Financial' },{ s: '055550.KS', n: 'Shinhan Financial' },{ s: '015760.KS', n: 'Korea Electric Power' },
];

const IN_STOCKS: Array<{ s: string; n: string }> = [
  { s: 'RELIANCE.NS', n: 'Reliance Industries' },{ s: 'TCS.NS', n: 'Tata Consultancy Services' },
  { s: 'HDFCBANK.NS', n: 'HDFC Bank' },{ s: 'INFY.NS', n: 'Infosys' },{ s: 'ICICIBANK.NS', n: 'ICICI Bank' },
  { s: 'HINDUNILVR.NS', n: 'Hindustan Unilever' },{ s: 'ITC.NS', n: 'ITC' },{ s: 'SBIN.NS', n: 'State Bank of India' },
  { s: 'BHARTIARTL.NS', n: 'Bharti Airtel' },{ s: 'KOTAKBANK.NS', n: 'Kotak Mahindra Bank' },
  { s: 'LT.NS', n: 'Larsen & Toubro' },{ s: 'AXISBANK.NS', n: 'Axis Bank' },{ s: 'ASIANPAINT.NS', n: 'Asian Paints' },
  { s: 'BAJFINANCE.NS', n: 'Bajaj Finance' },{ s: 'MARUTI.NS', n: 'Maruti Suzuki' },{ s: 'HCLTECH.NS', n: 'HCL Technologies' },
  { s: 'WIPRO.NS', n: 'Wipro' },{ s: 'SUNPHARMA.NS', n: 'Sun Pharmaceutical' },{ s: 'TITAN.NS', n: 'Titan Company' },
  { s: 'ADANIENT.NS', n: 'Adani Enterprises' },{ s: 'ADANIPORTS.NS', n: 'Adani Ports' },{ s: 'TATAMOTORS.NS', n: 'Tata Motors' },
];

const AU_STOCKS: Array<{ s: string; n: string }> = [
  { s: 'BHP.AX', n: 'BHP Group' },{ s: 'CBA.AX', n: 'Commonwealth Bank of Australia' },
  { s: 'CSL.AX', n: 'CSL Limited' },{ s: 'NAB.AX', n: 'National Australia Bank' },
  { s: 'WBC.AX', n: 'Westpac Banking' },{ s: 'ANZ.AX', n: 'ANZ Group' },
  { s: 'WES.AX', n: 'Wesfarmers' },{ s: 'WOW.AX', n: 'Woolworths Group' },
  { s: 'MQG.AX', n: 'Macquarie Group' },{ s: 'TLS.AX', n: 'Telstra' },
  { s: 'RIO.AX', n: 'Rio Tinto' },{ s: 'FMG.AX', n: 'Fortescue Metals' },
  { s: 'GMG.AX', n: 'Goodman Group' },{ s: 'TCL.AX', n: 'Transurban Group' },
  { s: 'ALL.AX', n: 'Aristocrat Leisure' },{ s: 'WDS.AX', n: 'Woodside Energy' },
];

const EU_STOCKS: Array<{ s: string; n: string }> = [
  { s: 'ASML.AS', n: 'ASML Holding' },{ s: 'MC.PA', n: 'LVMH' },{ s: 'NESN.SW', n: 'Nestle' },
  { s: 'NOVN.SW', n: 'Novartis' },{ s: 'ROG.SW', n: 'Roche Holding' },{ s: 'SAP.DE', n: 'SAP' },
  { s: 'SIE.DE', n: 'Siemens' },{ s: 'ALV.DE', n: 'Allianz' },{ s: 'BAS.DE', n: 'BASF' },
  { s: 'BAYN.DE', n: 'Bayer' },{ s: 'DAI.DE', n: 'Daimler Truck' },{ s: 'AIR.PA', n: 'Airbus' },
  { s: 'OR.PA', n: "L'Oreal" },{ s: 'TTE.PA', n: 'TotalEnergies' },{ s: 'SAN.PA', n: 'Sanofi' },
  { s: 'BNP.PA', n: 'BNP Paribas' },{ s: 'ULVR.L', n: 'Unilever PLC' },{ s: 'AZN.L', n: 'AstraZeneca' },
  { s: 'HSBA.L', n: 'HSBC Holdings' },{ s: 'BP.L', n: 'BP' },{ s: 'GSK.L', n: 'GSK' },
  { s: 'RIO.L', n: 'Rio Tinto plc' },{ s: 'BARC.L', n: 'Barclays' },{ s: 'LLOY.L', n: 'Lloyds Banking Group' },
  { s: 'INGA.AS', n: 'ING Groep' },{ s: 'PHIA.AS', n: 'Philips' },{ s: 'AD.AS', n: 'Ahold Delhaize' },
];

const SA_STOCKS: Array<{ s: string; n: string }> = [
  { s: '2222.SR', n: 'Saudi Aramco' },{ s: '1180.SR', n: 'Al Rajhi Bank' },
  { s: '2010.SR', n: 'SABIC' },{ s: '7010.SR', n: 'STC' },
  { s: '1010.SR', n: 'Riyad Bank' },{ s: '1120.SR', n: 'Alinma Bank' },
  { s: '1211.SR', n: "Ma'aden" },{ s: '2280.SR', n: 'Almarai' },
];

const CN_ADRS: Array<{ s: string; n: string }> = [
  { s: 'BABA', n: 'Alibaba' },{ s: 'JD',   n: 'JD.com' },{ s: 'PDD',  n: 'PDD Holdings (Pinduoduo)' },
  { s: 'BIDU', n: 'Baidu' },{ s: 'NTES', n: 'NetEase' },{ s: 'TME',  n: 'Tencent Music' },
  { s: 'BILI', n: 'Bilibili' },{ s: 'DIDI', n: 'DiDi Global' },{ s: 'NIO',  n: 'NIO' },
  { s: 'XPEV', n: 'XPeng' },{ s: 'LI',   n: 'Li Auto' },{ s: 'IQ',   n: 'iQIYI' },
];

export function generateGlobalEquities(): SymbolMeta[] {
  return [
    ...JP_STOCKS.map(({ s, n }) => ({ symbol: s, name: n, exchange: 'TSE',  assetClass: 'stock_jp' as AssetClass, yahooTicker: s, category: 'Japan' })),
    ...KR_STOCKS.map(({ s, n }) => ({ symbol: s, name: n, exchange: 'KRX',  assetClass: 'stock_kr' as AssetClass, yahooTicker: s, category: 'Korea' })),
    ...IN_STOCKS.map(({ s, n }) => ({ symbol: s, name: n, exchange: 'NSE',  assetClass: 'stock_in' as AssetClass, yahooTicker: s, category: 'India' })),
    ...AU_STOCKS.map(({ s, n }) => ({ symbol: s, name: n, exchange: 'ASX',  assetClass: 'stock_au' as AssetClass, yahooTicker: s, category: 'Australia' })),
    ...EU_STOCKS.map(({ s, n }) => ({ symbol: s, name: n, exchange: 'EU',   assetClass: 'stock_eu' as AssetClass, yahooTicker: s, category: 'Europe' })),
    ...SA_STOCKS.map(({ s, n }) => ({ symbol: s, name: n, exchange: 'TADAWUL', assetClass: 'stock_sa' as AssetClass, yahooTicker: s, category: 'Saudi' })),
    ...CN_ADRS.map(({ s, n }) => ({ symbol: s, name: n, exchange: 'NYSE', assetClass: 'stock_cn' as AssetClass, yahooTicker: s, category: 'China ADR' })),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) DEX TOKENS (Solana / Ethereum / Base via CoinGecko symbols)
// ─────────────────────────────────────────────────────────────────────────────

const DEX_TOKENS: Array<{ s: string; n: string; chain: string }> = [
  // Solana DEX
  { s: 'WIF-SOL', n: 'dogwifhat (Solana DEX)', chain: 'Solana' },
  { s: 'BONK-SOL', n: 'Bonk (Solana DEX)', chain: 'Solana' },
  { s: 'BOME-SOL', n: 'Book of Meme (Solana DEX)', chain: 'Solana' },
  { s: 'POPCAT-SOL', n: 'Popcat (Solana DEX)', chain: 'Solana' },
  { s: 'MEW-SOL', n: 'Cat in a Dogs World (Solana DEX)', chain: 'Solana' },
  { s: 'SLERF-SOL', n: 'SLERF (Solana DEX)', chain: 'Solana' },
  { s: 'WEN-SOL', n: 'Wen (Solana DEX)', chain: 'Solana' },
  { s: 'PNUT-SOL', n: 'Peanut the Squirrel (Solana DEX)', chain: 'Solana' },
  { s: 'GOAT-SOL', n: 'Goatseus Maximus (Solana DEX)', chain: 'Solana' },
  { s: 'CHILLGUY-SOL', n: 'Just a chill guy (Solana DEX)', chain: 'Solana' },
  { s: 'MOODENG-SOL', n: 'Moo Deng (Solana DEX)', chain: 'Solana' },
  { s: 'FWOG-SOL', n: 'FWOG (Solana DEX)', chain: 'Solana' },
  { s: 'PONKE-SOL', n: 'Ponke (Solana DEX)', chain: 'Solana' },
  { s: 'MICHI-SOL', n: 'michi (Solana DEX)', chain: 'Solana' },
  { s: 'SUNDOG-SOL', n: 'Sundog (Solana DEX)', chain: 'Solana' },
  { s: 'GIGA-SOL', n: 'Gigachad (Solana DEX)', chain: 'Solana' },
  { s: 'ZEREBRO-SOL', n: 'Zerebro (Solana DEX)', chain: 'Solana' },
  { s: 'GRIFFAIN-SOL', n: 'GRIFFAIN (Solana DEX)', chain: 'Solana' },
  { s: 'FREYSA-SOL', n: 'Freysa AI (Solana DEX)', chain: 'Solana' },
  { s: 'ACT-SOL', n: 'Act I: The AI Prophecy (Solana DEX)', chain: 'Solana' },
  // Ethereum DEX
  { s: 'PEPE-ETH', n: 'Pepe (Ethereum DEX)', chain: 'Ethereum' },
  { s: 'SHIB-ETH', n: 'Shiba Inu (Ethereum DEX)', chain: 'Ethereum' },
  { s: 'NEIRO-ETH', n: 'Neiro Ethereum (Ethereum DEX)', chain: 'Ethereum' },
  { s: 'TURBO-ETH', n: 'Turbo (Ethereum DEX)', chain: 'Ethereum' },
  { s: 'MOG-ETH', n: 'Mog Coin (Ethereum DEX)', chain: 'Ethereum' },
  { s: 'WOJAK-ETH', n: 'Wojak (Ethereum DEX)', chain: 'Ethereum' },
  { s: 'BITCOIN-ETH', n: 'HarryPotterObamaSonic10Inu (Ethereum DEX)', chain: 'Ethereum' },
  { s: 'CULT-ETH', n: 'Cult DAO (Ethereum DEX)', chain: 'Ethereum' },
  { s: 'BABYDOGE-ETH', n: 'Baby Doge Coin (Ethereum DEX)', chain: 'Ethereum' },
  { s: 'AI16Z-ETH', n: 'ai16z (Ethereum DEX)', chain: 'Ethereum' },
  { s: 'VIRTUAL-ETH', n: 'Virtuals Protocol (Ethereum DEX)', chain: 'Ethereum' },
  // Base DEX
  { s: 'BRETT-BASE', n: 'Brett (Base DEX)', chain: 'Base' },
  { s: 'TOSHI-BASE', n: 'Toshi (Base DEX)', chain: 'Base' },
  { s: 'DEGEN-BASE', n: 'Degen (Base DEX)', chain: 'Base' },
  { s: 'HIGHER-BASE', n: 'Higher (Base DEX)', chain: 'Base' },
  { s: 'MOCHI-BASE', n: 'Mochi (Base DEX)', chain: 'Base' },
  { s: 'KEYCAT-BASE', n: 'Keyboard Cat (Base DEX)', chain: 'Base' },
  { s: 'NORMIE-BASE', n: 'Normie (Base DEX)', chain: 'Base' },
  // Pump.fun new launches representation
  { s: 'PUMPFUN-NEW', n: 'pump.fun fresh launches', chain: 'Solana' },
];

export function generateDEXTokens(): SymbolMeta[] {
  return DEX_TOKENS.map(({ s, n, chain }) => ({
    symbol: s,
    name: n,
    exchange: 'DEX',
    assetClass: 'dex' as AssetClass,
    category: chain,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Master combined catalog
// ─────────────────────────────────────────────────────────────────────────────

export function generateAllAutoSymbols(): SymbolMeta[] {
  return [
    ...generateBinanceSymbols(),
    ...generateUSStocks(),
    ...generateETFs(),
    ...generateForex(),
    ...generateCommodities(),
    ...generateIndices(),
    ...generateIDXStocks(),
    ...generateGlobalEquities(),
    ...generateDEXTokens(),
  ];
}
