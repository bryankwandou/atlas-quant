import { NextRequest, NextResponse } from 'next/server';

const BINANCE_BASE = process.env.BINANCE_BASE_URL || 'https://api.binance.com/api/v3';

/** Crypto/memecoin lists sourced from Binance */
const MEMECOIN_SYMBOLS = [
  'DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT', 'FLOKIUSDT', 'BONKUSDT', 'WIFUSDT',
  'MEMEUSDT', 'NEIROUSDT', 'POPCATUSDT', 'BOMEUSDT', 'TURBOUSDT', 'MOGUSDT',
  'CATIUSDT', 'HMSTRUSDT', 'NOTUSDT', '1000SATSUSDT', 'RATSUSDT',
];

const MEMECOIN_NAMES: Record<string, string> = {
  DOGEUSDT: 'Dogecoin', SHIBUSDT: 'Shiba Inu', PEPEUSDT: 'Pepe',
  FLOKIUSDT: 'Floki', BONKUSDT: 'Bonk', WIFUSDT: 'dogwifhat',
  MEMEUSDT: 'Meme Coin', NEIROUSDT: 'Neiro', POPCATUSDT: 'Popcat',
  BOMEUSDT: 'Book of Meme', TURBOUSDT: 'Turbo', MOGUSDT: 'Mog Coin',
};

/** Static catalog for non-crypto assets */
const STATIC_CATALOG: Record<string, { symbol: string; name: string; exchange: string; assetClass: string }[]> = {
  index: [
    { symbol: '^GSPC',    name: 'S&P 500',          exchange: 'INDEX', assetClass: 'index' },
    { symbol: '^IXIC',    name: 'NASDAQ Composite',  exchange: 'INDEX', assetClass: 'index' },
    { symbol: '^DJI',     name: 'Dow Jones',         exchange: 'INDEX', assetClass: 'index' },
    { symbol: '^RUT',     name: 'Russell 2000',      exchange: 'INDEX', assetClass: 'index' },
    { symbol: '^VIX',     name: 'CBOE Volatility',   exchange: 'CBOE',  assetClass: 'index' },
    { symbol: '^N225',    name: 'Nikkei 225',        exchange: 'TYO',   assetClass: 'index' },
    { symbol: '^HSI',     name: 'Hang Seng',         exchange: 'HKEX',  assetClass: 'index' },
    { symbol: '^GDAXI',   name: 'DAX 40',            exchange: 'XETRA', assetClass: 'index' },
    { symbol: '^FTSE',    name: 'FTSE 100',          exchange: 'LSE',   assetClass: 'index' },
    { symbol: '^FCHI',    name: 'CAC 40',            exchange: 'EPA',   assetClass: 'index' },
    { symbol: '^STOXX50E',name: 'Euro Stoxx 50',     exchange: 'INDEX', assetClass: 'index' },
    { symbol: 'JKSE',     name: 'IDX Composite',     exchange: 'IDX',   assetClass: 'index' },
    { symbol: '^KLSE',    name: 'KLCI Malaysia',     exchange: 'BM',    assetClass: 'index' },
    { symbol: '^BSESN',   name: 'BSE Sensex',        exchange: 'BSE',   assetClass: 'index' },
    { symbol: '^NSEI',    name: 'Nifty 50',          exchange: 'NSE',   assetClass: 'index' },
    { symbol: '^TWII',    name: 'Taiwan Weighted',   exchange: 'TWSE',  assetClass: 'index' },
    { symbol: '^KS11',    name: 'KOSPI',             exchange: 'KRX',   assetClass: 'index' },
    { symbol: '^SET.BK',  name: 'SET Thailand',      exchange: 'SET',   assetClass: 'index' },
    { symbol: '^AORD',    name: 'ASX All Ordinaries',exchange: 'ASX',   assetClass: 'index' },
    { symbol: '^MXX',     name: 'IPC Mexico',        exchange: 'BMV',   assetClass: 'index' },
  ],
  commodity: [
    { symbol: 'GC=F',  name: 'Gold Futures',       exchange: 'COMEX', assetClass: 'commodity' },
    { symbol: 'SI=F',  name: 'Silver Futures',      exchange: 'COMEX', assetClass: 'commodity' },
    { symbol: 'CL=F',  name: 'WTI Crude Oil',       exchange: 'NYMEX', assetClass: 'commodity' },
    { symbol: 'BZ=F',  name: 'Brent Crude Oil',     exchange: 'ICE',   assetClass: 'commodity' },
    { symbol: 'NG=F',  name: 'Natural Gas',         exchange: 'NYMEX', assetClass: 'commodity' },
    { symbol: 'HG=F',  name: 'Copper Futures',      exchange: 'COMEX', assetClass: 'commodity' },
    { symbol: 'ZW=F',  name: 'Wheat Futures',       exchange: 'CBOT',  assetClass: 'commodity' },
    { symbol: 'ZC=F',  name: 'Corn Futures',        exchange: 'CBOT',  assetClass: 'commodity' },
    { symbol: 'ZS=F',  name: 'Soybeans Futures',    exchange: 'CBOT',  assetClass: 'commodity' },
    { symbol: 'PL=F',  name: 'Platinum Futures',    exchange: 'NYMEX', assetClass: 'commodity' },
    { symbol: 'PA=F',  name: 'Palladium Futures',   exchange: 'NYMEX', assetClass: 'commodity' },
    { symbol: 'KC=F',  name: 'Coffee Futures',      exchange: 'ICE',   assetClass: 'commodity' },
    { symbol: 'CC=F',  name: 'Cocoa Futures',       exchange: 'ICE',   assetClass: 'commodity' },
    { symbol: 'CT=F',  name: 'Cotton Futures',      exchange: 'ICE',   assetClass: 'commodity' },
    { symbol: 'LE=F',  name: 'Live Cattle',         exchange: 'CME',   assetClass: 'commodity' },
    { symbol: 'LBS=F', name: 'Lumber Futures',      exchange: 'CME',   assetClass: 'commodity' },
  ],
  futures: [
    { symbol: 'ES=F',  name: 'S&P 500 E-mini',      exchange: 'CME',   assetClass: 'futures' },
    { symbol: 'NQ=F',  name: 'NASDAQ E-mini',        exchange: 'CME',   assetClass: 'futures' },
    { symbol: 'YM=F',  name: 'DOW Jones E-mini',     exchange: 'CBOT',  assetClass: 'futures' },
    { symbol: 'RTY=F', name: 'Russell 2000 E-mini',  exchange: 'CME',   assetClass: 'futures' },
    { symbol: 'CL=F',  name: 'Crude Oil Futures',    exchange: 'NYMEX', assetClass: 'futures' },
    { symbol: 'GC=F',  name: 'Gold Futures',         exchange: 'COMEX', assetClass: 'futures' },
    { symbol: 'SI=F',  name: 'Silver Futures',       exchange: 'COMEX', assetClass: 'futures' },
    { symbol: 'ZB=F',  name: 'US 30Y Bond',          exchange: 'CBOT',  assetClass: 'futures' },
    { symbol: 'ZN=F',  name: 'US 10Y Note',          exchange: 'CBOT',  assetClass: 'futures' },
    { symbol: '6E=F',  name: 'Euro FX Futures',      exchange: 'CME',   assetClass: 'futures' },
    { symbol: '6J=F',  name: 'Japanese Yen Futures', exchange: 'CME',   assetClass: 'futures' },
  ],
  forex: [
    { symbol: 'EURUSD=X', name: 'Euro / US Dollar',         exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'GBPUSD=X', name: 'British Pound / US Dollar',exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDJPY=X', name: 'US Dollar / Japanese Yen', exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'AUDUSD=X', name: 'Australian Dollar / USD',  exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDCAD=X', name: 'US Dollar / Canadian $',   exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDCHF=X', name: 'US Dollar / Swiss Franc',  exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'NZDUSD=X', name: 'New Zealand $ / USD',      exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDIDR=X', name: 'US Dollar / Indonesian Rp',exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDSGD=X', name: 'US Dollar / Singapore $',  exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDMYR=X', name: 'US Dollar / Malaysian RM', exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDTHB=X', name: 'US Dollar / Thai Baht',    exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDPHP=X', name: 'US Dollar / Philippine ₱', exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'GBPJPY=X', name: 'British Pound / Yen',      exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'EURJPY=X', name: 'Euro / Japanese Yen',      exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'AUDJPY=X', name: 'Australian $ / Yen',       exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'EURGBP=X', name: 'Euro / British Pound',     exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDCNY=X', name: 'US Dollar / Chinese Yuan', exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDHKD=X', name: 'US Dollar / HK Dollar',    exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDKRW=X', name: 'US Dollar / Korean Won',   exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDINR=X', name: 'US Dollar / Indian Rupee', exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDSAR=X', name: 'US Dollar / Saudi Riyal',  exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDAED=X', name: 'US Dollar / UAE Dirham',   exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDTRY=X', name: 'US Dollar / Turkish Lira', exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDZAR=X', name: 'US Dollar / South African R', exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDBRL=X', name: 'US Dollar / Brazilian Real', exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDMXN=X', name: 'US Dollar / Mexican Peso', exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDSEK=X', name: 'US Dollar / Swedish Krona',exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDNOK=X', name: 'US Dollar / Norwegian Krone', exchange: 'FOREX', assetClass: 'forex' },
    { symbol: 'USDPLN=X', name: 'US Dollar / Polish Zloty', exchange: 'FOREX', assetClass: 'forex' },
  ],
  stock_us: [
    { symbol: 'AAPL',  name: 'Apple Inc.',            exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'MSFT',  name: 'Microsoft Corp.',        exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'NVDA',  name: 'NVIDIA Corp.',           exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'AMZN',  name: 'Amazon.com Inc.',        exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.',          exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'META',  name: 'Meta Platforms Inc.',    exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'TSLA',  name: 'Tesla Inc.',             exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'JPM',   name: 'JPMorgan Chase & Co.',  exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'V',     name: 'Visa Inc.',              exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'MA',    name: 'Mastercard Inc.',        exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'UNH',   name: 'UnitedHealth Group',    exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'XOM',   name: 'ExxonMobil Corp.',      exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'AVGO',  name: 'Broadcom Inc.',          exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'AMD',   name: 'Advanced Micro Devices', exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'INTC',  name: 'Intel Corp.',            exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'CRM',   name: 'Salesforce Inc.',        exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'ORCL',  name: 'Oracle Corp.',           exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'NFLX',  name: 'Netflix Inc.',           exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'DIS',   name: 'Walt Disney Co.',        exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'BA',    name: 'Boeing Co.',             exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'GS',    name: 'Goldman Sachs Group',   exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'MS',    name: 'Morgan Stanley',         exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'PYPL',  name: 'PayPal Holdings',        exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'UBER',  name: 'Uber Technologies',      exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'SNAP',  name: 'Snap Inc.',              exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'COIN',  name: 'Coinbase Global',        exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'PLTR',  name: 'Palantir Technologies',  exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'RIVN',  name: 'Rivian Automotive',      exchange: 'NASDAQ', assetClass: 'stock_us' },
    { symbol: 'F',     name: 'Ford Motor Co.',         exchange: 'NYSE',   assetClass: 'stock_us' },
    { symbol: 'GM',    name: 'General Motors Co.',     exchange: 'NYSE',   assetClass: 'stock_us' },
  ],
  stock_cn: [
    { symbol: 'BABA',  name: 'Alibaba Group',    exchange: 'NYSE',   assetClass: 'stock_cn' },
    { symbol: 'JD',    name: 'JD.com Inc.',      exchange: 'NASDAQ', assetClass: 'stock_cn' },
    { symbol: 'PDD',   name: 'PDD Holdings',     exchange: 'NASDAQ', assetClass: 'stock_cn' },
    { symbol: 'BIDU',  name: 'Baidu Inc.',       exchange: 'NASDAQ', assetClass: 'stock_cn' },
    { symbol: 'NIO',   name: 'NIO Inc.',         exchange: 'NYSE',   assetClass: 'stock_cn' },
    { symbol: 'XPEV',  name: 'XPeng Inc.',       exchange: 'NYSE',   assetClass: 'stock_cn' },
    { symbol: 'LI',    name: 'Li Auto Inc.',     exchange: 'NASDAQ', assetClass: 'stock_cn' },
    { symbol: 'TCEHY', name: 'Tencent Holdings', exchange: 'OTC',    assetClass: 'stock_cn' },
    { symbol: 'NTES',  name: 'NetEase Inc.',     exchange: 'NASDAQ', assetClass: 'stock_cn' },
    { symbol: 'TME',   name: 'Tencent Music',    exchange: 'NYSE',   assetClass: 'stock_cn' },
    { symbol: 'VIPS',  name: 'Vipshop Holdings', exchange: 'NYSE',   assetClass: 'stock_cn' },
    { symbol: 'WB',    name: 'Weibo Corp.',      exchange: 'NASDAQ', assetClass: 'stock_cn' },
    { symbol: 'BILI',  name: 'Bilibili Inc.',    exchange: 'NASDAQ', assetClass: 'stock_cn' },
    { symbol: 'IQ',    name: 'iQIYI Inc.',       exchange: 'NASDAQ', assetClass: 'stock_cn' },
    { symbol: 'DIDI',  name: 'DiDi Global',      exchange: 'OTC',    assetClass: 'stock_cn' },
  ],
  stock_id: [
    { symbol: 'BBCA.JK', name: 'Bank Central Asia',     exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'BMRI.JK', name: 'Bank Mandiri',           exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'BBRI.JK', name: 'Bank Rakyat Indonesia',  exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'BBNI.JK', name: 'Bank Negara Indonesia',  exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'TLKM.JK', name: 'Telkom Indonesia',       exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'ASII.JK', name: 'Astra International',    exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'UNVR.JK', name: 'Unilever Indonesia',     exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'HMSP.JK', name: 'HM Sampoerna',           exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'ICBP.JK', name: 'Indofood CBP',           exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'INDF.JK', name: 'Indofood Sukses',        exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'GOTO.JK', name: 'GoTo Gojek Tokopedia',   exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'BREN.JK', name: 'Barito Renewables',      exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'ADRO.JK', name: 'Adaro Energy',           exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'PTBA.JK', name: 'Bukit Asam',             exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'ANTM.JK', name: 'Aneka Tambang',          exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'PGAS.JK', name: 'Perusahaan Gas Negara',  exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'JSMR.JK', name: 'Jasa Marga',             exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'KLBF.JK', name: 'Kalbe Farma',            exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'CPIN.JK', name: 'Charoen Pokphand Indonesia', exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'INCO.JK', name: 'Vale Indonesia',         exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'INKP.JK', name: 'Indah Kiat Pulp & Paper',exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'WSKT.JK', name: 'Waskita Karya',          exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'MDKA.JK', name: 'Merdeka Copper Gold',    exchange: 'IDX', assetClass: 'stock_id' },
    { symbol: 'BUMI.JK', name: 'Bumi Resources',         exchange: 'IDX', assetClass: 'stock_id' },
  ],
  stock_eu: [
    { symbol: 'ASML.AS',   name: 'ASML Holding',        exchange: 'AMS',   assetClass: 'stock_eu' },
    { symbol: 'MC.PA',     name: 'LVMH',                 exchange: 'EPA',   assetClass: 'stock_eu' },
    { symbol: 'SAP.DE',    name: 'SAP SE',               exchange: 'XETRA', assetClass: 'stock_eu' },
    { symbol: 'NESN.SW',   name: 'Nestlé SA',            exchange: 'SIX',   assetClass: 'stock_eu' },
    { symbol: 'NOVO-B.CO', name: 'Novo Nordisk',         exchange: 'CPH',   assetClass: 'stock_eu' },
    { symbol: 'OR.PA',     name: 'L\'Oréal SA',          exchange: 'EPA',   assetClass: 'stock_eu' },
    { symbol: 'SIE.DE',    name: 'Siemens AG',           exchange: 'XETRA', assetClass: 'stock_eu' },
    { symbol: 'ALV.DE',    name: 'Allianz SE',           exchange: 'XETRA', assetClass: 'stock_eu' },
    { symbol: 'BAS.DE',    name: 'BASF SE',              exchange: 'XETRA', assetClass: 'stock_eu' },
    { symbol: 'BMW.DE',    name: 'BMW AG',               exchange: 'XETRA', assetClass: 'stock_eu' },
    { symbol: 'VOW3.DE',   name: 'Volkswagen AG',        exchange: 'XETRA', assetClass: 'stock_eu' },
    { symbol: 'SHEL.L',    name: 'Shell PLC',            exchange: 'LSE',   assetClass: 'stock_eu' },
    { symbol: 'BP.L',      name: 'BP PLC',               exchange: 'LSE',   assetClass: 'stock_eu' },
    { symbol: 'HSBA.L',    name: 'HSBC Holdings',        exchange: 'LSE',   assetClass: 'stock_eu' },
    { symbol: 'AZN.L',     name: 'AstraZeneca PLC',      exchange: 'LSE',   assetClass: 'stock_eu' },
    { symbol: 'GSK.L',     name: 'GSK PLC',              exchange: 'LSE',   assetClass: 'stock_eu' },
    { symbol: 'RIO.L',     name: 'Rio Tinto PLC',        exchange: 'LSE',   assetClass: 'stock_eu' },
    { symbol: 'BHP.L',     name: 'BHP Group',            exchange: 'LSE',   assetClass: 'stock_eu' },
    { symbol: 'TTE.PA',    name: 'TotalEnergies SE',     exchange: 'EPA',   assetClass: 'stock_eu' },
    { symbol: 'AIR.PA',    name: 'Airbus SE',            exchange: 'EPA',   assetClass: 'stock_eu' },
  ],
  stock_sa: [
    { symbol: '2222.SR',   name: 'Saudi Aramco',              exchange: 'TADAWUL', assetClass: 'stock_sa' },
    { symbol: '1120.SR',   name: 'Al Rajhi Banking',          exchange: 'TADAWUL', assetClass: 'stock_sa' },
    { symbol: '1180.SR',   name: 'Al Jazira Bank',            exchange: 'TADAWUL', assetClass: 'stock_sa' },
    { symbol: '2010.SR',   name: 'SABIC',                     exchange: 'TADAWUL', assetClass: 'stock_sa' },
    { symbol: '7010.SR',   name: 'Saudi Telecom (STC)',       exchange: 'TADAWUL', assetClass: 'stock_sa' },
    { symbol: '1050.SR',   name: 'Banque Saudi Fransi',       exchange: 'TADAWUL', assetClass: 'stock_sa' },
    { symbol: '1140.SR',   name: 'Bank AlBilad',              exchange: 'TADAWUL', assetClass: 'stock_sa' },
    { symbol: '2350.SR',   name: 'Saudi Kayan Petrochemical', exchange: 'TADAWUL', assetClass: 'stock_sa' },
    { symbol: '4230.SR',   name: 'Red Sea International',     exchange: 'TADAWUL', assetClass: 'stock_sa' },
    { symbol: '2030.SR',   name: 'Saudi Basic Industries',    exchange: 'TADAWUL', assetClass: 'stock_sa' },
    { symbol: 'EMAAR.DFM', name: 'Emaar Properties',         exchange: 'DFM',     assetClass: 'stock_sa' },
    { symbol: 'FAB.AD',    name: 'First Abu Dhabi Bank',      exchange: 'ADX',     assetClass: 'stock_sa' },
    { symbol: 'DIB.DU',    name: 'Dubai Islamic Bank',        exchange: 'DFM',     assetClass: 'stock_sa' },
  ],
  dex: [
    { symbol: 'SOL/USDC-orca',  name: 'SOL/USDC (Orca)',       exchange: 'ORCA',    assetClass: 'dex' },
    { symbol: 'SOL/USDT-raydm', name: 'SOL/USDT (Raydium)',    exchange: 'RAYDIUM', assetClass: 'dex' },
    { symbol: 'BONK/SOL',       name: 'BONK/SOL (Raydium)',    exchange: 'RAYDIUM', assetClass: 'dex' },
    { symbol: 'WIF/SOL',        name: 'dogwifhat/SOL',         exchange: 'RAYDIUM', assetClass: 'dex' },
    { symbol: 'JUP/USDC',       name: 'Jupiter/USDC',          exchange: 'ORCA',    assetClass: 'dex' },
    { symbol: 'PYTH/USDC',      name: 'Pyth Network/USDC',     exchange: 'ORCA',    assetClass: 'dex' },
    { symbol: 'ORCA/USDC',      name: 'Orca/USDC',             exchange: 'ORCA',    assetClass: 'dex' },
    { symbol: 'RAY/USDC',       name: 'Raydium/USDC',          exchange: 'RAYDIUM', assetClass: 'dex' },
    { symbol: 'FIDA/USDC',      name: 'Bonfida/USDC',          exchange: 'SERUM',   assetClass: 'dex' },
    { symbol: 'MNGO/USDC',      name: 'Mango Markets/USDC',    exchange: 'MANGO',   assetClass: 'dex' },
  ],
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const assetClass = searchParams.get('assetClass') || 'crypto';
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

  // Non-crypto: return from static catalog
  if (assetClass !== 'crypto' && assetClass !== 'memecoin') {
    const symbols = STATIC_CATALOG[assetClass] || [];
    return NextResponse.json({
      symbols: symbols.slice(0, limit),
      count: symbols.length,
      assetClass,
      source: 'catalog',
    });
  }

  // Memecoin: fetch live prices from Binance for known memecoin list
  if (assetClass === 'memecoin') {
    try {
      const res = await fetch(
        `${BINANCE_BASE}/ticker/24hr`,
        { next: { revalidate: 30 } }
      );
      if (res.ok) {
        const tickers = await res.json();
        const tickerMap: Record<string, any> = {};
        tickers.forEach((t: any) => { tickerMap[t.symbol] = t; });
        const symbols = MEMECOIN_SYMBOLS
          .filter(s => tickerMap[s])
          .map(s => ({
            symbol: s,
            name: MEMECOIN_NAMES[s] || s.replace('USDT', ''),
            exchange: 'BINANCE',
            assetClass: 'memecoin',
            price: parseFloat(tickerMap[s].lastPrice),
            change24h: parseFloat(tickerMap[s].priceChangePercent),
            volume24h: parseFloat(tickerMap[s].quoteVolume),
          }));
        return NextResponse.json({ symbols, count: symbols.length, assetClass, source: 'binance' });
      }
    } catch {}
    return NextResponse.json({ symbols: MEMECOIN_SYMBOLS.map(s => ({ symbol: s, name: MEMECOIN_NAMES[s] || s, exchange: 'BINANCE', assetClass: 'memecoin' })), assetClass, source: 'fallback' });
  }

  // Crypto: Binance top USDT pairs
  try {
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr`, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error('Binance error');

    const tickers = await res.json();
    const symbols = tickers
      .filter((t: any) => t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 500_000)
      .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, limit)
      .map((t: any) => ({
        symbol: t.symbol,
        name: t.symbol.replace('USDT', ''),
        exchange: 'BINANCE',
        assetClass: 'crypto',
        price: parseFloat(t.lastPrice),
        change24h: parseFloat(t.priceChangePercent),
        volume24h: parseFloat(t.quoteVolume),
      }));

    return NextResponse.json({ symbols, count: symbols.length, assetClass: 'crypto', source: 'binance' });
  } catch {
    return NextResponse.json({
      symbols: [],
      count: 0,
      assetClass: 'crypto',
      source: 'error',
    }, { status: 502 });
  }
}
