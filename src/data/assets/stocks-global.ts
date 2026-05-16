/**
 * GLOBAL STOCKS REGISTRY — Indonesia (IDX), UK, Europe, Japan, China, India.
 * Symbol format Yahoo Finance: TLKM.JK, BARC.L, 7203.T, 0700.HK, BBVA.MC.
 */
import type { Asset } from '@/domain/asset';

const g = (
  sym: string,
  name: string,
  country: string,
  ex: string,
  sector: string,
  industry: string,
  currency = 'USD'
): Asset => ({
  symbol: sym,
  base: sym.split('.')[0],
  quote: currency,
  assetClass: 'stock',
  exchange: ex,
  name,
  description: `${name} listed on ${ex} (${country}).`,
  sector,
  industry,
  country,
  currency,
  decimals: 2,
  isTradable: true,
  isListed: true,
  tags: [country.toLowerCase(), ex.toLowerCase(), sector.toLowerCase().replace(/\s+/g, '-')],
  aliases: [name],
});

export const STOCKS_GLOBAL: Asset[] = [
  // === INDONESIA — IDX (top market cap) ===
  g('BBCA.JK', 'Bank Central Asia', 'ID', 'IDX', 'Financial Services', 'Banking', 'IDR'),
  g('BBRI.JK', 'Bank Rakyat Indonesia', 'ID', 'IDX', 'Financial Services', 'Banking', 'IDR'),
  g('BMRI.JK', 'Bank Mandiri', 'ID', 'IDX', 'Financial Services', 'Banking', 'IDR'),
  g('BBNI.JK', 'Bank Negara Indonesia', 'ID', 'IDX', 'Financial Services', 'Banking', 'IDR'),
  g('TLKM.JK', 'Telkom Indonesia', 'ID', 'IDX', 'Communication Services', 'Telecom', 'IDR'),
  g('ASII.JK', 'Astra International', 'ID', 'IDX', 'Consumer Cyclical', 'Auto', 'IDR'),
  g('UNVR.JK', 'Unilever Indonesia', 'ID', 'IDX', 'Consumer Defensive', 'FMCG', 'IDR'),
  g('GOTO.JK', 'GoTo Gojek Tokopedia', 'ID', 'IDX', 'Technology', 'Internet', 'IDR'),
  g('BUKA.JK', 'Bukalapak', 'ID', 'IDX', 'Technology', 'E-commerce', 'IDR'),
  g('EMTK.JK', 'Elang Mahkota Teknologi', 'ID', 'IDX', 'Technology', 'Media', 'IDR'),
  g('ICBP.JK', 'Indofood CBP', 'ID', 'IDX', 'Consumer Defensive', 'FMCG', 'IDR'),
  g('INDF.JK', 'Indofood Sukses Makmur', 'ID', 'IDX', 'Consumer Defensive', 'FMCG', 'IDR'),
  g('ADRO.JK', 'Adaro Energy', 'ID', 'IDX', 'Energy', 'Coal', 'IDR'),
  g('PTBA.JK', 'Bukit Asam', 'ID', 'IDX', 'Energy', 'Coal', 'IDR'),
  g('ANTM.JK', 'Aneka Tambang', 'ID', 'IDX', 'Basic Materials', 'Mining', 'IDR'),
  g('INCO.JK', 'Vale Indonesia', 'ID', 'IDX', 'Basic Materials', 'Mining', 'IDR'),
  g('SMGR.JK', 'Semen Indonesia', 'ID', 'IDX', 'Basic Materials', 'Cement', 'IDR'),
  g('INTP.JK', 'Indocement', 'ID', 'IDX', 'Basic Materials', 'Cement', 'IDR'),
  g('UNTR.JK', 'United Tractors', 'ID', 'IDX', 'Industrials', 'Heavy Machinery', 'IDR'),
  g('AMRT.JK', 'Sumber Alfaria Trijaya', 'ID', 'IDX', 'Consumer Defensive', 'Retail', 'IDR'),
  g('MDKA.JK', 'Merdeka Copper Gold', 'ID', 'IDX', 'Basic Materials', 'Mining', 'IDR'),
  g('BRPT.JK', 'Barito Pacific', 'ID', 'IDX', 'Basic Materials', 'Chemicals', 'IDR'),
  g('TPIA.JK', 'Chandra Asri Petrochemical', 'ID', 'IDX', 'Basic Materials', 'Chemicals', 'IDR'),
  g('ARTO.JK', 'Bank Jago', 'ID', 'IDX', 'Financial Services', 'Banking', 'IDR'),

  // === UK — LSE ===
  g('HSBA.L', 'HSBC Holdings', 'GB', 'LSE', 'Financial Services', 'Banking', 'GBP'),
  g('SHEL.L', 'Shell plc', 'GB', 'LSE', 'Energy', 'Oil & Gas', 'GBP'),
  g('AZN.L', 'AstraZeneca', 'GB', 'LSE', 'Healthcare', 'Pharmaceuticals', 'GBP'),
  g('ULVR.L', 'Unilever', 'GB', 'LSE', 'Consumer Defensive', 'FMCG', 'GBP'),
  g('BP.L', 'BP plc', 'GB', 'LSE', 'Energy', 'Oil & Gas', 'GBP'),
  g('GSK.L', 'GSK', 'GB', 'LSE', 'Healthcare', 'Pharmaceuticals', 'GBP'),
  g('BARC.L', 'Barclays', 'GB', 'LSE', 'Financial Services', 'Banking', 'GBP'),
  g('LLOY.L', 'Lloyds Banking Group', 'GB', 'LSE', 'Financial Services', 'Banking', 'GBP'),
  g('NWG.L', 'NatWest Group', 'GB', 'LSE', 'Financial Services', 'Banking', 'GBP'),
  g('VOD.L', 'Vodafone Group', 'GB', 'LSE', 'Communication Services', 'Telecom', 'GBP'),

  // === EUROPE ===
  g('SAP.DE', 'SAP SE', 'DE', 'XETRA', 'Technology', 'Software', 'EUR'),
  g('SIE.DE', 'Siemens AG', 'DE', 'XETRA', 'Industrials', 'Conglomerate', 'EUR'),
  g('VOW3.DE', 'Volkswagen AG', 'DE', 'XETRA', 'Consumer Cyclical', 'Auto', 'EUR'),
  g('BMW.DE', 'BMW AG', 'DE', 'XETRA', 'Consumer Cyclical', 'Auto', 'EUR'),
  g('DTE.DE', 'Deutsche Telekom', 'DE', 'XETRA', 'Communication Services', 'Telecom', 'EUR'),
  g('ALV.DE', 'Allianz', 'DE', 'XETRA', 'Financial Services', 'Insurance', 'EUR'),
  g('MC.PA', 'LVMH', 'FR', 'PAR', 'Consumer Cyclical', 'Luxury Goods', 'EUR'),
  g('OR.PA', 'L\'Oreal', 'FR', 'PAR', 'Consumer Defensive', 'Cosmetics', 'EUR'),
  g('AIR.PA', 'Airbus', 'FR', 'PAR', 'Industrials', 'Aerospace', 'EUR'),
  g('TTE.PA', 'TotalEnergies', 'FR', 'PAR', 'Energy', 'Oil & Gas', 'EUR'),
  g('BNP.PA', 'BNP Paribas', 'FR', 'PAR', 'Financial Services', 'Banking', 'EUR'),
  g('SAN.MC', 'Banco Santander', 'ES', 'MAD', 'Financial Services', 'Banking', 'EUR'),
  g('IBE.MC', 'Iberdrola', 'ES', 'MAD', 'Utilities', 'Electric', 'EUR'),
  g('NESN.SW', 'Nestlé', 'CH', 'SIX', 'Consumer Defensive', 'FMCG', 'CHF'),
  g('NOVN.SW', 'Novartis', 'CH', 'SIX', 'Healthcare', 'Pharmaceuticals', 'CHF'),
  g('ROG.SW', 'Roche Holding', 'CH', 'SIX', 'Healthcare', 'Pharmaceuticals', 'CHF'),
  g('UBSG.SW', 'UBS Group', 'CH', 'SIX', 'Financial Services', 'Banking', 'CHF'),

  // === JAPAN — TSE ===
  g('7203.T', 'Toyota Motor', 'JP', 'TSE', 'Consumer Cyclical', 'Auto', 'JPY'),
  g('6758.T', 'Sony Group', 'JP', 'TSE', 'Technology', 'Consumer Electronics', 'JPY'),
  g('9984.T', 'SoftBank Group', 'JP', 'TSE', 'Technology', 'Conglomerate', 'JPY'),
  g('9983.T', 'Fast Retailing (UNIQLO)', 'JP', 'TSE', 'Consumer Cyclical', 'Apparel', 'JPY'),
  g('7974.T', 'Nintendo', 'JP', 'TSE', 'Communication Services', 'Gaming', 'JPY'),
  g('8306.T', 'Mitsubishi UFJ', 'JP', 'TSE', 'Financial Services', 'Banking', 'JPY'),
  g('6861.T', 'Keyence', 'JP', 'TSE', 'Technology', 'Industrial Automation', 'JPY'),
  g('6098.T', 'Recruit Holdings', 'JP', 'TSE', 'Communication Services', 'HR', 'JPY'),
  g('8035.T', 'Tokyo Electron', 'JP', 'TSE', 'Technology', 'Semiconductor Equipment', 'JPY'),

  // === HONG KONG / CHINA ===
  g('0700.HK', 'Tencent', 'HK', 'HKEX', 'Communication Services', 'Internet', 'HKD'),
  g('9988.HK', 'Alibaba Group', 'HK', 'HKEX', 'Consumer Cyclical', 'E-commerce', 'HKD'),
  g('3690.HK', 'Meituan', 'HK', 'HKEX', 'Consumer Cyclical', 'Internet', 'HKD'),
  g('9618.HK', 'JD.com', 'HK', 'HKEX', 'Consumer Cyclical', 'E-commerce', 'HKD'),
  g('1810.HK', 'Xiaomi Corp', 'HK', 'HKEX', 'Technology', 'Consumer Electronics', 'HKD'),
  g('0939.HK', 'China Construction Bank', 'HK', 'HKEX', 'Financial Services', 'Banking', 'HKD'),
  g('0941.HK', 'China Mobile', 'HK', 'HKEX', 'Communication Services', 'Telecom', 'HKD'),
  g('1299.HK', 'AIA Group', 'HK', 'HKEX', 'Financial Services', 'Insurance', 'HKD'),

  // === INDIA — NSE/BSE (via Yahoo .NS / .BO) ===
  g('RELIANCE.NS', 'Reliance Industries', 'IN', 'NSE', 'Energy', 'Conglomerate', 'INR'),
  g('TCS.NS', 'Tata Consultancy Services', 'IN', 'NSE', 'Technology', 'IT Services', 'INR'),
  g('INFY.NS', 'Infosys', 'IN', 'NSE', 'Technology', 'IT Services', 'INR'),
  g('HDFCBANK.NS', 'HDFC Bank', 'IN', 'NSE', 'Financial Services', 'Banking', 'INR'),
  g('ICICIBANK.NS', 'ICICI Bank', 'IN', 'NSE', 'Financial Services', 'Banking', 'INR'),
  g('HINDUNILVR.NS', 'Hindustan Unilever', 'IN', 'NSE', 'Consumer Defensive', 'FMCG', 'INR'),
  g('BHARTIARTL.NS', 'Bharti Airtel', 'IN', 'NSE', 'Communication Services', 'Telecom', 'INR'),
  g('TATAMOTORS.NS', 'Tata Motors', 'IN', 'NSE', 'Consumer Cyclical', 'Auto', 'INR'),
  g('ADANIENT.NS', 'Adani Enterprises', 'IN', 'NSE', 'Industrials', 'Conglomerate', 'INR'),

  // === AUSTRALIA — ASX ===
  g('BHP.AX', 'BHP Group', 'AU', 'ASX', 'Basic Materials', 'Mining', 'AUD'),
  g('RIO.AX', 'Rio Tinto', 'AU', 'ASX', 'Basic Materials', 'Mining', 'AUD'),
  g('CBA.AX', 'Commonwealth Bank', 'AU', 'ASX', 'Financial Services', 'Banking', 'AUD'),
  g('CSL.AX', 'CSL Limited', 'AU', 'ASX', 'Healthcare', 'Biotechnology', 'AUD'),
  g('WBC.AX', 'Westpac Banking', 'AU', 'ASX', 'Financial Services', 'Banking', 'AUD'),
];
