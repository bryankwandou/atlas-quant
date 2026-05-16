/**
 * FOREX + COMMODITY + INDEX + ETF + BOND registry.
 * Symbol Yahoo Finance: EURUSD=X, GC=F (Gold), ^GSPC (S&P 500), TLT (ETF), ZN=F (T-Note).
 */
import type { Asset } from '@/domain/asset';

const fx = (sym: string, name: string, base: string, quote: string, kind: 'major' | 'minor' | 'exotic'): Asset => ({
  symbol: sym,
  base,
  quote,
  assetClass: 'forex',
  exchange: 'FX',
  name,
  description: `${base} vs ${quote} spot rate (${kind}).`,
  country: 'Global',
  currency: quote,
  decimals: 5,
  isTradable: true,
  isListed: true,
  tags: ['forex', kind, base.toLowerCase(), quote.toLowerCase()],
  aliases: [`${base}/${quote}`, `${base}${quote}`],
});

export const FOREX: Asset[] = [
  // === MAJORS ===
  fx('EURUSD=X', 'Euro / US Dollar', 'EUR', 'USD', 'major'),
  fx('GBPUSD=X', 'British Pound / US Dollar', 'GBP', 'USD', 'major'),
  fx('USDJPY=X', 'US Dollar / Japanese Yen', 'USD', 'JPY', 'major'),
  fx('USDCHF=X', 'US Dollar / Swiss Franc', 'USD', 'CHF', 'major'),
  fx('AUDUSD=X', 'Australian Dollar / US Dollar', 'AUD', 'USD', 'major'),
  fx('NZDUSD=X', 'New Zealand Dollar / US Dollar', 'NZD', 'USD', 'major'),
  fx('USDCAD=X', 'US Dollar / Canadian Dollar', 'USD', 'CAD', 'major'),

  // === MINORS / CROSSES ===
  fx('EURGBP=X', 'Euro / British Pound', 'EUR', 'GBP', 'minor'),
  fx('EURJPY=X', 'Euro / Japanese Yen', 'EUR', 'JPY', 'minor'),
  fx('GBPJPY=X', 'British Pound / Japanese Yen', 'GBP', 'JPY', 'minor'),
  fx('AUDJPY=X', 'Australian Dollar / Japanese Yen', 'AUD', 'JPY', 'minor'),
  fx('CHFJPY=X', 'Swiss Franc / Japanese Yen', 'CHF', 'JPY', 'minor'),
  fx('EURAUD=X', 'Euro / Australian Dollar', 'EUR', 'AUD', 'minor'),
  fx('EURCHF=X', 'Euro / Swiss Franc', 'EUR', 'CHF', 'minor'),
  fx('EURCAD=X', 'Euro / Canadian Dollar', 'EUR', 'CAD', 'minor'),
  fx('GBPCHF=X', 'British Pound / Swiss Franc', 'GBP', 'CHF', 'minor'),
  fx('GBPAUD=X', 'British Pound / Australian Dollar', 'GBP', 'AUD', 'minor'),
  fx('AUDNZD=X', 'Australian Dollar / NZD', 'AUD', 'NZD', 'minor'),
  fx('CADJPY=X', 'Canadian Dollar / Japanese Yen', 'CAD', 'JPY', 'minor'),

  // === EXOTICS / EM ===
  fx('USDIDR=X', 'US Dollar / Indonesian Rupiah', 'USD', 'IDR', 'exotic'),
  fx('USDSGD=X', 'US Dollar / Singapore Dollar', 'USD', 'SGD', 'exotic'),
  fx('USDHKD=X', 'US Dollar / Hong Kong Dollar', 'USD', 'HKD', 'exotic'),
  fx('USDCNY=X', 'US Dollar / Chinese Yuan', 'USD', 'CNY', 'exotic'),
  fx('USDINR=X', 'US Dollar / Indian Rupee', 'USD', 'INR', 'exotic'),
  fx('USDKRW=X', 'US Dollar / South Korean Won', 'USD', 'KRW', 'exotic'),
  fx('USDTRY=X', 'US Dollar / Turkish Lira', 'USD', 'TRY', 'exotic'),
  fx('USDMXN=X', 'US Dollar / Mexican Peso', 'USD', 'MXN', 'exotic'),
  fx('USDZAR=X', 'US Dollar / South African Rand', 'USD', 'ZAR', 'exotic'),
  fx('USDBRL=X', 'US Dollar / Brazilian Real', 'USD', 'BRL', 'exotic'),
  fx('USDTHB=X', 'US Dollar / Thai Baht', 'USD', 'THB', 'exotic'),
  fx('USDMYR=X', 'US Dollar / Malaysian Ringgit', 'USD', 'MYR', 'exotic'),
  fx('USDPHP=X', 'US Dollar / Philippine Peso', 'USD', 'PHP', 'exotic'),
  fx('USDVND=X', 'US Dollar / Vietnamese Dong', 'USD', 'VND', 'exotic'),

  // === Dollar Index ===
  {
    symbol: 'DX-Y.NYB',
    base: 'DXY',
    quote: 'USD',
    assetClass: 'forex',
    exchange: 'ICE',
    name: 'US Dollar Index (DXY)',
    description: 'Trade-weighted USD basket.',
    decimals: 3,
    isTradable: true,
    isListed: true,
    tags: ['forex', 'index', 'dxy'],
    aliases: ['DXY', 'USDX'],
    country: 'US',
    currency: 'USD',
  },
];

// === COMMODITIES (futures via Yahoo =F) ===
const cm = (sym: string, name: string, category: string): Asset => ({
  symbol: sym,
  base: sym.replace('=F', ''),
  quote: 'USD',
  assetClass: 'commodity',
  exchange: 'CME/NYMEX/COMEX',
  name,
  description: `${name} futures front-month.`,
  sector: category,
  currency: 'USD',
  decimals: 2,
  isTradable: true,
  isListed: true,
  tags: ['commodity', category.toLowerCase()],
  aliases: [name],
});

export const COMMODITIES: Asset[] = [
  // === ENERGY ===
  cm('CL=F', 'WTI Crude Oil', 'Energy'),
  cm('BZ=F', 'Brent Crude Oil', 'Energy'),
  cm('NG=F', 'Natural Gas', 'Energy'),
  cm('HO=F', 'Heating Oil', 'Energy'),
  cm('RB=F', 'RBOB Gasoline', 'Energy'),
  cm('UCO', 'ProShares 2x Crude (ETF)', 'Energy'),

  // === METALS ===
  cm('GC=F', 'Gold', 'Metals'),
  cm('SI=F', 'Silver', 'Metals'),
  cm('HG=F', 'Copper', 'Metals'),
  cm('PA=F', 'Palladium', 'Metals'),
  cm('PL=F', 'Platinum', 'Metals'),
  cm('ALI=F', 'Aluminum', 'Metals'),

  // === AGRICULTURE ===
  cm('ZC=F', 'Corn', 'Agriculture'),
  cm('ZW=F', 'Wheat', 'Agriculture'),
  cm('ZS=F', 'Soybeans', 'Agriculture'),
  cm('ZM=F', 'Soybean Meal', 'Agriculture'),
  cm('ZL=F', 'Soybean Oil', 'Agriculture'),
  cm('CT=F', 'Cotton', 'Agriculture'),
  cm('SB=F', 'Sugar', 'Agriculture'),
  cm('KC=F', 'Coffee', 'Agriculture'),
  cm('CC=F', 'Cocoa', 'Agriculture'),
  cm('OJ=F', 'Orange Juice', 'Agriculture'),
  cm('LBR=F', 'Lumber', 'Agriculture'),

  // === LIVESTOCK ===
  cm('LE=F', 'Live Cattle', 'Livestock'),
  cm('HE=F', 'Lean Hogs', 'Livestock'),
  cm('GF=F', 'Feeder Cattle', 'Livestock'),
];

// === INDICES ===
const idx = (sym: string, name: string, country: string, exchange: string): Asset => ({
  symbol: sym,
  base: sym.replace('^', ''),
  quote: 'USD',
  assetClass: 'index',
  exchange,
  name,
  description: `${name} stock market index.`,
  country,
  currency: 'USD',
  decimals: 2,
  isTradable: false,
  isListed: true,
  tags: ['index', country.toLowerCase()],
  aliases: [name],
});

export const INDICES: Asset[] = [
  // === US ===
  idx('^GSPC', 'S&P 500', 'US', 'NYSE'),
  idx('^DJI', 'Dow Jones Industrial Average', 'US', 'NYSE'),
  idx('^IXIC', 'NASDAQ Composite', 'US', 'NASDAQ'),
  idx('^NDX', 'NASDAQ 100', 'US', 'NASDAQ'),
  idx('^RUT', 'Russell 2000', 'US', 'NYSE'),
  idx('^VIX', 'CBOE Volatility Index', 'US', 'CBOE'),
  idx('^MID', 'S&P 400 MidCap', 'US', 'NYSE'),
  idx('^XAX', 'NYSE AMEX Composite', 'US', 'NYSE'),
  idx('^SOX', 'PHLX Semiconductor', 'US', 'NASDAQ'),

  // === EUROPE ===
  idx('^FTSE', 'FTSE 100', 'GB', 'LSE'),
  idx('^GDAXI', 'DAX 40', 'DE', 'XETRA'),
  idx('^FCHI', 'CAC 40', 'FR', 'PAR'),
  idx('^STOXX50E', 'EURO STOXX 50', 'EU', 'EUREX'),
  idx('^IBEX', 'IBEX 35', 'ES', 'MAD'),
  idx('^FTSEMIB.MI', 'FTSE MIB', 'IT', 'MIL'),

  // === ASIA ===
  idx('^N225', 'Nikkei 225', 'JP', 'TSE'),
  idx('^HSI', 'Hang Seng', 'HK', 'HKEX'),
  idx('^KS11', 'KOSPI', 'KR', 'KRX'),
  idx('^TWII', 'Taiwan Weighted', 'TW', 'TWSE'),
  idx('^STI', 'Straits Times Index', 'SG', 'SGX'),
  idx('^JKSE', 'IDX Composite (Jakarta)', 'ID', 'IDX'),
  idx('^KLSE', 'FTSE Bursa Malaysia KLCI', 'MY', 'KLSE'),
  idx('^BSESN', 'BSE SENSEX', 'IN', 'BSE'),
  idx('^NSEI', 'NIFTY 50', 'IN', 'NSE'),
  idx('^AXJO', 'S&P/ASX 200', 'AU', 'ASX'),
  idx('^SSEC', 'Shanghai Composite', 'CN', 'SSE'),
  idx('^SZSE', 'Shenzhen Component', 'CN', 'SZSE'),

  // === LATAM / AFRICA / MENA ===
  idx('^BVSP', 'IBOVESPA', 'BR', 'B3'),
  idx('^MERV', 'MERVAL', 'AR', 'BCBA'),
  idx('^MXX', 'IPC Mexico', 'MX', 'BMV'),
  idx('^JN0U.JO', 'Johannesburg All Share', 'ZA', 'JSE'),
  idx('^TA125.TA', 'TA-125', 'IL', 'TASE'),
  idx('^TASI.SR', 'Tadawul All Share', 'SA', 'TADAWUL'),

  // === BOND YIELDS (as indices) ===
  idx('^TNX', 'CBOE 10-Year Treasury Yield', 'US', 'CBOE'),
  idx('^TYX', 'CBOE 30-Year Treasury Yield', 'US', 'CBOE'),
  idx('^FVX', 'CBOE 5-Year Treasury Yield', 'US', 'CBOE'),
  idx('^IRX', 'CBOE 13-Week Treasury Bill', 'US', 'CBOE'),
];

// === ETFs (popular) ===
const etf = (sym: string, name: string, family: string): Asset => ({
  symbol: sym,
  base: sym,
  quote: 'USD',
  assetClass: 'etf',
  exchange: 'ARCA',
  name,
  description: `${name} exchange-traded fund.`,
  country: 'US',
  currency: 'USD',
  decimals: 2,
  isTradable: true,
  isListed: true,
  tags: ['etf', family.toLowerCase()],
  aliases: [name],
});

export const ETFS: Asset[] = [
  etf('SPY', 'SPDR S&P 500 ETF', 'Broad Market'),
  etf('QQQ', 'Invesco QQQ Trust (Nasdaq-100)', 'Broad Market'),
  etf('DIA', 'SPDR Dow Jones Industrial Average ETF', 'Broad Market'),
  etf('IWM', 'iShares Russell 2000 ETF', 'Small Cap'),
  etf('VTI', 'Vanguard Total Stock Market ETF', 'Broad Market'),
  etf('VOO', 'Vanguard S&P 500 ETF', 'Broad Market'),
  etf('VEA', 'Vanguard FTSE Developed Markets', 'International'),
  etf('VWO', 'Vanguard FTSE Emerging Markets', 'Emerging'),
  etf('EEM', 'iShares MSCI Emerging Markets', 'Emerging'),
  etf('XLF', 'Financial Select Sector SPDR', 'Sector'),
  etf('XLK', 'Technology Select Sector SPDR', 'Sector'),
  etf('XLE', 'Energy Select Sector SPDR', 'Sector'),
  etf('XLV', 'Health Care Select Sector SPDR', 'Sector'),
  etf('XLI', 'Industrial Select Sector SPDR', 'Sector'),
  etf('XLY', 'Consumer Discretionary Select Sector SPDR', 'Sector'),
  etf('XLP', 'Consumer Staples Select Sector SPDR', 'Sector'),
  etf('XLU', 'Utilities Select Sector SPDR', 'Sector'),
  etf('XLB', 'Materials Select Sector SPDR', 'Sector'),
  etf('XLRE', 'Real Estate Select Sector SPDR', 'Sector'),
  etf('XLC', 'Communication Services Select Sector SPDR', 'Sector'),
  etf('SOXX', 'iShares Semiconductor ETF', 'Thematic'),
  etf('SMH', 'VanEck Semiconductor ETF', 'Thematic'),
  etf('ARKK', 'ARK Innovation ETF', 'Thematic'),
  etf('ARKG', 'ARK Genomic Revolution ETF', 'Thematic'),
  etf('ARKW', 'ARK Next Generation Internet ETF', 'Thematic'),
  etf('BOTZ', 'Global X Robotics & AI ETF', 'Thematic'),
  etf('TLT', 'iShares 20+ Year Treasury Bond', 'Bond'),
  etf('IEF', 'iShares 7-10 Year Treasury Bond', 'Bond'),
  etf('SHY', 'iShares 1-3 Year Treasury Bond', 'Bond'),
  etf('AGG', 'iShares Core US Aggregate Bond', 'Bond'),
  etf('LQD', 'iShares iBoxx $ Investment Grade Corporate Bond', 'Bond'),
  etf('HYG', 'iShares iBoxx $ High Yield Corporate Bond', 'Bond'),
  etf('GLD', 'SPDR Gold Shares', 'Commodity'),
  etf('SLV', 'iShares Silver Trust', 'Commodity'),
  etf('USO', 'United States Oil Fund', 'Commodity'),
  etf('UNG', 'United States Natural Gas Fund', 'Commodity'),
  etf('DBA', 'Invesco DB Agriculture Fund', 'Commodity'),
  etf('FXI', 'iShares China Large-Cap', 'International'),
  etf('EWZ', 'iShares MSCI Brazil', 'International'),
  etf('EWJ', 'iShares MSCI Japan', 'International'),
  etf('INDA', 'iShares MSCI India', 'International'),
  etf('EIDO', 'iShares MSCI Indonesia', 'International'),
  etf('BITO', 'ProShares Bitcoin Strategy ETF', 'Crypto'),
  etf('IBIT', 'iShares Bitcoin Trust', 'Crypto'),
  etf('FBTC', 'Fidelity Wise Origin Bitcoin Fund', 'Crypto'),
  etf('ETHA', 'iShares Ethereum Trust', 'Crypto'),
  etf('TQQQ', 'ProShares UltraPro QQQ (3x)', 'Leveraged'),
  etf('SQQQ', 'ProShares UltraPro Short QQQ (-3x)', 'Leveraged'),
  etf('UPRO', 'ProShares UltraPro S&P500 (3x)', 'Leveraged'),
  etf('SPXU', 'ProShares UltraPro Short S&P500 (-3x)', 'Leveraged'),
];

// === BONDS (sovereign) ===
export const BONDS: Asset[] = [
  {
    symbol: 'ZN=F',
    base: 'US10Y',
    quote: 'USD',
    assetClass: 'bond',
    exchange: 'CBOT',
    name: '10-Year T-Note Futures',
    description: 'Benchmark US 10-year Treasury Note futures.',
    country: 'US',
    currency: 'USD',
    decimals: 4,
    isTradable: true,
    isListed: true,
    tags: ['bond', 'us', 'futures'],
    aliases: ['10Y', 'US10Y'],
  },
  {
    symbol: 'ZB=F',
    base: 'US30Y',
    quote: 'USD',
    assetClass: 'bond',
    exchange: 'CBOT',
    name: '30-Year T-Bond Futures',
    description: 'US 30-year Treasury Bond futures.',
    country: 'US',
    currency: 'USD',
    decimals: 4,
    isTradable: true,
    isListed: true,
    tags: ['bond', 'us', 'futures'],
    aliases: ['30Y'],
  },
];
