export type AssetClass =
  | 'crypto'
  | 'stock_us'
  | 'stock_cn'
  | 'stock_id'
  | 'stock_eu'
  | 'stock_sa'
  | 'index'
  | 'commodity'
  | 'futures'
  | 'forex'
  | 'memecoin'
  | 'dex';

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
  index: 'Global Indices',
  commodity: 'Commodities',
  futures: 'Futures',
  forex: 'Forex',
  memecoin: 'Memecoins',
  dex: 'DEX Tokens',
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
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────

const _catalogMap = new Map<string, SymbolMeta>(
  SYMBOL_CATALOG.map((s) => [s.symbol.toUpperCase(), s])
);

export function getSymbolMeta(symbol: string): SymbolMeta | undefined {
  return _catalogMap.get(symbol.toUpperCase());
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

  // European stock heuristic: contains a dot followed by known exchange suffix
  if (/\.(DE|PA|AS|L|SW|CO|MI|MC)$/i.test(upper)) {
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
