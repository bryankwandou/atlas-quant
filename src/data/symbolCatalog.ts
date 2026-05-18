export type AssetClass =
  | 'crypto'
  | 'stock_us'
  | 'stock_cn'
  | 'stock_id'
  | 'stock_eu'
  | 'stock_sa'
  | 'stock_jp'
  | 'stock_kr'
  | 'stock_au'
  | 'stock_in'
  | 'index'
  | 'commodity'
  | 'futures'
  | 'forex'
  | 'memecoin'
  | 'dex'
  | 'etf';

export interface SymbolMeta {
  symbol: string;
  name: string;
  exchange: string;
  assetClass: AssetClass;
  yahooTicker?: string;
  binancePair?: string;
  dexAddress?: string;
  category?: string;
}

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  crypto: 'Crypto',
  stock_us: 'US Stocks',
  stock_cn: 'Chinese Stocks',
  stock_id: 'Indonesian Stocks',
  stock_eu: 'European Stocks',
  stock_sa: 'Saudi/Arab Stocks',
  stock_jp: 'Japan Stocks',
  stock_kr: 'Korea Stocks',
  stock_au: 'Australia Stocks',
  stock_in: 'India Stocks',
  index: 'Global Indices',
  commodity: 'Commodities',
  futures: 'Futures',
  forex: 'Forex',
  memecoin: 'Memecoins',
  dex: 'DEX Tokens',
  etf: 'ETFs',
};

export const SYMBOL_CATALOG: SymbolMeta[] = [
  // ─── CRYPTO (Binance) ───────────────────────────────────────────────────────
  { symbol: 'BTCUSDT',    name: 'Bitcoin',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'BTCUSDT',    category: 'Layer 1' },
  { symbol: 'ETHUSDT',    name: 'Ethereum',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ETHUSDT',    category: 'Layer 1' },
  { symbol: 'BNBUSDT',    name: 'BNB',                exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'BNBUSDT',    category: 'Exchange Token' },
  { symbol: 'SOLUSDT',    name: 'Solana',             exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'SOLUSDT',    category: 'Layer 1' },
  { symbol: 'ADAUSDT',    name: 'Cardano',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ADAUSDT',    category: 'Layer 1' },
  { symbol: 'XRPUSDT',    name: 'XRP',                exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'XRPUSDT',    category: 'Payments' },
  { symbol: 'DOTUSDT',    name: 'Polkadot',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'DOTUSDT',    category: 'Layer 0' },
  { symbol: 'LINKUSDT',   name: 'Chainlink',          exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'LINKUSDT',   category: 'Oracle' },
  { symbol: 'AVAXUSDT',   name: 'Avalanche',          exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'AVAXUSDT',   category: 'Layer 1' },
  { symbol: 'MATICUSDT',  name: 'Polygon',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'MATICUSDT',  category: 'Layer 2' },
  { symbol: 'ATOMUSDT',   name: 'Cosmos',             exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ATOMUSDT',   category: 'Layer 0' },
  { symbol: 'LTCUSDT',    name: 'Litecoin',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'LTCUSDT',    category: 'Payments' },
  { symbol: 'BCHUSDT',    name: 'Bitcoin Cash',       exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'BCHUSDT',    category: 'Payments' },
  { symbol: 'XLMUSDT',    name: 'Stellar',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'XLMUSDT',    category: 'Payments' },
  { symbol: 'VETUSDT',    name: 'VeChain',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'VETUSDT',    category: 'Supply Chain' },
  { symbol: 'FILUSDT',    name: 'Filecoin',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'FILUSDT',    category: 'Storage' },
  { symbol: 'TRXUSDT',    name: 'Tron',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'TRXUSDT',    category: 'Layer 1' },
  { symbol: 'ETCUSDT',    name: 'Ethereum Classic',   exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ETCUSDT',    category: 'Layer 1' },
  { symbol: 'AAVEUSDT',   name: 'Aave',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'AAVEUSDT',   category: 'DeFi' },
  { symbol: 'UNIUSDT',    name: 'Uniswap',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'UNIUSDT',    category: 'DeFi' },
  { symbol: 'SNXUSDT',    name: 'Synthetix',          exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'SNXUSDT',    category: 'DeFi' },
  { symbol: 'COMPUSDT',   name: 'Compound',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'COMPUSDT',   category: 'DeFi' },
  { symbol: 'MKRUSDT',    name: 'Maker',              exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'MKRUSDT',    category: 'DeFi' },
  { symbol: 'CRVUSDT',    name: 'Curve DAO',          exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'CRVUSDT',    category: 'DeFi' },
  { symbol: 'YFIUSDT',    name: 'Yearn Finance',      exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'YFIUSDT',    category: 'DeFi' },
  { symbol: 'SUSHIUSDT',  name: 'SushiSwap',          exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'SUSHIUSDT',  category: 'DeFi' },
  { symbol: '1INCHUSDT',  name: '1inch',              exchange: 'BINANCE', assetClass: 'crypto',   binancePair: '1INCHUSDT',  category: 'DeFi' },
  { symbol: 'ALGOUSDT',   name: 'Algorand',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ALGOUSDT',   category: 'Layer 1' },
  { symbol: 'NEARUSDT',   name: 'NEAR Protocol',      exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'NEARUSDT',   category: 'Layer 1' },
  { symbol: 'FTMUSDT',    name: 'Fantom',             exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'FTMUSDT',    category: 'Layer 1' },
  { symbol: 'SANDUSDT',   name: 'The Sandbox',        exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'SANDUSDT',   category: 'Metaverse' },
  { symbol: 'MANAUSDT',   name: 'Decentraland',       exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'MANAUSDT',   category: 'Metaverse' },
  { symbol: 'AXSUSDT',    name: 'Axie Infinity',      exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'AXSUSDT',    category: 'Gaming' },
  { symbol: 'GALAUSDT',   name: 'Gala',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'GALAUSDT',   category: 'Gaming' },
  { symbol: 'APEUSDT',    name: 'ApeCoin',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'APEUSDT',    category: 'Gaming' },
  { symbol: 'GMTUSDT',    name: 'STEPN',              exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'GMTUSDT',    category: 'Move-to-Earn' },
  { symbol: 'OPUSDT',     name: 'Optimism',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'OPUSDT',     category: 'Layer 2' },
  { symbol: 'ARBUSDT',    name: 'Arbitrum',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ARBUSDT',    category: 'Layer 2' },
  { symbol: 'INJUSDT',    name: 'Injective',          exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'INJUSDT',    category: 'DeFi' },
  { symbol: 'SUIUSDT',    name: 'Sui',                exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'SUIUSDT',    category: 'Layer 1' },
  { symbol: 'APTUSDT',    name: 'Aptos',              exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'APTUSDT',    category: 'Layer 1' },
  { symbol: 'TIAUSDT',    name: 'Celestia',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'TIAUSDT',    category: 'Modular' },
  { symbol: 'JUPUSDT',    name: 'Jupiter',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'JUPUSDT',    category: 'DeFi' },
  { symbol: 'WLDUSDT',    name: 'Worldcoin',          exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'WLDUSDT',    category: 'Identity' },
  { symbol: 'ENAUSDT',    name: 'Ethena',             exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ENAUSDT',    category: 'DeFi' },
  { symbol: 'FETUSDT',    name: 'Fetch.ai',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'FETUSDT',    category: 'AI' },
  { symbol: 'RENDERUSDT', name: 'Render',             exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'RENDERUSDT', category: 'AI' },
  { symbol: 'THETAUSDT',  name: 'Theta Network',      exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'THETAUSDT',  category: 'Streaming' },
  { symbol: 'STXUSDT',    name: 'Stacks',             exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'STXUSDT',    category: 'Bitcoin Layer 2' },
  { symbol: 'TONUSDT',    name: 'Toncoin',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'TONUSDT',    category: 'Layer 1' },

  // ─── MEMECOINS (Binance) ────────────────────────────────────────────────────
  { symbol: 'DOGEUSDT',   name: 'Dogecoin',           exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'DOGEUSDT',   category: 'OG Meme' },
  { symbol: 'SHIBUSDT',   name: 'Shiba Inu',          exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'SHIBUSDT',   category: 'OG Meme' },
  { symbol: 'PEPEUSDT',   name: 'Pepe',               exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'PEPEUSDT',   category: 'Frog' },
  { symbol: 'FLOKIUSDT',  name: 'Floki',              exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'FLOKIUSDT',  category: 'Dog' },
  { symbol: 'BONKUSDT',   name: 'Bonk',               exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'BONKUSDT',   category: 'Solana Meme' },
  { symbol: 'WIFUSDT',    name: 'dogwifhat',          exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'WIFUSDT',    category: 'Solana Meme' },
  { symbol: 'MEMEUSDT',   name: 'Memecoin',           exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'MEMEUSDT',   category: 'Meme' },
  { symbol: 'NEIROUSDT',  name: 'Neiro',              exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'NEIROUSDT',  category: 'Dog' },
  { symbol: 'POPCATUSDT', name: 'Popcat',             exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'POPCATUSDT', category: 'Cat' },
  { symbol: 'BOMEUSDT',   name: 'Book of Meme',       exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'BOMEUSDT',   category: 'Solana Meme' },
  { symbol: 'TURBOUSDT',  name: 'Turbo',              exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'TURBOUSDT',  category: 'Meme' },
  { symbol: 'MOGUSDT',    name: 'Mog Coin',           exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'MOGUSDT',    category: 'Meme' },

  // ─── GLOBAL INDICES (Yahoo Finance) ─────────────────────────────────────────
  { symbol: '^GSPC',      name: 'S&P 500',            exchange: 'NYSE',    assetClass: 'index',    yahooTicker: '^GSPC',      category: 'US' },
  { symbol: '^IXIC',      name: 'NASDAQ Composite',   exchange: 'NASDAQ',  assetClass: 'index',    yahooTicker: '^IXIC',      category: 'US' },
  { symbol: '^DJI',       name: 'Dow Jones',          exchange: 'NYSE',    assetClass: 'index',    yahooTicker: '^DJI',       category: 'US' },
  { symbol: '^RUT',       name: 'Russell 2000',       exchange: 'NYSE',    assetClass: 'index',    yahooTicker: '^RUT',       category: 'US' },
  { symbol: '^VIX',       name: 'CBOE Volatility Index', exchange: 'CBOE', assetClass: 'index',    yahooTicker: '^VIX',       category: 'Volatility' },
  { symbol: '^N225',      name: 'Nikkei 225',         exchange: 'TSE',     assetClass: 'index',    yahooTicker: '^N225',      category: 'Asia' },
  { symbol: '^HSI',       name: 'Hang Seng',          exchange: 'HKEX',    assetClass: 'index',    yahooTicker: '^HSI',       category: 'Asia' },
  { symbol: '^GDAXI',     name: 'DAX',                exchange: 'XETRA',   assetClass: 'index',    yahooTicker: '^GDAXI',     category: 'Europe' },
  { symbol: '^FTSE',      name: 'FTSE 100',           exchange: 'LSE',     assetClass: 'index',    yahooTicker: '^FTSE',      category: 'Europe' },
  { symbol: '^FCHI',      name: 'CAC 40',             exchange: 'EURONEXT',assetClass: 'index',    yahooTicker: '^FCHI',      category: 'Europe' },
  { symbol: '^STOXX50E',  name: 'Euro Stoxx 50',      exchange: 'EUREX',   assetClass: 'index',    yahooTicker: '^STOXX50E',  category: 'Europe' },
  { symbol: 'JKSE',       name: 'IDX Composite',      exchange: 'IDX',     assetClass: 'index',    yahooTicker: 'JKSE',       category: 'Southeast Asia' },
  { symbol: '^KLSE',      name: 'FTSE Bursa Malaysia', exchange: 'BURSA',  assetClass: 'index',    yahooTicker: '^KLSE',      category: 'Southeast Asia' },
  { symbol: '^BSESN',     name: 'BSE Sensex',         exchange: 'BSE',     assetClass: 'index',    yahooTicker: '^BSESN',     category: 'South Asia' },
  { symbol: '^NSEI',      name: 'Nifty 50',           exchange: 'NSE',     assetClass: 'index',    yahooTicker: '^NSEI',      category: 'South Asia' },
  { symbol: '^TWII',      name: 'Taiwan Weighted',    exchange: 'TWSE',    assetClass: 'index',    yahooTicker: '^TWII',      category: 'Asia' },
  { symbol: '^KS11',      name: 'KOSPI',              exchange: 'KRX',     assetClass: 'index',    yahooTicker: '^KS11',      category: 'Asia' },

  // ─── COMMODITIES (Yahoo Finance) ─────────────────────────────────────────────
  { symbol: 'GC=F',       name: 'Gold',               exchange: 'COMEX',   assetClass: 'commodity', yahooTicker: 'GC=F',      category: 'Precious Metal' },
  { symbol: 'SI=F',       name: 'Silver',             exchange: 'COMEX',   assetClass: 'commodity', yahooTicker: 'SI=F',      category: 'Precious Metal' },
  { symbol: 'CL=F',       name: 'WTI Crude Oil',      exchange: 'NYMEX',   assetClass: 'commodity', yahooTicker: 'CL=F',      category: 'Energy' },
  { symbol: 'BZ=F',       name: 'Brent Crude Oil',    exchange: 'ICE',     assetClass: 'commodity', yahooTicker: 'BZ=F',      category: 'Energy' },
  { symbol: 'NG=F',       name: 'Natural Gas',        exchange: 'NYMEX',   assetClass: 'commodity', yahooTicker: 'NG=F',      category: 'Energy' },
  { symbol: 'HG=F',       name: 'Copper',             exchange: 'COMEX',   assetClass: 'commodity', yahooTicker: 'HG=F',      category: 'Industrial Metal' },
  { symbol: 'ZW=F',       name: 'Wheat',              exchange: 'CBOT',    assetClass: 'commodity', yahooTicker: 'ZW=F',      category: 'Agricultural' },
  { symbol: 'ZC=F',       name: 'Corn',               exchange: 'CBOT',    assetClass: 'commodity', yahooTicker: 'ZC=F',      category: 'Agricultural' },
  { symbol: 'ZS=F',       name: 'Soybeans',           exchange: 'CBOT',    assetClass: 'commodity', yahooTicker: 'ZS=F',      category: 'Agricultural' },
  { symbol: 'PL=F',       name: 'Platinum',           exchange: 'NYMEX',   assetClass: 'commodity', yahooTicker: 'PL=F',      category: 'Precious Metal' },
  { symbol: 'PA=F',       name: 'Palladium',          exchange: 'NYMEX',   assetClass: 'commodity', yahooTicker: 'PA=F',      category: 'Precious Metal' },
  { symbol: 'KC=F',       name: 'Coffee',             exchange: 'ICE',     assetClass: 'commodity', yahooTicker: 'KC=F',      category: 'Soft' },
  { symbol: 'CC=F',       name: 'Cocoa',              exchange: 'ICE',     assetClass: 'commodity', yahooTicker: 'CC=F',      category: 'Soft' },
  { symbol: 'CT=F',       name: 'Cotton',             exchange: 'ICE',     assetClass: 'commodity', yahooTicker: 'CT=F',      category: 'Soft' },

  // ─── FUTURES (Yahoo Finance) ──────────────────────────────────────────────────
  { symbol: 'ES=F',       name: 'S&P 500 E-mini Futures', exchange: 'CME', assetClass: 'futures',  yahooTicker: 'ES=F',      category: 'Equity Index' },
  { symbol: 'NQ=F',       name: 'NASDAQ E-mini Futures',  exchange: 'CME', assetClass: 'futures',  yahooTicker: 'NQ=F',      category: 'Equity Index' },
  { symbol: 'YM=F',       name: 'DOW E-mini Futures',     exchange: 'CME', assetClass: 'futures',  yahooTicker: 'YM=F',      category: 'Equity Index' },
  { symbol: 'RTY=F',      name: 'Russell 2000 E-mini',    exchange: 'CME', assetClass: 'futures',  yahooTicker: 'RTY=F',     category: 'Equity Index' },

  // ─── FOREX (Yahoo Finance) ───────────────────────────────────────────────────
  { symbol: 'EURUSD=X',   name: 'EUR/USD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'EURUSD=X',   category: 'Major' },
  { symbol: 'GBPUSD=X',   name: 'GBP/USD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'GBPUSD=X',   category: 'Major' },
  { symbol: 'USDJPY=X',   name: 'USD/JPY',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDJPY=X',   category: 'Major' },
  { symbol: 'AUDUSD=X',   name: 'AUD/USD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'AUDUSD=X',   category: 'Major' },
  { symbol: 'USDCAD=X',   name: 'USD/CAD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDCAD=X',   category: 'Major' },
  { symbol: 'USDCHF=X',   name: 'USD/CHF',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDCHF=X',   category: 'Major' },
  { symbol: 'NZDUSD=X',   name: 'NZD/USD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'NZDUSD=X',   category: 'Major' },
  { symbol: 'USDIDR=X',   name: 'USD/IDR',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDIDR=X',   category: 'Emerging' },
  { symbol: 'USDSGD=X',   name: 'USD/SGD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDSGD=X',   category: 'Emerging' },
  { symbol: 'USDMYR=X',   name: 'USD/MYR',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDMYR=X',   category: 'Emerging' },
  { symbol: 'USDTHB=X',   name: 'USD/THB',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDTHB=X',   category: 'Emerging' },
  { symbol: 'USDPHP=X',   name: 'USD/PHP',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDPHP=X',   category: 'Emerging' },
  { symbol: 'GBPJPY=X',   name: 'GBP/JPY',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'GBPJPY=X',   category: 'Cross' },
  { symbol: 'EURJPY=X',   name: 'EUR/JPY',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'EURJPY=X',   category: 'Cross' },
  { symbol: 'AUDJPY=X',   name: 'AUD/JPY',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'AUDJPY=X',   category: 'Cross' },
  { symbol: 'EURGBP=X',   name: 'EUR/GBP',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'EURGBP=X',   category: 'Cross' },
  { symbol: 'USDCNY=X',   name: 'USD/CNY',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDCNY=X',   category: 'Emerging' },
  { symbol: 'USDHKD=X',   name: 'USD/HKD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDHKD=X',   category: 'Emerging' },
  { symbol: 'USDKRW=X',   name: 'USD/KRW',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDKRW=X',   category: 'Emerging' },
  { symbol: 'USDINR=X',   name: 'USD/INR',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDINR=X',   category: 'Emerging' },
  { symbol: 'USDSAR=X',   name: 'USD/SAR',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDSAR=X',   category: 'Emerging' },
  { symbol: 'USDAED=X',   name: 'USD/AED',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDAED=X',   category: 'Emerging' },
  { symbol: 'USDTRY=X',   name: 'USD/TRY',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDTRY=X',   category: 'Emerging' },
  { symbol: 'USDZAR=X',   name: 'USD/ZAR',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDZAR=X',   category: 'Emerging' },
  { symbol: 'USDBRL=X',   name: 'USD/BRL',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDBRL=X',   category: 'Emerging' },
  { symbol: 'USDMXN=X',   name: 'USD/MXN',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDMXN=X',   category: 'Emerging' },
  { symbol: 'USDPLN=X',   name: 'USD/PLN',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDPLN=X',   category: 'Emerging' },
  { symbol: 'USDSEK=X',   name: 'USD/SEK',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDSEK=X',   category: 'Scandinavian' },
  { symbol: 'USDNOK=X',   name: 'USD/NOK',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDNOK=X',   category: 'Scandinavian' },

  // ─── US STOCKS (Yahoo Finance) ──────────────────────────────────────────────
  { symbol: 'AAPL',       name: 'Apple Inc.',                 exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'AAPL',   category: 'Technology' },
  { symbol: 'MSFT',       name: 'Microsoft Corporation',      exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'MSFT',   category: 'Technology' },
  { symbol: 'NVDA',       name: 'NVIDIA Corporation',         exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'NVDA',   category: 'Semiconductors' },
  { symbol: 'AMZN',       name: 'Amazon.com Inc.',            exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'AMZN',   category: 'E-Commerce' },
  { symbol: 'GOOGL',      name: 'Alphabet Inc.',              exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'GOOGL',  category: 'Technology' },
  { symbol: 'META',       name: 'Meta Platforms Inc.',        exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'META',   category: 'Social Media' },
  { symbol: 'TSLA',       name: 'Tesla Inc.',                 exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'TSLA',   category: 'EV' },
  { symbol: 'BRK-B',      name: 'Berkshire Hathaway B',       exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'BRK-B',  category: 'Conglomerate' },
  { symbol: 'JPM',        name: 'JPMorgan Chase',             exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'JPM',    category: 'Banking' },
  { symbol: 'V',          name: 'Visa Inc.',                  exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'V',      category: 'Payments' },
  { symbol: 'MA',         name: 'Mastercard Inc.',            exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'MA',     category: 'Payments' },
  { symbol: 'UNH',        name: 'UnitedHealth Group',         exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'UNH',    category: 'Healthcare' },
  { symbol: 'XOM',        name: 'ExxonMobil Corporation',     exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'XOM',    category: 'Energy' },
  { symbol: 'JNJ',        name: 'Johnson & Johnson',          exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'JNJ',    category: 'Healthcare' },
  { symbol: 'WMT',        name: 'Walmart Inc.',               exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'WMT',    category: 'Retail' },
  { symbol: 'PG',         name: 'Procter & Gamble',           exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'PG',     category: 'Consumer Goods' },
  { symbol: 'AVGO',       name: 'Broadcom Inc.',              exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'AVGO',   category: 'Semiconductors' },
  { symbol: 'AMD',        name: 'Advanced Micro Devices',     exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'AMD',    category: 'Semiconductors' },
  { symbol: 'INTC',       name: 'Intel Corporation',          exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'INTC',   category: 'Semiconductors' },
  { symbol: 'CRM',        name: 'Salesforce Inc.',            exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'CRM',    category: 'SaaS' },
  { symbol: 'ORCL',       name: 'Oracle Corporation',         exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'ORCL',   category: 'Technology' },
  { symbol: 'NFLX',       name: 'Netflix Inc.',               exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'NFLX',   category: 'Streaming' },
  { symbol: 'DIS',        name: 'The Walt Disney Company',    exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'DIS',    category: 'Entertainment' },
  { symbol: 'BA',         name: 'Boeing Company',             exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'BA',     category: 'Aerospace' },
  { symbol: 'GS',         name: 'Goldman Sachs',              exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'GS',     category: 'Banking' },
  { symbol: 'MS',         name: 'Morgan Stanley',             exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'MS',     category: 'Banking' },
  { symbol: 'BAC',        name: 'Bank of America',            exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'BAC',    category: 'Banking' },
  { symbol: 'C',          name: 'Citigroup Inc.',             exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'C',      category: 'Banking' },
  { symbol: 'WFC',        name: 'Wells Fargo',                exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'WFC',    category: 'Banking' },
  { symbol: 'PYPL',       name: 'PayPal Holdings',            exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'PYPL',   category: 'Fintech' },
  { symbol: 'UBER',       name: 'Uber Technologies',          exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'UBER',   category: 'Mobility' },
  { symbol: 'LYFT',       name: 'Lyft Inc.',                  exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'LYFT',   category: 'Mobility' },
  { symbol: 'SNAP',       name: 'Snap Inc.',                  exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'SNAP',   category: 'Social Media' },
  { symbol: 'RBLX',       name: 'Roblox Corporation',         exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'RBLX',   category: 'Gaming' },
  { symbol: 'U',          name: 'Unity Software',             exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'U',      category: 'Gaming' },
  { symbol: 'PLTR',       name: 'Palantir Technologies',      exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'PLTR',   category: 'AI/Defense' },
  { symbol: 'COIN',       name: 'Coinbase Global',            exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'COIN',   category: 'Crypto Exchange' },
  { symbol: 'HOOD',       name: 'Robinhood Markets',          exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'HOOD',   category: 'Fintech' },
  { symbol: 'SOFI',       name: 'SoFi Technologies',          exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'SOFI',   category: 'Fintech' },
  { symbol: 'RIVN',       name: 'Rivian Automotive',          exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'RIVN',   category: 'EV' },
  { symbol: 'LCID',       name: 'Lucid Group',                exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'LCID',   category: 'EV' },
  { symbol: 'F',          name: 'Ford Motor Company',         exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'F',      category: 'Automotive' },
  { symbol: 'GM',         name: 'General Motors',             exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'GM',     category: 'Automotive' },
  { symbol: 'NIO',        name: 'NIO Inc.',                   exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'NIO',    category: 'EV' },
  { symbol: 'XPEV',       name: 'XPeng Inc.',                 exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'XPEV',   category: 'EV' },
  { symbol: 'LI',         name: 'Li Auto Inc.',               exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'LI',     category: 'EV' },

  // ─── CHINESE STOCKS (Yahoo Finance) ─────────────────────────────────────────
  { symbol: 'BABA',       name: 'Alibaba Group',              exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'BABA',   category: 'E-Commerce' },
  { symbol: 'JD',         name: 'JD.com Inc.',                exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'JD',     category: 'E-Commerce' },
  { symbol: 'PDD',        name: 'PDD Holdings',               exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'PDD',    category: 'E-Commerce' },
  { symbol: 'BIDU',       name: 'Baidu Inc.',                 exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'BIDU',   category: 'Technology' },
  { symbol: 'TCEHY',      name: 'Tencent Holdings',           exchange: 'OTC',    assetClass: 'stock_cn', yahooTicker: 'TCEHY',  category: 'Technology' },
  { symbol: 'NTES',       name: 'NetEase Inc.',               exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'NTES',   category: 'Gaming' },
  { symbol: 'TME',        name: 'Tencent Music',              exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'TME',    category: 'Streaming' },
  { symbol: 'EDU',        name: 'New Oriental Education',     exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'EDU',    category: 'Education' },
  { symbol: 'TAL',        name: 'TAL Education Group',        exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'TAL',    category: 'Education' },
  { symbol: 'VIPS',       name: 'Vipshop Holdings',           exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'VIPS',   category: 'E-Commerce' },
  { symbol: 'WB',         name: 'Weibo Corporation',          exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'WB',     category: 'Social Media' },
  { symbol: 'MOMO',       name: 'Hello Group Inc.',           exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'MOMO',   category: 'Social Media' },
  { symbol: 'IQ',         name: 'iQIYI Inc.',                 exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'IQ',     category: 'Streaming' },
  { symbol: 'BILI',       name: 'Bilibili Inc.',              exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'BILI',   category: 'Streaming' },
  { symbol: 'DIDI',       name: 'DiDi Global Inc.',           exchange: 'OTC',    assetClass: 'stock_cn', yahooTicker: 'DIDIY',  category: 'Mobility' },

  // ─── INDONESIAN STOCKS (Yahoo Finance .JK) ───────────────────────────────────
  { symbol: 'BBCA.JK',    name: 'Bank Central Asia',          exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'BBCA.JK',  category: 'Banking' },
  { symbol: 'BMRI.JK',    name: 'Bank Mandiri',               exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'BMRI.JK',  category: 'Banking' },
  { symbol: 'BBRI.JK',    name: 'Bank Rakyat Indonesia',      exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'BBRI.JK',  category: 'Banking' },
  { symbol: 'BBNI.JK',    name: 'Bank Negara Indonesia',      exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'BBNI.JK',  category: 'Banking' },
  { symbol: 'TLKM.JK',    name: 'Telkom Indonesia',           exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'TLKM.JK',  category: 'Telecom' },
  { symbol: 'ASII.JK',    name: 'Astra International',        exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'ASII.JK',  category: 'Conglomerate' },
  { symbol: 'UNVR.JK',    name: 'Unilever Indonesia',         exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'UNVR.JK',  category: 'Consumer Goods' },
  { symbol: 'HMSP.JK',    name: 'HM Sampoerna',               exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'HMSP.JK',  category: 'Tobacco' },
  { symbol: 'ICBP.JK',    name: 'Indofood CBP',               exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'ICBP.JK',  category: 'Food & Beverage' },
  { symbol: 'INDF.JK',    name: 'Indofood Sukses Makmur',     exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'INDF.JK',  category: 'Food & Beverage' },
  { symbol: 'GOTO.JK',    name: 'GoTo Gojek Tokopedia',       exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'GOTO.JK',  category: 'Technology' },
  { symbol: 'BREN.JK',    name: 'Barito Renewables Energy',   exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'BREN.JK',  category: 'Energy' },
  { symbol: 'ADRO.JK',    name: 'Adaro Energy',               exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'ADRO.JK',  category: 'Coal' },
  { symbol: 'PTBA.JK',    name: 'Bukit Asam',                 exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'PTBA.JK',  category: 'Coal' },
  { symbol: 'ANTM.JK',    name: 'Aneka Tambang',              exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'ANTM.JK',  category: 'Mining' },
  { symbol: 'PGAS.JK',    name: 'Perusahaan Gas Negara',      exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'PGAS.JK',  category: 'Energy' },
  { symbol: 'JSMR.JK',    name: 'Jasa Marga',                 exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'JSMR.JK',  category: 'Infrastructure' },
  { symbol: 'KLBF.JK',    name: 'Kalbe Farma',                exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'KLBF.JK',  category: 'Healthcare' },
  { symbol: 'CPIN.JK',    name: 'Charoen Pokphand Indonesia', exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'CPIN.JK',  category: 'Food & Beverage' },
  { symbol: 'INKP.JK',    name: 'Indah Kiat Pulp & Paper',    exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'INKP.JK',  category: 'Paper' },

  // ─── EUROPEAN STOCKS (Yahoo Finance) ─────────────────────────────────────────
  { symbol: 'ASML.AS',    name: 'ASML Holding',               exchange: 'EURONEXT', assetClass: 'stock_eu', yahooTicker: 'ASML.AS',  category: 'Semiconductors' },
  { symbol: 'LVMH.PA',    name: 'LVMH Moët Hennessy',         exchange: 'EURONEXT', assetClass: 'stock_eu', yahooTicker: 'MC.PA',    category: 'Luxury' },
  { symbol: 'SAP.DE',     name: 'SAP SE',                     exchange: 'XETRA',    assetClass: 'stock_eu', yahooTicker: 'SAP.DE',   category: 'Technology' },
  { symbol: 'NESN.SW',    name: 'Nestlé S.A.',                exchange: 'SIX',      assetClass: 'stock_eu', yahooTicker: 'NESN.SW',  category: 'Consumer Goods' },
  { symbol: 'NOVO-B.CO',  name: 'Novo Nordisk',               exchange: 'NASDAQ',   assetClass: 'stock_eu', yahooTicker: 'NVO',      category: 'Pharma' },
  { symbol: 'OR.PA',      name: "L'Oréal",                    exchange: 'EURONEXT', assetClass: 'stock_eu', yahooTicker: 'OR.PA',    category: 'Consumer Goods' },
  { symbol: 'SIE.DE',     name: 'Siemens AG',                 exchange: 'XETRA',    assetClass: 'stock_eu', yahooTicker: 'SIE.DE',   category: 'Industrial' },
  { symbol: 'ALV.DE',     name: 'Allianz SE',                 exchange: 'XETRA',    assetClass: 'stock_eu', yahooTicker: 'ALV.DE',   category: 'Insurance' },
  { symbol: 'BAS.DE',     name: 'BASF SE',                    exchange: 'XETRA',    assetClass: 'stock_eu', yahooTicker: 'BAS.DE',   category: 'Chemicals' },
  { symbol: 'BMW.DE',     name: 'BMW AG',                     exchange: 'XETRA',    assetClass: 'stock_eu', yahooTicker: 'BMW.DE',   category: 'Automotive' },
  { symbol: 'VOW3.DE',    name: 'Volkswagen AG',              exchange: 'XETRA',    assetClass: 'stock_eu', yahooTicker: 'VOW3.DE',  category: 'Automotive' },
  { symbol: 'SHEL.L',     name: 'Shell plc',                  exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'SHEL.L',   category: 'Energy' },
  { symbol: 'BP.L',       name: 'BP p.l.c.',                  exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'BP.L',     category: 'Energy' },
  { symbol: 'HSBA.L',     name: 'HSBC Holdings',              exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'HSBA.L',   category: 'Banking' },
  { symbol: 'AZN.L',      name: 'AstraZeneca',                exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'AZN.L',    category: 'Pharma' },
  { symbol: 'GSK.L',      name: 'GSK plc',                    exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'GSK.L',    category: 'Pharma' },
  { symbol: 'RIO.L',      name: 'Rio Tinto',                  exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'RIO.L',    category: 'Mining' },
  { symbol: 'BHP.L',      name: 'BHP Group',                  exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'BHP.L',    category: 'Mining' },
  { symbol: 'RDSA.AS',    name: 'Shell (Amsterdam)',          exchange: 'EURONEXT', assetClass: 'stock_eu', yahooTicker: 'SHELL.AS', category: 'Energy' },

  // ─── ARAB / SAUDI STOCKS (Yahoo Finance) ─────────────────────────────────────
  { symbol: '2222.SR',    name: 'Saudi Aramco',               exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '2222.SR',  category: 'Energy' },
  { symbol: '1120.SR',    name: 'Al Rajhi Bank',              exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '1120.SR',  category: 'Banking' },
  { symbol: '1180.SR',    name: 'Al Jazira Bank',             exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '1180.SR',  category: 'Banking' },
  { symbol: '2010.SR',    name: 'SABIC',                      exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '2010.SR',  category: 'Chemicals' },
  { symbol: '7010.SR',    name: 'Saudi Telecom (STC)',         exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '7010.SR',  category: 'Telecom' },
  { symbol: '1050.SR',    name: 'Banque Saudi Fransi',         exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '1050.SR',  category: 'Banking' },
  { symbol: '1140.SR',    name: 'Bank AlBilad',               exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '1140.SR',  category: 'Banking' },
  { symbol: '2030.SR',    name: 'Saudi Basic Industries',      exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '2030.SR',  category: 'Chemicals' },
  { symbol: '4230.SR',    name: 'Tourism Enterprise Co.',      exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '4230.SR',  category: 'Tourism' },
  { symbol: '2350.SR',    name: 'Saudi Kayan Petrochemical',   exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '2350.SR',  category: 'Petrochemicals' },

  // ─── SAUDI / GULF (More) ──────────────────────────────────────────────────
  { symbol: '1010.SR',    name: 'Riyad Bank',                  exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '1010.SR',  category: 'Banking' },
  { symbol: '1030.SR',    name: 'Saudi British Bank (SABB)',    exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '1030.SR',  category: 'Banking' },
  { symbol: '1020.SR',    name: 'Bank AlJazira',                exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '1020.SR',  category: 'Banking' },
  { symbol: '4010.SR',    name: 'Mouwasat Medical',             exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '4010.SR',  category: 'Healthcare' },
  { symbol: '4130.SR',    name: 'Saudi Ground Services',        exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '4130.SR',  category: 'Aviation' },
  { symbol: '2380.SR',    name: 'Petro Rabigh',                 exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '2380.SR',  category: 'Petrochemicals' },
  { symbol: '1111.SR',    name: 'Saudi Awwal Bank',             exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '1111.SR',  category: 'Banking' },
  { symbol: '2082.SR',    name: 'Advanced Petrochemicals',      exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '2082.SR',  category: 'Petrochemicals' },
  { symbol: '4050.SR',    name: 'Saudi Pharmaceutical Ind.',    exchange: 'TADAWUL', assetClass: 'stock_sa', yahooTicker: '4050.SR',  category: 'Pharma' },

  // ─── UAE / GULF STOCKS (Yahoo Finance .AD / .DU) ──────────────────────────
  { symbol: 'FAB.AE',     name: 'First Abu Dhabi Bank',         exchange: 'ADX',     assetClass: 'stock_sa', yahooTicker: 'FAB.AE',   category: 'Banking' },
  { symbol: 'EMAAR.DU',   name: 'Emaar Properties',             exchange: 'DFM',     assetClass: 'stock_sa', yahooTicker: 'EMAAR.DU', category: 'Real Estate' },
  { symbol: 'ALDAR.AE',   name: 'Aldar Properties',             exchange: 'ADX',     assetClass: 'stock_sa', yahooTicker: 'ALDAR.AE', category: 'Real Estate' },
  { symbol: 'DIB.DU',     name: 'Dubai Islamic Bank',           exchange: 'DFM',     assetClass: 'stock_sa', yahooTicker: 'DIB.DU',   category: 'Banking' },
  { symbol: 'ENBD.DU',    name: 'Emirates NBD',                 exchange: 'DFM',     assetClass: 'stock_sa', yahooTicker: 'ENBD.DU',  category: 'Banking' },

  // ─── ADDITIONAL CRYPTO (Binance USDT) ─────────────────────────────────────
  { symbol: 'KASUSDT',    name: 'Kaspa',              exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'KASUSDT',    category: 'Layer 1' },
  { symbol: 'HBARUSDT',   name: 'Hedera Hashgraph',   exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'HBARUSDT',   category: 'Layer 1' },
  { symbol: 'TAOUSDT',    name: 'Bittensor',          exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'TAOUSDT',    category: 'AI' },
  { symbol: 'ONDOUSDT',   name: 'Ondo Finance',       exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ONDOUSDT',   category: 'RWA' },
  { symbol: 'STRKUSDT',   name: 'Starknet',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'STRKUSDT',   category: 'Layer 2' },
  { symbol: 'ZKUSDT',     name: 'zkSync Era',         exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ZKUSDT',     category: 'Layer 2' },
  { symbol: 'WUSDT',      name: 'Wormhole',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'WUSDT',      category: 'Bridge' },
  { symbol: 'SEIUSDT',    name: 'Sei Network',        exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'SEIUSDT',    category: 'Layer 1' },
  { symbol: 'GRTUSDT',    name: 'The Graph',          exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'GRTUSDT',    category: 'Data' },
  { symbol: 'FLOWUSDT',   name: 'Flow',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'FLOWUSDT',   category: 'NFT Layer 1' },
  { symbol: 'IMXUSDT',    name: 'Immutable X',        exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'IMXUSDT',    category: 'Gaming L2' },
  { symbol: 'HNTUSDT',    name: 'Helium',             exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'HNTUSDT',    category: 'IoT' },
  { symbol: 'RUNEUSDT',   name: 'THORChain',          exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'RUNEUSDT',   category: 'DeFi' },
  { symbol: 'RAYUSDT',    name: 'Raydium',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'RAYUSDT',    category: 'DeFi' },
  { symbol: 'ORDIUSDT',   name: 'Ordinals',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ORDIUSDT',   category: 'Bitcoin NFT' },
  { symbol: 'EGLDUSDT',   name: 'MultiversX',         exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'EGLDUSDT',   category: 'Layer 1' },
  { symbol: 'KAVAUSDT',   name: 'Kava',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'KAVAUSDT',   category: 'DeFi' },
  { symbol: 'XMRUSDT',    name: 'Monero',             exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'XMRUSDT',    category: 'Privacy' },
  { symbol: 'ZECUSDT',    name: 'Zcash',              exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ZECUSDT',    category: 'Privacy' },
  { symbol: 'DASHUSDT',   name: 'Dash',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'DASHUSDT',   category: 'Privacy' },
  { symbol: 'IOTAUSDT',   name: 'IOTA',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'IOTAUSDT',   category: 'IoT' },
  { symbol: 'XTZUSDT',    name: 'Tezos',              exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'XTZUSDT',    category: 'Layer 1' },
  { symbol: 'CHZUSDT',    name: 'Chiliz',             exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'CHZUSDT',    category: 'Fan Tokens' },
  { symbol: 'BATUSDT',    name: 'Basic Attention Token', exchange: 'BINANCE', assetClass: 'crypto', binancePair: 'BATUSDT',   category: 'Advertising' },
  { symbol: 'ZRXUSDT',    name: '0x Protocol',        exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ZRXUSDT',    category: 'DeFi' },
  { symbol: 'ENJUSDT',    name: 'Enjin Coin',         exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ENJUSDT',    category: 'Gaming' },
  { symbol: 'ZILUSDT',    name: 'Zilliqa',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ZILUSDT',    category: 'Layer 1' },
  { symbol: 'ANKRUSDT',   name: 'Ankr',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ANKRUSDT',   category: 'Infrastructure' },
  { symbol: 'LPTUSDT',    name: 'Livepeer',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'LPTUSDT',    category: 'Streaming' },
  { symbol: 'STORJUSDT',  name: 'Storj',              exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'STORJUSDT',  category: 'Storage' },
  { symbol: 'OCEANUSDT',  name: 'Ocean Protocol',     exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'OCEANUSDT',  category: 'Data' },
  { symbol: 'BANDUSDT',   name: 'Band Protocol',      exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'BANDUSDT',   category: 'Oracle' },
  { symbol: 'DYMUSDT',    name: 'Dymension',          exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'DYMUSDT',    category: 'Modular' },
  { symbol: 'ALTUSDT',    name: 'AltLayer',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ALTUSDT',    category: 'Restaking' },
  { symbol: 'ZETAUSDT',   name: 'ZetaChain',          exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ZETAUSDT',   category: 'Cross-chain' },
  { symbol: 'PYTHUSDT',   name: 'Pyth Network',       exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'PYTHUSDT',   category: 'Oracle' },
  { symbol: 'JTOUSDT',    name: 'Jito',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'JTOUSDT',    category: 'LST' },
  { symbol: 'LDOUSDT',    name: 'Lido DAO',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'LDOUSDT',    category: 'Liquid Staking' },
  { symbol: 'RONINUSDT',  name: 'Ronin',              exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'RONINUSDT',  category: 'Gaming' },
  { symbol: 'WBTCUSDT',   name: 'Wrapped Bitcoin',    exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'WBTCUSDT',   category: 'Wrapped' },
  { symbol: 'STUSDT',     name: 'Stride',             exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'STUSDT',     category: 'LST' },
  { symbol: 'ACXUSDT',    name: 'Across Protocol',    exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ACXUSDT',    category: 'Bridge' },
  { symbol: 'GALAUSDT',   name: 'Gala',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'GALAUSDT',   category: 'Gaming' },
  { symbol: 'API3USDT',   name: 'API3',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'API3USDT',   category: 'Oracle' },
  { symbol: 'NTRNUSDT',   name: 'Neutron',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'NTRNUSDT',   category: 'DeFi' },
  { symbol: 'TRUUSDT',    name: 'TrueFi',             exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'TRUUSDT',    category: 'DeFi' },
  { symbol: 'LRCUSDT',    name: 'Loopring',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'LRCUSDT',    category: 'Layer 2' },
  { symbol: 'USTCUSDT',   name: 'TerraClassicUSD',    exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'USTCUSDT',   category: 'Stablecoin' },
  { symbol: 'APEUSDT',    name: 'ApeCoin',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'APEUSDT',    category: 'Gaming' },
  { symbol: 'IOSTUSDT',   name: 'IOST',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'IOSTUSDT',   category: 'Layer 1' },
  { symbol: 'KEYUSDT',    name: 'SelfKey',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'KEYUSDT',    category: 'Identity' },
  { symbol: 'CTSIUSDT',   name: 'Cartesi',            exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'CTSIUSDT',   category: 'Layer 2' },
  { symbol: 'XVSUSDT',    name: 'Venus',              exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'XVSUSDT',    category: 'DeFi' },
  { symbol: 'ALPACAUSDT', name: 'Alpaca Finance',     exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ALPACAUSDT', category: 'DeFi' },
  { symbol: 'BLURUSDT',   name: 'Blur',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'BLURUSDT',   category: 'NFT' },
  { symbol: 'MAGICUSDT',  name: 'Magic',              exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'MAGICUSDT',  category: 'Gaming' },
  { symbol: 'ILVUSDT',    name: 'Illuvium',           exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'ILVUSDT',    category: 'Gaming' },
  { symbol: 'GMXUSDT',    name: 'GMX',                exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'GMXUSDT',    category: 'DeFi Perps' },
  { symbol: 'PERPUSDT',   name: 'Perpetual Protocol', exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'PERPUSDT',   category: 'DeFi Perps' },
  { symbol: 'DYDXUSDT',   name: 'dYdX',               exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'DYDXUSDT',   category: 'DeFi Perps' },
  { symbol: 'KNCUSDT',    name: 'Kyber Network',      exchange: 'BINANCE', assetClass: 'crypto',   binancePair: 'KNCUSDT',    category: 'DeFi' },
  { symbol: 'ETHUSDT.P',  name: 'Ethereum Perpetual', exchange: 'BINANCE', assetClass: 'futures',  binancePair: 'ETHUSDT',    category: 'Crypto Futures' },
  { symbol: 'SOLUSDT.P',  name: 'Solana Perpetual',   exchange: 'BINANCE', assetClass: 'futures',  binancePair: 'SOLUSDT',    category: 'Crypto Futures' },
  { symbol: 'BNBUSDT.P',  name: 'BNB Perpetual',      exchange: 'BINANCE', assetClass: 'futures',  binancePair: 'BNBUSDT',    category: 'Crypto Futures' },

  // ─── ADDITIONAL MEMECOINS ──────────────────────────────────────────────────
  { symbol: '1000SHIBUSDT', name: 'Shiba Inu (1000x)', exchange: 'BINANCE', assetClass: 'memecoin', binancePair: '1000SHIBUSDT', category: 'OG Meme' },
  { symbol: '1000PEPEUSDT', name: 'Pepe (1000x)',     exchange: 'BINANCE', assetClass: 'memecoin', binancePair: '1000PEPEUSDT', category: 'Frog' },
  { symbol: 'SATSUSDT',    name: '1000SATS',          exchange: 'BINANCE', assetClass: 'memecoin', binancePair: '1000SATSUSDT', category: 'Bitcoin Meme' },
  { symbol: 'BABYDOGEUSDT',name: 'Baby Doge Coin',    exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'BABYDOGEUSDT', category: 'Dog' },
  { symbol: 'CATUSDT',     name: 'CAT',               exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'CATUSDT',     category: 'Cat' },
  { symbol: 'TRUMPUSDT',   name: 'TRUMP',             exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'TRUMPUSDT',   category: 'Political Meme' },
  { symbol: 'MELANIAUSDT', name: 'MELANIA',           exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'MELANIAUSDT', category: 'Political Meme' },
  { symbol: 'ACTUSDT',     name: 'Act I: AI Agent',   exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'ACTUSDT',     category: 'AI Meme' },
  { symbol: 'MOVEUSDT',    name: 'Movement',          exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'MOVEUSDT',    category: 'New Meme' },
  { symbol: 'PENGUUSDT',   name: 'Pudgy Penguins',    exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'PENGUUSDT',   category: 'NFT Meme' },
  { symbol: 'FARTCOINUSDT',name: 'Fartcoin',          exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'FARTCOINUSDT',category: 'Meme' },
  { symbol: 'LAUSDT',      name: 'Launchpad',         exchange: 'BINANCE', assetClass: 'memecoin', binancePair: 'LAUSDT',      category: 'Meme' },

  // ─── ADDITIONAL GLOBAL INDICES ─────────────────────────────────────────────
  { symbol: '^AXJO',       name: 'ASX 200',            exchange: 'ASX',     assetClass: 'index',    yahooTicker: '^AXJO',      category: 'Australia' },
  { symbol: '^BVSP',       name: 'Bovespa (Brazil)',   exchange: 'B3',      assetClass: 'index',    yahooTicker: '^BVSP',      category: 'Latin America' },
  { symbol: '^MXX',        name: 'IPC Mexico',         exchange: 'BMV',     assetClass: 'index',    yahooTicker: '^MXX',       category: 'Latin America' },
  { symbol: '^MERV',       name: 'Merval (Argentina)', exchange: 'BYMA',    assetClass: 'index',    yahooTicker: '^MERV',      category: 'Latin America' },
  { symbol: '^GSPTSE',     name: 'TSX (Canada)',       exchange: 'TSX',     assetClass: 'index',    yahooTicker: '^GSPTSE',    category: 'Americas' },
  { symbol: '^SSMI',       name: 'Swiss Market Index', exchange: 'SIX',     assetClass: 'index',    yahooTicker: '^SSMI',      category: 'Europe' },
  { symbol: '^IBEX',       name: 'IBEX 35 (Spain)',    exchange: 'BME',     assetClass: 'index',    yahooTicker: '^IBEX',      category: 'Europe' },
  { symbol: '^AEX',        name: 'AEX (Netherlands)',  exchange: 'EURONEXT',assetClass: 'index',    yahooTicker: '^AEX',       category: 'Europe' },
  { symbol: '^OSEAX',      name: 'Oslo Exchange',      exchange: 'OSE',     assetClass: 'index',    yahooTicker: '^OSEAX',     category: 'Europe' },
  { symbol: '^OMX',        name: 'OMX Stockholm',      exchange: 'NASDAQ',  assetClass: 'index',    yahooTicker: '^OMX',       category: 'Scandinavia' },
  { symbol: 'XU100.IS',    name: 'BIST 100 (Turkey)',  exchange: 'BIST',    assetClass: 'index',    yahooTicker: 'XU100.IS',   category: 'MENA' },
  { symbol: '^TASI.SR',    name: 'Tadawul (Saudi)',    exchange: 'TADAWUL', assetClass: 'index',    yahooTicker: '^TASI.SR',   category: 'MENA' },
  { symbol: '^DFMGI',      name: 'Dubai Financial Market', exchange: 'DFM', assetClass: 'index',    yahooTicker: '^DFMGI',     category: 'MENA' },
  { symbol: '^J203.JO',    name: 'JSE (South Africa)', exchange: 'JSE',     assetClass: 'index',    yahooTicker: '^J203.JO',   category: 'Africa' },
  { symbol: '^NSEI',       name: 'Nifty 50 (India)',   exchange: 'NSE',     assetClass: 'index',    yahooTicker: '^NSEI',      category: 'South Asia' },
  { symbol: '^SET.BK',     name: 'SET (Thailand)',     exchange: 'SET',     assetClass: 'index',    yahooTicker: '^SET.BK',    category: 'Southeast Asia' },
  { symbol: 'PSI',         name: 'PSEi (Philippines)', exchange: 'PSE',     assetClass: 'index',    yahooTicker: 'PSI',        category: 'Southeast Asia' },
  { symbol: '^STI',        name: 'STI (Singapore)',    exchange: 'SGX',     assetClass: 'index',    yahooTicker: '^STI',       category: 'Southeast Asia' },
  { symbol: '^NZ50',       name: 'NZX 50',             exchange: 'NZX',     assetClass: 'index',    yahooTicker: '^NZ50',      category: 'Pacific' },

  // ─── ADDITIONAL COMMODITIES ────────────────────────────────────────────────
  { symbol: 'SB=F',        name: 'Sugar #11',          exchange: 'ICE',     assetClass: 'commodity', yahooTicker: 'SB=F',      category: 'Soft' },
  { symbol: 'LB=F',        name: 'Lumber',             exchange: 'CME',     assetClass: 'commodity', yahooTicker: 'LB=F',      category: 'Agricultural' },
  { symbol: 'OJ=F',        name: 'Orange Juice',       exchange: 'ICE',     assetClass: 'commodity', yahooTicker: 'OJ=F',      category: 'Soft' },
  { symbol: 'LE=F',        name: 'Live Cattle',        exchange: 'CME',     assetClass: 'commodity', yahooTicker: 'LE=F',      category: 'Livestock' },
  { symbol: 'HE=F',        name: 'Lean Hogs',          exchange: 'CME',     assetClass: 'commodity', yahooTicker: 'HE=F',      category: 'Livestock' },
  { symbol: 'HO=F',        name: 'Heating Oil',        exchange: 'NYMEX',   assetClass: 'commodity', yahooTicker: 'HO=F',      category: 'Energy' },
  { symbol: 'RB=F',        name: 'RBOB Gasoline',      exchange: 'NYMEX',   assetClass: 'commodity', yahooTicker: 'RB=F',      category: 'Energy' },
  { symbol: 'ZO=F',        name: 'Oats',               exchange: 'CBOT',    assetClass: 'commodity', yahooTicker: 'ZO=F',      category: 'Agricultural' },
  { symbol: 'ZR=F',        name: 'Rough Rice',         exchange: 'CBOT',    assetClass: 'commodity', yahooTicker: 'ZR=F',      category: 'Agricultural' },
  { symbol: 'ALI=F',       name: 'Aluminum',           exchange: 'CME',     assetClass: 'commodity', yahooTicker: 'ALI=F',     category: 'Industrial Metal' },
  { symbol: 'ZT=F',        name: '2-Year T-Note',      exchange: 'CBOT',    assetClass: 'futures',   yahooTicker: 'ZT=F',      category: 'Treasury' },
  { symbol: 'ZF=F',        name: '5-Year T-Note',      exchange: 'CBOT',    assetClass: 'futures',   yahooTicker: 'ZF=F',      category: 'Treasury' },
  { symbol: 'ZN=F',        name: '10-Year T-Note',     exchange: 'CBOT',    assetClass: 'futures',   yahooTicker: 'ZN=F',      category: 'Treasury' },
  { symbol: 'ZB=F',        name: '30-Year T-Bond',     exchange: 'CBOT',    assetClass: 'futures',   yahooTicker: 'ZB=F',      category: 'Treasury' },
  { symbol: 'GF=F',        name: 'Feeder Cattle',      exchange: 'CME',     assetClass: 'commodity', yahooTicker: 'GF=F',      category: 'Livestock' },
  { symbol: 'VX=F',        name: 'VIX Futures',        exchange: 'CBOE',    assetClass: 'futures',   yahooTicker: 'VX=F',      category: 'Volatility' },
  { symbol: 'TF=F',        name: 'Russell 2000 Future',exchange: 'ICE',     assetClass: 'futures',   yahooTicker: 'TF=F',      category: 'Equity Index' },
  { symbol: 'NKD=F',       name: 'Nikkei 225 Futures', exchange: 'CME',     assetClass: 'futures',   yahooTicker: 'NKD=F',     category: 'Equity Index' },
  { symbol: 'MES=F',       name: 'Micro E-mini S&P',   exchange: 'CME',     assetClass: 'futures',   yahooTicker: 'MES=F',     category: 'Equity Index' },
  { symbol: 'MNQ=F',       name: 'Micro E-mini NASDAQ',exchange: 'CME',     assetClass: 'futures',   yahooTicker: 'MNQ=F',     category: 'Equity Index' },

  // ─── ADDITIONAL FOREX ──────────────────────────────────────────────────────
  { symbol: 'CADJPY=X',    name: 'CAD/JPY',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'CADJPY=X',   category: 'Cross' },
  { symbol: 'CHFJPY=X',    name: 'CHF/JPY',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'CHFJPY=X',   category: 'Cross' },
  { symbol: 'GBPAUD=X',    name: 'GBP/AUD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'GBPAUD=X',   category: 'Cross' },
  { symbol: 'GBPCAD=X',    name: 'GBP/CAD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'GBPCAD=X',   category: 'Cross' },
  { symbol: 'NZDCAD=X',    name: 'NZD/CAD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'NZDCAD=X',   category: 'Cross' },
  { symbol: 'EURCAD=X',    name: 'EUR/CAD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'EURCAD=X',   category: 'Cross' },
  { symbol: 'EURNZD=X',    name: 'EUR/NZD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'EURNZD=X',   category: 'Cross' },
  { symbol: 'EURAUD=X',    name: 'EUR/AUD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'EURAUD=X',   category: 'Cross' },
  { symbol: 'CADCHF=X',    name: 'CAD/CHF',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'CADCHF=X',   category: 'Cross' },
  { symbol: 'NZDCHF=X',    name: 'NZD/CHF',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'NZDCHF=X',   category: 'Cross' },
  { symbol: 'AUDCAD=X',    name: 'AUD/CAD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'AUDCAD=X',   category: 'Cross' },
  { symbol: 'AUDNZD=X',    name: 'AUD/NZD',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'AUDNZD=X',   category: 'Cross' },
  { symbol: 'AUDCHF=X',    name: 'AUD/CHF',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'AUDCHF=X',   category: 'Cross' },
  { symbol: 'SGDJPY=X',    name: 'SGD/JPY',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'SGDJPY=X',   category: 'Exotic' },
  { symbol: 'USDVND=X',    name: 'USD/VND',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDVND=X',   category: 'Emerging' },
  { symbol: 'USDPKR=X',    name: 'USD/PKR',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDPKR=X',   category: 'Emerging' },
  { symbol: 'USDEGP=X',    name: 'USD/EGP',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDEGP=X',   category: 'Emerging' },
  { symbol: 'USDNGN=X',    name: 'USD/NGN',            exchange: 'FOREX',   assetClass: 'forex',    yahooTicker: 'USDNGN=X',   category: 'Emerging' },
  { symbol: 'DX-Y.NYB',    name: 'US Dollar Index',    exchange: 'NYB',     assetClass: 'forex',    yahooTicker: 'DX-Y.NYB',   category: 'Dollar Index' },

  // ─── ADDITIONAL US STOCKS ──────────────────────────────────────────────────
  { symbol: 'LLY',         name: 'Eli Lilly',                  exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'LLY',    category: 'Healthcare' },
  { symbol: 'ABBV',        name: 'AbbVie Inc.',                exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'ABBV',   category: 'Healthcare' },
  { symbol: 'PFE',         name: 'Pfizer Inc.',                exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'PFE',    category: 'Healthcare' },
  { symbol: 'MRK',         name: 'Merck & Co.',                exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'MRK',    category: 'Healthcare' },
  { symbol: 'BMY',         name: 'Bristol-Myers Squibb',       exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'BMY',    category: 'Healthcare' },
  { symbol: 'AMGN',        name: 'Amgen Inc.',                 exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'AMGN',   category: 'Biotech' },
  { symbol: 'GILD',        name: 'Gilead Sciences',            exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'GILD',   category: 'Biotech' },
  { symbol: 'REGN',        name: 'Regeneron Pharma',          exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'REGN',   category: 'Biotech' },
  { symbol: 'VRTX',        name: 'Vertex Pharmaceuticals',    exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'VRTX',   category: 'Biotech' },
  { symbol: 'ISRG',        name: 'Intuitive Surgical',        exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'ISRG',   category: 'Medical Devices' },
  { symbol: 'MDT',         name: 'Medtronic plc',             exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'MDT',    category: 'Medical Devices' },
  { symbol: 'ABT',         name: 'Abbott Laboratories',       exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'ABT',    category: 'Healthcare' },
  { symbol: 'SYK',         name: 'Stryker Corporation',       exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'SYK',    category: 'Medical Devices' },
  { symbol: 'CVX',         name: 'Chevron Corporation',       exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'CVX',    category: 'Energy' },
  { symbol: 'COP',         name: 'ConocoPhillips',            exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'COP',    category: 'Energy' },
  { symbol: 'OXY',         name: 'Occidental Petroleum',      exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'OXY',    category: 'Energy' },
  { symbol: 'SLB',         name: 'SLB (Schlumberger)',        exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'SLB',    category: 'Energy Services' },
  { symbol: 'HAL',         name: 'Halliburton Co.',           exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'HAL',    category: 'Energy Services' },
  { symbol: 'KO',          name: 'Coca-Cola Company',         exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'KO',     category: 'Beverage' },
  { symbol: 'PEP',         name: 'PepsiCo Inc.',              exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'PEP',    category: 'Beverage' },
  { symbol: 'MCD',         name: "McDonald's Corporation",    exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'MCD',    category: 'Restaurant' },
  { symbol: 'SBUX',        name: 'Starbucks Corporation',     exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'SBUX',   category: 'Restaurant' },
  { symbol: 'YUM',         name: 'Yum! Brands',               exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'YUM',    category: 'Restaurant' },
  { symbol: 'T',           name: 'AT&T Inc.',                 exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'T',      category: 'Telecom' },
  { symbol: 'VZ',          name: 'Verizon Communications',    exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'VZ',     category: 'Telecom' },
  { symbol: 'CMCSA',       name: 'Comcast Corporation',       exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'CMCSA',  category: 'Telecom' },
  { symbol: 'HD',          name: 'Home Depot Inc.',           exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'HD',     category: 'Retail' },
  { symbol: 'LOW',         name: "Lowe's Companies",          exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'LOW',    category: 'Retail' },
  { symbol: 'TGT',         name: 'Target Corporation',        exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'TGT',    category: 'Retail' },
  { symbol: 'COST',        name: 'Costco Wholesale',          exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'COST',   category: 'Retail' },
  { symbol: 'CAT',         name: 'Caterpillar Inc.',          exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'CAT',    category: 'Industrial' },
  { symbol: 'DE',          name: 'Deere & Company',           exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'DE',     category: 'Industrial' },
  { symbol: 'HON',         name: 'Honeywell International',   exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'HON',    category: 'Industrial' },
  { symbol: 'MMM',         name: '3M Company',                exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'MMM',    category: 'Industrial' },
  { symbol: 'GE',          name: 'GE Aerospace',              exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'GE',     category: 'Industrial' },
  { symbol: 'RTX',         name: 'RTX Corporation',           exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'RTX',    category: 'Defense' },
  { symbol: 'LMT',         name: 'Lockheed Martin',           exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'LMT',    category: 'Defense' },
  { symbol: 'NOC',         name: 'Northrop Grumman',          exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'NOC',    category: 'Defense' },
  { symbol: 'GD',          name: 'General Dynamics',          exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'GD',     category: 'Defense' },
  { symbol: 'ADBE',        name: 'Adobe Inc.',                exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'ADBE',   category: 'SaaS' },
  { symbol: 'NOW',         name: 'ServiceNow Inc.',           exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'NOW',    category: 'SaaS' },
  { symbol: 'SNOW',        name: 'Snowflake Inc.',            exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'SNOW',   category: 'Cloud Data' },
  { symbol: 'DDOG',        name: 'Datadog Inc.',              exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'DDOG',   category: 'DevOps' },
  { symbol: 'MDB',         name: 'MongoDB Inc.',              exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'MDB',    category: 'Database' },
  { symbol: 'NET',         name: 'Cloudflare Inc.',           exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'NET',    category: 'Infrastructure' },
  { symbol: 'ZS',          name: 'Zscaler Inc.',              exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'ZS',     category: 'Cybersecurity' },
  { symbol: 'CRWD',        name: 'CrowdStrike Holdings',      exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'CRWD',   category: 'Cybersecurity' },
  { symbol: 'PANW',        name: 'Palo Alto Networks',        exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'PANW',   category: 'Cybersecurity' },
  { symbol: 'FTNT',        name: 'Fortinet Inc.',             exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'FTNT',   category: 'Cybersecurity' },
  { symbol: 'MSTR',        name: 'MicroStrategy',             exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'MSTR',   category: 'Crypto Holdings' },
  { symbol: 'MARA',        name: 'MARA Holdings',             exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'MARA',   category: 'Crypto Mining' },
  { symbol: 'RIOT',        name: 'Riot Platforms',            exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'RIOT',   category: 'Crypto Mining' },
  { symbol: 'SMCI',        name: 'Super Micro Computer',      exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'SMCI',   category: 'AI Infrastructure' },
  { symbol: 'ARM',         name: 'Arm Holdings plc',          exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'ARM',    category: 'Semiconductors' },
  { symbol: 'QCOM',        name: 'Qualcomm Inc.',             exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'QCOM',   category: 'Semiconductors' },
  { symbol: 'TXN',         name: 'Texas Instruments',        exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'TXN',    category: 'Semiconductors' },
  { symbol: 'ADI',         name: 'Analog Devices',           exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'ADI',    category: 'Semiconductors' },
  { symbol: 'AMAT',        name: 'Applied Materials',        exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'AMAT',   category: 'Semiconductor Equip.' },
  { symbol: 'LRCX',        name: 'Lam Research',             exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'LRCX',   category: 'Semiconductor Equip.' },
  { symbol: 'KLAC',        name: 'KLA Corporation',          exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'KLAC',   category: 'Semiconductor Equip.' },
  { symbol: 'MU',          name: 'Micron Technology',        exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'MU',     category: 'Semiconductors' },
  { symbol: 'TSM',         name: 'Taiwan Semiconductor (ADR)', exchange: 'NYSE', assetClass: 'stock_us', yahooTicker: 'TSM',    category: 'Semiconductors' },
  { symbol: 'SQ',          name: 'Block Inc.',               exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'SQ',     category: 'Fintech' },
  { symbol: 'ABNB',        name: 'Airbnb Inc.',              exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'ABNB',   category: 'Travel' },
  { symbol: 'BKNG',        name: 'Booking Holdings',         exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'BKNG',   category: 'Travel' },
  { symbol: 'SPOT',        name: 'Spotify Technology',       exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'SPOT',   category: 'Streaming' },
  { symbol: 'NKE',         name: 'Nike Inc.',                exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'NKE',    category: 'Apparel' },
  { symbol: 'LULU',        name: 'lululemon athletica',      exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'LULU',   category: 'Apparel' },
  { symbol: 'TJX',         name: 'TJX Companies',            exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'TJX',    category: 'Retail' },
  { symbol: 'AXP',         name: 'American Express',         exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'AXP',    category: 'Fintech' },
  { symbol: 'USB',         name: 'U.S. Bancorp',             exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'USB',    category: 'Banking' },
  { symbol: 'PNC',         name: 'PNC Financial Services',   exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'PNC',    category: 'Banking' },
  { symbol: 'BLK',         name: 'BlackRock Inc.',           exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'BLK',    category: 'Asset Management' },
  { symbol: 'SCHW',        name: 'Charles Schwab',           exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'SCHW',   category: 'Brokerage' },
  { symbol: 'CME',         name: 'CME Group',                exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'CME',    category: 'Exchange' },
  { symbol: 'ICE',         name: 'Intercontinental Exchange',exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'ICE',    category: 'Exchange' },
  { symbol: 'SPGI',        name: 'S&P Global',               exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'SPGI',   category: 'Financial Data' },
  { symbol: 'PLD',         name: 'Prologis Inc.',            exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'PLD',    category: 'REIT' },
  { symbol: 'O',           name: 'Realty Income Corp.',      exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'O',      category: 'REIT' },
  { symbol: 'SPG',         name: 'Simon Property Group',     exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'SPG',    category: 'REIT' },
  { symbol: 'TWLO',        name: 'Twilio Inc.',              exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'TWLO',   category: 'SaaS' },
  { symbol: 'HUBS',        name: 'HubSpot Inc.',             exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'HUBS',   category: 'SaaS' },
  { symbol: 'ACN',         name: 'Accenture plc',            exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'ACN',    category: 'IT Services' },
  { symbol: 'IBM',         name: 'IBM Corporation',          exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'IBM',    category: 'IT Services' },
  { symbol: 'HPQ',         name: 'HP Inc.',                  exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'HPQ',    category: 'Hardware' },
  { symbol: 'DELL',        name: 'Dell Technologies',        exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'DELL',   category: 'Hardware' },
  { symbol: 'NET2',        name: 'Cloudflare B',             exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'NET',    category: 'Infrastructure' },
  { symbol: 'AFRM',        name: 'Affirm Holdings',          exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'AFRM',   category: 'Fintech' },
  { symbol: 'BILL',        name: 'Bill Holdings',            exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'BILL',   category: 'Fintech' },
  { symbol: 'APP',         name: 'AppLovin Corporation',     exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'APP',    category: 'Mobile Marketing' },
  { symbol: 'RKLB',        name: 'Rocket Lab USA',           exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'RKLB',   category: 'Space' },
  { symbol: 'SPCE',        name: 'Virgin Galactic',          exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'SPCE',   category: 'Space' },
  { symbol: 'ACHR',        name: 'Archer Aviation',          exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'ACHR',   category: 'eVTOL' },
  { symbol: 'AI',          name: 'C3.ai Inc.',               exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'AI',     category: 'AI Software' },
  { symbol: 'SOUN',        name: 'SoundHound AI',            exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'SOUN',   category: 'AI' },
  { symbol: 'BBAI',        name: 'BigBear.ai',               exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'BBAI',   category: 'AI/Defense' },
  { symbol: 'IONQ',        name: 'IonQ Inc.',                exchange: 'NYSE',   assetClass: 'stock_us', yahooTicker: 'IONQ',   category: 'Quantum Computing' },
  { symbol: 'RGTI',        name: 'Rigetti Computing',        exchange: 'NASDAQ', assetClass: 'stock_us', yahooTicker: 'RGTI',   category: 'Quantum Computing' },

  // ─── ADDITIONAL CHINESE STOCKS ────────────────────────────────────────────
  { symbol: 'BEKE',        name: 'KE Holdings (Beike)',       exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'BEKE',   category: 'Real Estate' },
  { symbol: 'DQ',          name: 'Daqo New Energy',           exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'DQ',     category: 'Solar' },
  { symbol: 'JKS',         name: 'JinkoSolar Holding',        exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'JKS',    category: 'Solar' },
  { symbol: 'CSIQ',        name: 'Canadian Solar',            exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'CSIQ',   category: 'Solar' },
  { symbol: 'GDS',         name: 'GDS Holdings (Data Centers)',exchange: 'NASDAQ',assetClass: 'stock_cn', yahooTicker: 'GDS',    category: 'Data Center' },
  { symbol: 'NOAH',        name: 'Noah Holdings',             exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'NOAH',   category: 'Wealth Mgmt' },
  { symbol: 'TUYA',        name: 'Tuya Smart',                exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'TUYA',   category: 'IoT' },
  { symbol: 'QFIN',        name: '360 DigiTech (QFIN)',        exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'QFIN',   category: 'Fintech' },
  { symbol: 'LSPD',        name: 'Lightspeed Commerce',       exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'LSPD',   category: 'Fintech' },
  { symbol: 'FUTU',        name: 'Futu Holdings',             exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'FUTU',   category: 'Brokerage' },
  { symbol: 'TIGR',        name: 'UP Fintech (Tiger)',         exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'TIGR',   category: 'Brokerage' },
  { symbol: 'ZH',          name: 'Zhihu Inc.',                exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'ZH',     category: 'Social Media' },
  { symbol: 'LAIX',        name: 'Laix Inc.',                 exchange: 'NYSE',   assetClass: 'stock_cn', yahooTicker: 'LAIX',   category: 'EdTech' },
  { symbol: 'NIU',         name: 'Niu Technologies',          exchange: 'NASDAQ', assetClass: 'stock_cn', yahooTicker: 'NIU',    category: 'EV Scooter' },

  // ─── ADDITIONAL INDONESIAN STOCKS ─────────────────────────────────────────
  { symbol: 'UNTR.JK',     name: 'United Tractors',           exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'UNTR.JK',  category: 'Heavy Equipment' },
  { symbol: 'EXCL.JK',     name: 'XL Axiata',                 exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'EXCL.JK',  category: 'Telecom' },
  { symbol: 'SMGR.JK',     name: 'Semen Indonesia',           exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'SMGR.JK',  category: 'Construction' },
  { symbol: 'WIKA.JK',     name: 'Wijaya Karya',              exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'WIKA.JK',  category: 'Construction' },
  { symbol: 'PTPP.JK',     name: 'PP (Persero)',              exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'PTPP.JK',  category: 'Construction' },
  { symbol: 'BSDE.JK',     name: 'Bumi Serpong Damai',        exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'BSDE.JK',  category: 'Real Estate' },
  { symbol: 'LPKR.JK',     name: 'Lippo Karawaci',            exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'LPKR.JK',  category: 'Real Estate' },
  { symbol: 'PWON.JK',     name: 'Pakuwon Jati',              exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'PWON.JK',  category: 'Real Estate' },
  { symbol: 'MNCN.JK',     name: 'MNC Networks Indonesia',   exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'MNCN.JK',  category: 'Media' },
  { symbol: 'ISAT.JK',     name: 'Indosat Ooredoo Hutchison', exchange: 'IDX',   assetClass: 'stock_id', yahooTicker: 'ISAT.JK',  category: 'Telecom' },
  { symbol: 'ACES.JK',     name: 'Ace Hardware Indonesia',    exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'ACES.JK',  category: 'Retail' },
  { symbol: 'AALI.JK',     name: 'Astra Agro Lestari',        exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'AALI.JK',  category: 'Palm Oil' },
  { symbol: 'LSIP.JK',     name: 'PP London Sumatra',         exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'LSIP.JK',  category: 'Palm Oil' },
  { symbol: 'SIMP.JK',     name: 'Salim Ivomas Pratama',      exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'SIMP.JK',  category: 'Palm Oil' },
  { symbol: 'TBIG.JK',     name: 'Tower Bersama',             exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'TBIG.JK',  category: 'Tower Infra' },
  { symbol: 'TOWR.JK',     name: 'Sarana Menara Nusantara',   exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'TOWR.JK',  category: 'Tower Infra' },
  { symbol: 'BBTN.JK',     name: 'Bank BTN',                  exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'BBTN.JK',  category: 'Banking' },
  { symbol: 'BDMN.JK',     name: 'Bank Danamon',              exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'BDMN.JK',  category: 'Banking' },
  { symbol: 'MEGA.JK',     name: 'Bank Mega',                 exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'MEGA.JK',  category: 'Banking' },
  { symbol: 'BNGA.JK',     name: 'CIMB Niaga',                exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'BNGA.JK',  category: 'Banking' },
  { symbol: 'NISP.JK',     name: 'OCBC NISP',                 exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'NISP.JK',  category: 'Banking' },
  { symbol: 'MYOR.JK',     name: 'Mayora Indah',              exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'MYOR.JK',  category: 'Food & Beverage' },
  { symbol: 'SIDO.JK',     name: 'Sido Muncul',               exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'SIDO.JK',  category: 'Healthcare' },
  { symbol: 'TSPC.JK',     name: 'Tempo Scan Pacific',        exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'TSPC.JK',  category: 'Healthcare' },
  { symbol: 'KAEF.JK',     name: 'Kimia Farma',               exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'KAEF.JK',  category: 'Healthcare' },
  { symbol: 'INKP.JK',     name: 'Indah Kiat Pulp & Paper',   exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'INKP.JK',  category: 'Paper' },
  { symbol: 'TKIM.JK',     name: 'Pindo Deli Pulp & Paper',   exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'TKIM.JK',  category: 'Paper' },
  { symbol: 'SRIL.JK',     name: 'Sri Rejeki Isman',          exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'SRIL.JK',  category: 'Textile' },
  { symbol: 'INCO.JK',     name: 'Vale Indonesia',            exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'INCO.JK',  category: 'Mining' },
  { symbol: 'TINS.JK',     name: 'Timah',                     exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'TINS.JK',  category: 'Mining' },
  { symbol: 'MEDC.JK',     name: 'Medco Energi Internasional',exchange: 'IDX',   assetClass: 'stock_id', yahooTicker: 'MEDC.JK',  category: 'Energy' },
  { symbol: 'ELSA.JK',     name: 'Elnusa',                    exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'ELSA.JK',  category: 'Energy Services' },
  { symbol: 'EMTK.JK',     name: 'Elang Mahkota Teknologi',   exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'EMTK.JK',  category: 'Technology' },
  { symbol: 'BFIN.JK',     name: 'BFI Finance',               exchange: 'IDX',    assetClass: 'stock_id', yahooTicker: 'BFIN.JK',  category: 'Finance' },

  // ─── ADDITIONAL EUROPEAN STOCKS ───────────────────────────────────────────
  { symbol: 'NOVO-B.CO',   name: 'Novo Nordisk',              exchange: 'CPH',      assetClass: 'stock_eu', yahooTicker: 'NVO',      category: 'Pharma' },
  { symbol: 'ROG.SW',      name: 'Roche Holding',             exchange: 'SIX',      assetClass: 'stock_eu', yahooTicker: 'ROG.SW',   category: 'Pharma' },
  { symbol: 'NOVN.SW',     name: 'Novartis AG',               exchange: 'SIX',      assetClass: 'stock_eu', yahooTicker: 'NOVN.SW',  category: 'Pharma' },
  { symbol: 'UHR.SW',      name: 'Swatch Group',              exchange: 'SIX',      assetClass: 'stock_eu', yahooTicker: 'UHR.SW',   category: 'Luxury' },
  { symbol: 'CFR.SW',      name: 'Richemont',                 exchange: 'SIX',      assetClass: 'stock_eu', yahooTicker: 'CFR.SW',   category: 'Luxury' },
  { symbol: 'ERICB.ST',    name: 'Ericsson',                  exchange: 'OMX',      assetClass: 'stock_eu', yahooTicker: 'ERIC-B.ST',category: 'Telecom Equip.' },
  { symbol: 'VOLV-B.ST',   name: 'Volvo',                     exchange: 'OMX',      assetClass: 'stock_eu', yahooTicker: 'VOLV-B.ST',category: 'Automotive' },
  { symbol: 'SWED-A.ST',   name: 'Swedbank',                  exchange: 'OMX',      assetClass: 'stock_eu', yahooTicker: 'SWED-A.ST',category: 'Banking' },
  { symbol: 'ADS.DE',      name: 'Adidas AG',                 exchange: 'XETRA',    assetClass: 'stock_eu', yahooTicker: 'ADS.DE',   category: 'Apparel' },
  { symbol: 'DBK.DE',      name: 'Deutsche Bank',             exchange: 'XETRA',    assetClass: 'stock_eu', yahooTicker: 'DBK.DE',   category: 'Banking' },
  { symbol: 'DTE.DE',      name: 'Deutsche Telekom',          exchange: 'XETRA',    assetClass: 'stock_eu', yahooTicker: 'DTE.DE',   category: 'Telecom' },
  { symbol: 'MBG.DE',      name: 'Mercedes-Benz',             exchange: 'XETRA',    assetClass: 'stock_eu', yahooTicker: 'MBG.DE',   category: 'Automotive' },
  { symbol: 'ENR.DE',      name: 'Siemens Energy',            exchange: 'XETRA',    assetClass: 'stock_eu', yahooTicker: 'ENR.DE',   category: 'Energy' },
  { symbol: 'BNP.PA',      name: 'BNP Paribas',               exchange: 'EURONEXT', assetClass: 'stock_eu', yahooTicker: 'BNP.PA',   category: 'Banking' },
  { symbol: 'CS.PA',       name: 'AXA SA',                    exchange: 'EURONEXT', assetClass: 'stock_eu', yahooTicker: 'CS.PA',    category: 'Insurance' },
  { symbol: 'SAN.PA',      name: 'Sanofi',                    exchange: 'EURONEXT', assetClass: 'stock_eu', yahooTicker: 'SAN.PA',   category: 'Pharma' },
  { symbol: 'AI.PA',       name: 'Air Liquide',               exchange: 'EURONEXT', assetClass: 'stock_eu', yahooTicker: 'AI.PA',    category: 'Industrial Gases' },
  { symbol: 'SU.PA',       name: 'Schneider Electric',        exchange: 'EURONEXT', assetClass: 'stock_eu', yahooTicker: 'SU.PA',    category: 'Industrial' },
  { symbol: 'KER.PA',      name: 'Kering (Gucci)',            exchange: 'EURONEXT', assetClass: 'stock_eu', yahooTicker: 'KER.PA',   category: 'Luxury' },
  { symbol: 'RMS.PA',      name: 'Hermès International',      exchange: 'EURONEXT', assetClass: 'stock_eu', yahooTicker: 'RMS.PA',   category: 'Luxury' },
  { symbol: 'VOD.L',       name: 'Vodafone Group',            exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'VOD.L',    category: 'Telecom' },
  { symbol: 'ULVR.L',      name: 'Unilever plc',              exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'ULVR.L',   category: 'Consumer Goods' },
  { symbol: 'DGE.L',       name: 'Diageo plc',                exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'DGE.L',    category: 'Beverages' },
  { symbol: 'BARC.L',      name: 'Barclays plc',              exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'BARC.L',   category: 'Banking' },
  { symbol: 'LLOY.L',      name: 'Lloyds Banking Group',      exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'LLOY.L',   category: 'Banking' },
  { symbol: 'RR.L',        name: 'Rolls-Royce Holdings',      exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'RR.L',     category: 'Aerospace' },
  { symbol: 'IAG.L',       name: 'Int. Airlines Group',       exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'IAG.L',    category: 'Airlines' },
  { symbol: 'CPG.L',       name: 'Compass Group',             exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'CPG.L',    category: 'Catering' },
  { symbol: 'PRU.L',       name: 'Prudential plc',            exchange: 'LSE',      assetClass: 'stock_eu', yahooTicker: 'PRU.L',    category: 'Insurance' },

  // ─── JAPAN STOCKS ──────────────────────────────────────────────────────────
  { symbol: 'TM',          name: 'Toyota Motor (ADR)',         exchange: 'NYSE',     assetClass: 'stock_jp', yahooTicker: 'TM',       category: 'Automotive' },
  { symbol: 'SONY',        name: 'Sony Group (ADR)',           exchange: 'NYSE',     assetClass: 'stock_jp', yahooTicker: 'SONY',     category: 'Electronics' },
  { symbol: 'HMC',         name: 'Honda Motor (ADR)',          exchange: 'NYSE',     assetClass: 'stock_jp', yahooTicker: 'HMC',      category: 'Automotive' },
  { symbol: 'NTDOY',       name: 'Nintendo (ADR)',             exchange: 'OTC',      assetClass: 'stock_jp', yahooTicker: 'NTDOY',    category: 'Gaming' },
  { symbol: 'SFTBY',       name: 'SoftBank Group (ADR)',       exchange: 'OTC',      assetClass: 'stock_jp', yahooTicker: 'SFTBY',    category: 'Technology' },
  { symbol: 'MUFG',        name: 'Mitsubishi UFJ (ADR)',       exchange: 'NYSE',     assetClass: 'stock_jp', yahooTicker: 'MUFG',     category: 'Banking' },
  { symbol: 'SMFG',        name: 'Sumitomo Mitsui (ADR)',      exchange: 'NYSE',     assetClass: 'stock_jp', yahooTicker: 'SMFG',     category: 'Banking' },
  { symbol: 'FANUY',       name: 'Fanuc Corp (ADR)',           exchange: 'OTC',      assetClass: 'stock_jp', yahooTicker: 'FANUY',    category: 'Industrial Robots' },
  { symbol: 'KYOCF',       name: 'Kyocera (ADR)',              exchange: 'OTC',      assetClass: 'stock_jp', yahooTicker: 'KYOCF',    category: 'Electronics' },
  { symbol: 'TOSBF',       name: 'Toshiba Corp (ADR)',         exchange: 'OTC',      assetClass: 'stock_jp', yahooTicker: 'TOSBF',    category: 'Technology' },
  { symbol: 'PCRFY',       name: 'Panasonic (ADR)',            exchange: 'OTC',      assetClass: 'stock_jp', yahooTicker: 'PCRFY',    category: 'Electronics' },
  { symbol: 'HTHIY',       name: 'Hitachi (ADR)',              exchange: 'OTC',      assetClass: 'stock_jp', yahooTicker: 'HTHIY',    category: 'Industrial' },

  // ─── KOREA STOCKS ──────────────────────────────────────────────────────────
  { symbol: 'SSNLF',       name: 'Samsung Electronics',       exchange: 'OTC',      assetClass: 'stock_kr', yahooTicker: 'SSNLF',    category: 'Electronics' },
  { symbol: 'HXSCL',       name: 'SK Hynix (OTC)',            exchange: 'OTC',      assetClass: 'stock_kr', yahooTicker: 'HXSCL',    category: 'Semiconductors' },
  { symbol: 'HYMTF',       name: 'Hyundai Motor (OTC)',       exchange: 'OTC',      assetClass: 'stock_kr', yahooTicker: 'HYMTF',    category: 'Automotive' },
  { symbol: 'LGEAF',       name: 'LG Electronics (OTC)',      exchange: 'OTC',      assetClass: 'stock_kr', yahooTicker: 'LGEAF',    category: 'Electronics' },
  { symbol: 'LGCLF',       name: 'LG Chem (OTC)',             exchange: 'OTC',      assetClass: 'stock_kr', yahooTicker: 'LGCLF',    category: 'Chemicals' },
  { symbol: 'PKX',         name: 'POSCO Holdings (ADR)',       exchange: 'NYSE',     assetClass: 'stock_kr', yahooTicker: 'PKX',      category: 'Steel' },
  { symbol: 'KB',          name: 'KB Financial Group (ADR)',   exchange: 'NYSE',     assetClass: 'stock_kr', yahooTicker: 'KB',       category: 'Banking' },
  { symbol: 'SHG',         name: 'Shinhan Financial (ADR)',    exchange: 'NYSE',     assetClass: 'stock_kr', yahooTicker: 'SHG',      category: 'Banking' },

  // ─── AUSTRALIA STOCKS ──────────────────────────────────────────────────────
  { symbol: 'BHP.AX',      name: 'BHP Group',                 exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'BHP.AX',   category: 'Mining' },
  { symbol: 'CBA.AX',      name: 'Commonwealth Bank',         exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'CBA.AX',   category: 'Banking' },
  { symbol: 'CSL.AX',      name: 'CSL Limited',               exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'CSL.AX',   category: 'Biotech' },
  { symbol: 'NAB.AX',      name: 'National Australia Bank',   exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'NAB.AX',   category: 'Banking' },
  { symbol: 'ANZ.AX',      name: 'ANZ Group',                 exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'ANZ.AX',   category: 'Banking' },
  { symbol: 'WBC.AX',      name: 'Westpac Banking',           exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'WBC.AX',   category: 'Banking' },
  { symbol: 'RIO.AX',      name: 'Rio Tinto (ASX)',           exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'RIO.AX',   category: 'Mining' },
  { symbol: 'FMG.AX',      name: 'Fortescue Metals',          exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'FMG.AX',   category: 'Iron Ore' },
  { symbol: 'WDS.AX',      name: 'Woodside Energy',           exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'WDS.AX',   category: 'Energy' },
  { symbol: 'MQG.AX',      name: 'Macquarie Group',           exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'MQG.AX',   category: 'Investment Bank' },
  { symbol: 'WES.AX',      name: 'Wesfarmers',                exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'WES.AX',   category: 'Conglomerate' },
  { symbol: 'TLS.AX',      name: 'Telstra Group',             exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'TLS.AX',   category: 'Telecom' },
  { symbol: 'NCM.AX',      name: 'Newcrest Mining',           exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'NCM.AX',   category: 'Gold Mining' },
  { symbol: 'S32.AX',      name: 'South32',                   exchange: 'ASX',      assetClass: 'stock_au', yahooTicker: 'S32.AX',   category: 'Mining' },

  // ─── INDIA STOCKS (ADR / NYSE) ─────────────────────────────────────────────
  { symbol: 'INFY',        name: 'Infosys Limited (ADR)',      exchange: 'NYSE',     assetClass: 'stock_in', yahooTicker: 'INFY',     category: 'IT Services' },
  { symbol: 'WIT',         name: 'Wipro Limited (ADR)',        exchange: 'NYSE',     assetClass: 'stock_in', yahooTicker: 'WIT',      category: 'IT Services' },
  { symbol: 'HDB',         name: 'HDFC Bank (ADR)',            exchange: 'NYSE',     assetClass: 'stock_in', yahooTicker: 'HDB',      category: 'Banking' },
  { symbol: 'IBN',         name: 'ICICI Bank (ADR)',           exchange: 'NYSE',     assetClass: 'stock_in', yahooTicker: 'IBN',      category: 'Banking' },
  { symbol: 'TTM',         name: 'Tata Motors (ADR)',          exchange: 'NYSE',     assetClass: 'stock_in', yahooTicker: 'TTM',      category: 'Automotive' },
  { symbol: 'SIFY',        name: 'Sify Technologies',          exchange: 'NASDAQ',   assetClass: 'stock_in', yahooTicker: 'SIFY',     category: 'Data Center' },
  { symbol: 'RDY',         name: "Dr. Reddy's Labs (ADR)",     exchange: 'NYSE',     assetClass: 'stock_in', yahooTicker: 'RDY',      category: 'Pharma' },
  { symbol: 'VEDL',        name: 'Vedanta Limited (ADR)',      exchange: 'NYSE',     assetClass: 'stock_in', yahooTicker: 'VEDL',     category: 'Mining' },
  { symbol: 'BRDCY',       name: 'Bharat Forge (ADR)',         exchange: 'OTC',      assetClass: 'stock_in', yahooTicker: 'BRDCY',    category: 'Manufacturing' },

  // ─── ETFs ──────────────────────────────────────────────────────────────────
  { symbol: 'SPY',         name: 'SPDR S&P 500 ETF',          exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'SPY',      category: 'US Equity' },
  { symbol: 'QQQ',         name: 'Invesco QQQ NASDAQ ETF',    exchange: 'NASDAQ',   assetClass: 'etf',      yahooTicker: 'QQQ',      category: 'US Tech' },
  { symbol: 'IWM',         name: 'iShares Russell 2000 ETF',  exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'IWM',      category: 'US Small Cap' },
  { symbol: 'GLD',         name: 'SPDR Gold Shares',          exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'GLD',      category: 'Gold' },
  { symbol: 'SLV',         name: 'iShares Silver Trust',      exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'SLV',      category: 'Silver' },
  { symbol: 'USO',         name: 'United States Oil Fund',    exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'USO',      category: 'Oil' },
  { symbol: 'TLT',         name: 'iShares 20+ Yr Treasury',   exchange: 'NASDAQ',   assetClass: 'etf',      yahooTicker: 'TLT',      category: 'Bonds' },
  { symbol: 'HYG',         name: 'iShares High Yield Corp',   exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'HYG',      category: 'Bonds' },
  { symbol: 'VXX',         name: 'iPath VIX Short-Term',      exchange: 'CBOE',     assetClass: 'etf',      yahooTicker: 'VXX',      category: 'Volatility' },
  { symbol: 'SQQQ',        name: 'ProShares UltraPro Short QQQ', exchange: 'NASDAQ',assetClass: 'etf',      yahooTicker: 'SQQQ',     category: 'Leveraged Short' },
  { symbol: 'TQQQ',        name: 'ProShares UltraPro QQQ',   exchange: 'NASDAQ',   assetClass: 'etf',      yahooTicker: 'TQQQ',     category: 'Leveraged Long' },
  { symbol: 'SPXU',        name: 'ProShares UltraPro Short S&P', exchange: 'NYSE',  assetClass: 'etf',      yahooTicker: 'SPXU',     category: 'Leveraged Short' },
  { symbol: 'UPRO',        name: 'ProShares UltraPro S&P500', exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'UPRO',     category: 'Leveraged Long' },
  { symbol: 'ARKK',        name: 'ARK Innovation ETF',        exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'ARKK',     category: 'Disruptive Tech' },
  { symbol: 'XLF',         name: 'Financial Select SPDR',     exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'XLF',      category: 'Sector' },
  { symbol: 'XLE',         name: 'Energy Select SPDR',        exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'XLE',      category: 'Sector' },
  { symbol: 'XLK',         name: 'Technology Select SPDR',    exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'XLK',      category: 'Sector' },
  { symbol: 'XLV',         name: 'Healthcare Select SPDR',    exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'XLV',      category: 'Sector' },
  { symbol: 'EEM',         name: 'iShares MSCI Emerging Mkts',exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'EEM',      category: 'Emerging Markets' },
  { symbol: 'VNQ',         name: 'Vanguard Real Estate ETF',  exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'VNQ',      category: 'REIT' },
  { symbol: 'DXY',         name: 'US Dollar Index',           exchange: 'NYSE',     assetClass: 'etf',      yahooTicker: 'UUP',      category: 'Currency' },

  // ─── DEX TOKENS ────────────────────────────────────────────────────────────
  { symbol: 'PENDLE',      name: 'Pendle Finance',            exchange: 'BINANCE', assetClass: 'dex',      binancePair: 'PENDLEUSDT', category: 'DeFi' },
  { symbol: 'AEROUSDT',    name: 'Aerodrome Finance',         exchange: 'DEX',     assetClass: 'dex',      dexAddress: 'AERO',        category: 'DEX' },
  { symbol: 'VELOUSDT',    name: 'Velodrome Finance',         exchange: 'DEX',     assetClass: 'dex',      dexAddress: 'VELO',        category: 'DEX' },
  { symbol: 'UNIV3',       name: 'Uniswap V3 (Mainnet)',      exchange: 'DEX',     assetClass: 'dex',      dexAddress: 'UNI-V3',      category: 'DEX' },
  { symbol: 'CAKEUSDT',    name: 'PancakeSwap',               exchange: 'BINANCE', assetClass: 'dex',      binancePair: 'CAKEUSDT',   category: 'DEX' },
  { symbol: 'SUSHIUSDT',   name: 'SushiSwap',                 exchange: 'BINANCE', assetClass: 'dex',      binancePair: 'SUSHIUSDT',  category: 'DEX' },
  { symbol: 'CVXUSDT',     name: 'Convex Finance',            exchange: 'BINANCE', assetClass: 'dex',      binancePair: 'CVXUSDT',    category: 'DeFi' },
  { symbol: 'FRXETHUSD',   name: 'Frax ETH',                  exchange: 'DEX',     assetClass: 'dex',      dexAddress: 'FRXETH',      category: 'LST' },
  { symbol: 'MORPHOUSDT',  name: 'Morpho',                    exchange: 'DEX',     assetClass: 'dex',      dexAddress: 'MORPHO',      category: 'Lending' },
  { symbol: 'EIGENUSDT',   name: 'EigenLayer',                exchange: 'BINANCE', assetClass: 'dex',      binancePair: 'EIGENUSDT',  category: 'Restaking' },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────

// Merge programmatic generators (de-duped by symbol)
import { generateAllAutoSymbols } from './symbolsAuto';
import { SYMBOLS_BULK } from './symbolsBulk';
import { SYMBOLS_MEGA } from './symbolsMega';
import { SYMBOLS_ULTRA } from './symbolsUltra';
(function mergeAutoSymbols() {
  const existing = new Set(SYMBOL_CATALOG.map((s) => s.symbol.toUpperCase()));
  const addList = (list: SymbolMeta[]) => {
    for (const s of list) {
      const k = s.symbol.toUpperCase();
      if (!existing.has(k)) { SYMBOL_CATALOG.push(s); existing.add(k); }
    }
  };
  addList(generateAllAutoSymbols());
  addList(SYMBOLS_BULK);
  addList(SYMBOLS_MEGA);
  addList(SYMBOLS_ULTRA);
})();

const _catalogMap = new Map<string, SymbolMeta>(
  SYMBOL_CATALOG.map((s) => [s.symbol.toUpperCase(), s])
);

export function getSymbolMeta(symbol: string): SymbolMeta | undefined {
  return _catalogMap.get(symbol.toUpperCase());
}

export function getCatalogSize(): number {
  return SYMBOL_CATALOG.length;
}

export function getSymbolsByClass(assetClass: AssetClass): SymbolMeta[] {
  return SYMBOL_CATALOG.filter((s) => s.assetClass === assetClass);
}

/**
 * Determine asset class and the correct ticker/pair for a given symbol string.
 * Handles Binance pairs (BTCUSDT), Yahoo Finance tickers (AAPL, ^GSPC, GC=F, EURUSD=X),
 * and .JK suffixes.
 */
export function detectAssetClass(symbol: string): {
  assetClass: AssetClass;
  yahooTicker?: string;
  binancePair?: string;
} {
  const upper = symbol.toUpperCase();

  // Check catalog first
  const meta = _catalogMap.get(upper);
  if (meta) {
    return {
      assetClass: meta.assetClass,
      yahooTicker: meta.yahooTicker,
      binancePair: meta.binancePair,
    };
  }

  // Heuristic fallbacks ─────────────────────────────────────────────────────

  // Binance pair heuristic: ends with USDT, BTC, ETH, BNB
  if (/^[A-Z0-9]+(USDT|BTC|ETH|BNB)$/.test(upper)) {
    // Known meme suffix list
    const MEME_SUFFIXES = ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME', 'NEIRO', 'POPCAT', 'BOME', 'TURBO', 'MOG'];
    const baseSymbol = upper.replace(/(USDT|BTC|ETH|BNB)$/, '');
    if (MEME_SUFFIXES.some((m) => baseSymbol.includes(m))) {
      return { assetClass: 'memecoin', binancePair: upper };
    }
    return { assetClass: 'crypto', binancePair: upper };
  }

  // Forex heuristic: ends with =X
  if (upper.endsWith('=X')) {
    return { assetClass: 'forex', yahooTicker: symbol };
  }

  // Futures/commodity heuristic: ends with =F
  if (upper.endsWith('=F')) {
    const COMMODITY_FUTURES = ['GC', 'SI', 'CL', 'BZ', 'NG', 'HG', 'ZW', 'ZC', 'ZS', 'PL', 'PA', 'KC', 'CC', 'CT'];
    const base = upper.replace('=F', '');
    if (COMMODITY_FUTURES.includes(base)) {
      return { assetClass: 'commodity', yahooTicker: symbol };
    }
    return { assetClass: 'futures', yahooTicker: symbol };
  }

  // Index heuristic: starts with ^
  if (upper.startsWith('^')) {
    return { assetClass: 'index', yahooTicker: symbol };
  }

  // Indonesian stock heuristic: ends with .JK
  if (upper.endsWith('.JK')) {
    return { assetClass: 'stock_id', yahooTicker: symbol };
  }

  // Exchange suffix heuristics
  if (/\.AX$/i.test(upper))  return { assetClass: 'stock_au', yahooTicker: symbol };
  if (/\.(KS|KQ)$/i.test(upper)) return { assetClass: 'stock_kr', yahooTicker: symbol };
  if (/\.(T|TYO)$/i.test(upper)) return { assetClass: 'stock_jp', yahooTicker: symbol };
  if (/\.(NS|BO)$/i.test(upper)) return { assetClass: 'stock_in', yahooTicker: symbol };
  if (/\.(DE|PA|AS|L|SW|CO|MI|MC|ST|HE|OL|BE|VI)$/i.test(upper)) {
    return { assetClass: 'stock_eu', yahooTicker: symbol };
  }

  // Saudi stock heuristic: ends with .SR
  if (upper.endsWith('.SR') || /^\d{4}\.SR$/.test(upper)) {
    return { assetClass: 'stock_sa', yahooTicker: symbol };
  }

  // Chinese ADR symbols (known list)
  const CHINESE_ADRS = ['BABA', 'JD', 'PDD', 'BIDU', 'TCEHY', 'NTES', 'TME', 'EDU', 'TAL', 'VIPS', 'WB', 'MOMO', 'IQ', 'BILI', 'DIDI', 'DIDIY'];
  if (CHINESE_ADRS.includes(upper)) {
    return { assetClass: 'stock_cn', yahooTicker: symbol };
  }

  // Default: assume US stock
  return { assetClass: 'stock_us', yahooTicker: symbol };
}
