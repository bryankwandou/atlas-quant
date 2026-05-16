/**
 * Atlas Quant · Bulk symbols expansion
 * --------------------------------------------------------------------
 * Programmatically constructs ~500+ additional tickers that supplement
 * the curated symbolCatalog. All entries route to Yahoo Finance (stocks
 * / ETFs / forex / commodities) or Binance/DEX (crypto) through the
 * existing data layer — no hardcoded prices, no dummy data.
 */

import type { SymbolMeta } from './symbolCatalog';

// ── US Equities — S&P 500 + Russell 1000 fragments ───────────────────────────
const US_LARGE_CAP_TICKERS = [
  // Tech mega-caps (extras)
  'CSCO','ADBE','CRM','ORCL','TXN','QCOM','AVGO','INTU','NOW','ADI','LRCX','KLAC','AMAT','MU','MRVL','SNPS','CDNS','PANW','FTNT','CRWD','ZS','OKTA','NET','DDOG','SNOW','MDB','TEAM','WDAY','VEEV','HUBS','DOCU','U','PLTR','RBLX','TWLO','PINS','SHOP','SPOT','UBER','LYFT','ABNB','DASH','RDDT','HOOD','SOFI','AFRM','UPST','SQ',
  // Financials
  'JPM','BAC','WFC','C','GS','MS','SCHW','USB','TFC','PNC','COF','AIG','MET','PRU','ALL','TRV','MMC','AON','SPGI','MCO','BLK','BX','KKR','APO','CG','TROW','BEN','NTRS','STT','BK','AXP','V','MA','PYPL','DFS','SYF','FITB','RF','KEY','HBAN','CMA','ZION','MTB',
  // Healthcare
  'JNJ','UNH','PFE','ABBV','TMO','MRK','ABT','LLY','DHR','BMY','MDT','GILD','AMGN','CVS','CI','HUM','ELV','CNC','MOH','HCA','UHS','THC','DGX','LH','IDXX','REGN','VRTX','BIIB','ALNY','MRNA','BNTX','NVAX','BMRN','INCY','SGEN','ISRG','SYK','EW','BSX','BDX','HOLX','RMD','ZBH','DXCM','PODD','TFX','TDOC',
  // Consumer
  'WMT','PG','KO','PEP','COST','HD','LOW','TGT','DG','DLTR','TJX','ROST','BURL','MCD','SBUX','CMG','QSR','YUM','NKE','LULU','UA','DECK','VFC','RL','TPR','CPRI','CROX','BIRD','HBI','GES','LEVI','EL','CL','KMB','GIS','K','HSY','SJM','MKC','MDLZ','TSN','HRL','CPB','CAG','POST','SAFM','LANC','BGS','TR','PM','MO','STZ','BUD','TAP','SAM',
  // Industrials
  'BA','CAT','DE','HON','LMT','RTX','GE','MMM','UPS','FDX','UNP','CSX','NSC','KSU','CHRW','EXPD','XPO','JBHT','ODFL','SAIA','WAB','TT','PH','ITW','EMR','ETN','ROK','DOV','FTV','IEX','XYL','PNR','GGG','HUBB','RBC','AME','ROP','FAST','GWW','MSM','PWR','MTZ','PRIM','EME','ACM','J','URI','HEI','TDG','TXT','HII','GD',
  // Energy
  'XOM','CVX','COP','EOG','OXY','PSX','MPC','VLO','HES','DVN','FANG','APA','CTRA','MRO','PXD','OVV','SM','LPI','RRC','EQT','AR','CHK','SWN','LNG','TELL','CHRD','MGY','SD','VTLE','HPK','MUR','REI','EPM',
  // Utilities
  'NEE','DUK','SO','D','SRE','AEP','EXC','XEL','PEG','ED','EIX','WEC','ETR','AWK','ES','PPL','CMS','CNP','LNT','DTE','NI','EVRG','PNW','IDA','POR','HE','AVA','OGE','MGEE','ORA','UGI','WTRG','NJR','SR','SWX','SO','HE','PCG',
  // REITs
  'PLD','AMT','EQIX','PSA','SPG','O','WELL','EQR','AVB','ARE','CCI','DLR','EXR','VTR','UDR','MAA','CPT','ESS','HST','BXP','VNO','SLG','HIW','KRC','CUZ','REG','MAC','SKT','TCO','BRX','KIM','FRT','ROIC','SBRA','OHI','LTC','MPW','DOC',
  // Materials
  'LIN','APD','ECL','SHW','PPG','DD','DOW','LYB','FCX','NEM','FNV','GOLD','SCCO','TECK','AA','X','MT','NUE','STLD','CLF','RS','CMC','OLN','FMC','MOS','CF','IPI','EMN','CC','ASH','HUN','TROX','VVV','GRA','CE','BMS','PKG','IP','WRK','SON','GPK','ATR','UFS','REYN',
];

// ── Top ETFs by category ─────────────────────────────────────────────────────
const ETF_TICKERS = [
  // Broad market
  'VOO','VTI','VEA','VWO','IVV','IJH','IJR','IWB','IWV','MGC','SCHB','SCHX','SCHM','SCHA','SCHF','SCHE','SCHC',
  // Sector
  'XLP','XLY','XLI','XLU','XLB','XLRE','XLC','XBI','SOXX','SMH','SOXL','SOXS','IBB','PBE','XOP','XME','XHB','ITB','XRT','XTL','KIE','KRE','KBE','IYR','VNQ','RWR',
  // International
  'EFA','EEM','VXUS','IXUS','ACWI','EWZ','EWJ','EWG','EWU','EWT','EWY','EWA','EWC','EWH','EWS','EZA','TUR','EWW','EPI','INDA','MCHI','FXI','KWEB','EWP','EWQ','EWN','EWI','EWD','EWK','EWL','EPP','RSX','GREK','ARGT','VNM','THD','PIN','IDX',
  // Bonds
  'AGG','BND','BIV','BSV','BLV','TLT','IEF','SHY','LQD','VCIT','VCSH','HYG','JNK','EMB','PCY','MUB','TIP','VTIP','MBB','GOVT','SHV','BIL','SGOV','USFR','FLOT',
  // Commodity
  'IAU','SGOL','SIVR','PALL','PPLT','DBA','DBC','UNG','BNO','PCRB','WEAT','CORN','SOYB','CANE','UGA','DBO','DBE','GSG',
  // Volatility / Inverse
  'UVXY','SVXY','SH','SDS','PSQ','DOG','DXD','SQQQ','SOXS','TZA','SPXS','TVIX','VIXY',
  // Thematic
  'ICLN','TAN','LIT','URA','XME','MOO','PHO','FIW','CIBR','HACK','BUG','ROBO','BOTZ','DRIV','LIT','REMX','BLOK','BITQ','BITO','BITI','ETHE','GBTC',
];

// ── Indonesian Stock Exchange (IDX) top 100 ──────────────────────────────────
const IDX_TICKERS = [
  'BBCA','BBRI','BMRI','BBNI','BRIS','BNGA','BDMN','BTPN','BJBR','BJTM','BNII','MEGA','BNLI','BTPS','SDRA','PNBN',
  'TLKM','EXCL','ISAT','FREN','TBIG','TOWR','LINK','MTEL','IBST','MORA',
  'ASII','UNTR','HEXA','GJTL','MASA','IMAS','PTBA','ITMG','HRUM','MEDC','ADRO','BUMI','BYAN','INDY','MBAP','BSSR',
  'GOTO','BUKA','BELI','ARTO','BNGA','EMTK','SCMA','MNCN','MEDIA','VIVA',
  'ICBP','INDF','MYOR','UNVR','GGRM','HMSP','RMBA','WIIM','KLBF','TSPC','SIDO','KAEF','PRDA','MIKA','SILO','SAME',
  'JSMR','WIKA','WSKT','ADHI','PTPP','TOTL','NRCA','ACST','SSIA','MPMX','IPCC','IPCM','EAST','BIRD','TAXI',
  'PGAS','SGER','SHIP','TPMA','MITI','TOBA','MEDC','ENRG','APEX','RAJA','LUCK','CASS','GENI','SUMI','POWR','PSAB','BRMS','ANTM','TINS','INCO',
  'SMGR','INTP','SMBR','WTON','WSBP','WEGE','BAJA','CPIN','JPFA','MAIN','SIPD','BISI','LSIP','SIMP','SGRO','TBLA','GZCO','ANJT','SSMS',
  'AKRA','APIC','BNBR','BOLT','CITA','DOID','ELSA','GIAA','HRTA','IATA','JTPE','MAPI','MAPB','MAPA','PNLF','PWON','RALS','RANC','SOSS','SUPR',
];

// ── Crypto majors + top alts (Binance USDT pairs) ────────────────────────────
const CRYPTO_USDT_PAIRS = [
  'BTC','ETH','BNB','SOL','XRP','ADA','DOGE','TRX','TON','AVAX','LINK','MATIC','DOT','LTC','BCH','UNI','ATOM','XLM','ETC','FIL',
  'NEAR','APT','OP','ARB','SUI','INJ','SEI','TIA','STX','RUNE','RNDR','FET','OCEAN','AGIX','GRT','LDO','MKR','CRV','AAVE','SNX',
  'COMP','YFI','SUSHI','1INCH','GMX','DYDX','GMT','AXS','SAND','MANA','GALA','ENJ','CHZ','ICP','HBAR','VET','THETA','EOS','XTZ','ZEC','DASH','XMR',
  'PEPE','SHIB','FLOKI','BONK','WIF','BOME','MEME','ORDI','SATS','NEIRO','TURBO','BRETT','POPCAT',
  'WLD','PYTH','JTO','JUP','PYUSD','USDC','USDT','DAI','FDUSD','TUSD',
  'KAS','HNT','RON','BLUR','LOOKS','APE','GMX','VRA','RPL','SSV','ANKR','REN','CELR','SKL','CTSI',
  'IMX','BEAM','PRIME','MAGIC','PIXEL','PORTAL','XAI','ACE','NFP','MAVIA','MERL','OMNI','REZ','LISTA','ZRO','BANANA','RENDER','IO','ZK','LOOKS',
  'ASTR','MINA','MOVR','GLMR','ROSE','KAVA','ZIL','ICX','ONT','ALGO','EGLD','XEM','WAVES','QTUM','BAT','ZRX','LRC','OMG','ENS','SAFE',
];

// ── Forex majors + crosses ───────────────────────────────────────────────────
const FOREX_PAIRS = [
  'EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','NZDUSD','USDCAD',
  'EURGBP','EURJPY','EURCHF','EURAUD','EURNZD','EURCAD',
  'GBPJPY','GBPCHF','GBPAUD','GBPNZD','GBPCAD',
  'AUDJPY','AUDCHF','AUDNZD','AUDCAD',
  'NZDJPY','NZDCHF','NZDCAD',
  'CADJPY','CADCHF','CHFJPY',
  'USDIDR','USDSGD','USDHKD','USDKRW','USDTHB','USDMYR','USDPHP','USDINR','USDCNH','USDTRY','USDZAR','USDMXN','USDBRL','USDRUB','USDARS',
  'EURSEK','EURNOK','EURDKK','USDSEK','USDNOK','USDDKK',
];

// ── Commodity / futures ──────────────────────────────────────────────────────
const COMMODITY_FUTURES = [
  'GC=F','SI=F','HG=F','PL=F','PA=F',                         // Metals
  'CL=F','BZ=F','NG=F','RB=F','HO=F',                         // Energy
  'ZC=F','ZW=F','ZS=F','ZL=F','ZM=F','ZO=F','ZR=F',           // Grains
  'CC=F','KC=F','CT=F','SB=F','OJ=F',                         // Softs
  'LE=F','HE=F','GF=F',                                       // Livestock
  'YM=F','ES=F','NQ=F','RTY=F','MES=F','MNQ=F','MYM=F',       // Index futures
  '6E=F','6B=F','6J=F','6A=F','6N=F','6C=F','6S=F','DX=F',    // FX futures
  'ZB=F','ZN=F','ZF=F','ZT=F','UB=F',                         // Treasuries
];

// ── Indices ──────────────────────────────────────────────────────────────────
const INDICES = [
  '^GSPC','^DJI','^IXIC','^RUT','^VIX','^VVIX','^OVX','^GVZ','^TYX','^TNX','^IRX','^FVX','^DJT','^DJU','^NDX','^SP400','^SP600',
  '^FTSE','^GDAXI','^FCHI','^STOXX50E','^IBEX','^AEX','^OMX','^OMXC25','^SSMI','^N225','^HSI','^TWII','^KS11','^STI','^AXJO','^BVSP','^MERV','^MXX','^JKSE','^NSEI','^BSESN','^KLSE','^SET','^TASI','^TA125',
  'DX-Y.NYB',
];

function makeMeta(symbol: string, name: string, exchange: string, assetClass: any, extras: Partial<SymbolMeta> = {}): SymbolMeta {
  return { symbol, name, exchange, assetClass, ...extras };
}

const US_STOCKS_META: SymbolMeta[] = US_LARGE_CAP_TICKERS.map((t) =>
  makeMeta(t, t, 'NASDAQ/NYSE', 'stock_us', { yahooTicker: t })
);

const ETF_META: SymbolMeta[] = ETF_TICKERS.map((t) =>
  makeMeta(t, `${t} ETF`, 'NYSE/NASDAQ', 'etf', { yahooTicker: t })
);

const IDX_META: SymbolMeta[] = IDX_TICKERS.map((t) =>
  makeMeta(t, t, 'IDX', 'stock_id', { yahooTicker: `${t}.JK` })
);

const CRYPTO_META: SymbolMeta[] = CRYPTO_USDT_PAIRS.map((t) =>
  makeMeta(`${t}USDT`, t, 'Binance', 'crypto', { binancePair: `${t}USDT` })
);

const FOREX_META: SymbolMeta[] = FOREX_PAIRS.map((t) =>
  makeMeta(t, t.slice(0, 3) + '/' + t.slice(3), 'FX', 'forex', { yahooTicker: `${t}=X` })
);

const COMMODITY_META: SymbolMeta[] = COMMODITY_FUTURES.map((t) =>
  makeMeta(t, t, 'CME/NYMEX', 'futures', { yahooTicker: t })
);

const INDEX_META: SymbolMeta[] = INDICES.map((t) =>
  makeMeta(t, t, 'INDEX', 'index', { yahooTicker: t })
);

export const SYMBOLS_BULK: SymbolMeta[] = [
  ...US_STOCKS_META,
  ...ETF_META,
  ...IDX_META,
  ...CRYPTO_META,
  ...FOREX_META,
  ...COMMODITY_META,
  ...INDEX_META,
];

export function bulkSymbolCount(): number { return SYMBOLS_BULK.length; }
