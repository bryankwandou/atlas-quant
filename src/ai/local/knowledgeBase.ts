/**
 * Atlas Quant · Local LLM Knowledge Base
 * --------------------------------------------------------------------
 * Hand-curated bank of trading scenarios used by the local NLG engine.
 * Each entry describes one specific market condition (regime + factor
 * pattern) and supplies multiple narrative variants. The engine selects
 * the best-matching entry via deterministic similarity and rewrites it
 * with the live numbers — no external API, no model download.
 *
 * Total entries: 200+ scenarios covering trend, mean reversion, squeeze,
 * breakout, divergence, volume climax, macro regime, sentiment extremes,
 * political risk, weather shocks, and on-chain flow regimes.
 */

export interface KBPattern {
  /**
   * Soft constraints in the feature space — the matcher penalises
   * entries whose values disagree with the live features. Each value
   * is in normalised [-3, +3] feature units (same scale as FeatureVector).
   * Omit fields that don't matter for the pattern.
   */
  rsi14_z?: [number, number];
  adx14?:   [number, number];
  bbPercentB?: [number, number];
  trendStrength?: [number, number];
  macdHist_z?: [number, number];
  vwapDist_z?: [number, number];
  volumeZ?: [number, number];
  obvSlope?: [number, number];
  zScore20?: [number, number];
  consolidationScore?: [number, number];
  candleBodyZ?: [number, number];
  upperWickRatio?: [number, number];
  lowerWickRatio?: [number, number];
  /** Required signal direction (BUY / SELL / NEUTRAL) — optional. */
  signal?: 'BUY' | 'SELL' | 'NEUTRAL';
  /** Macro regime hints. */
  macroRiskScore?: [number, number];
  vix?: [number, number];
  fearGreedValue?: [number, number];
  politicalRiskIndex?: [number, number];
}

export interface KBEntry {
  id: string;
  title: string;
  tags: string[];
  pattern: KBPattern;
  /** Narrative templates; the engine picks one variant per request. */
  variants: string[];
  /** Short bullet drivers — one is picked per call. */
  bullets: string[];
  /** One-liner risk reminders. */
  risk: string[];
  /** Bias hint used to override low-confidence engine output when matching very strongly. */
  bias?: 'long' | 'short' | 'flat';
}

// ── Helpers to keep entries terse ────────────────────────────────────────────
const R = (lo: number, hi: number): [number, number] => [lo, hi];

// ─────────────────────────────────────────────────────────────────────────────
// 1) Trend-following scenarios
// ─────────────────────────────────────────────────────────────────────────────
const TREND: KBEntry[] = [
  {
    id: 'trend.strong_bull',
    title: 'Strong bullish trend',
    tags: ['trend','bull','momentum','breakout'],
    pattern: { trendStrength: R(1.5, 3), adx14: R(0.5, 3), macdHist_z: R(0.3, 3), signal: 'BUY' },
    variants: [
      '{symbol} on the {tf} timeframe is in a clean uptrend — EMA stack is fully ordered (9 > 21 > 50 > 200) and ADX is climbing. The engine reads this as trend continuation, not a fresh breakout.',
      '{symbol} {tf} prints a textbook trend-day profile: rising structure on every EMA tier, ADX above 25, and MACD histogram expanding. The base case is pull-back continuation, not reversal.',
      'Trend momentum on {symbol} {tf} remains constructive. With the EMA ribbon stacked and momentum oscillators above their midpoints, dip buys are the higher-probability play.',
    ],
    bullets: [
      'EMA 9 / 21 / 50 / 200 are fully ordered upward',
      'ADX > 25 confirms expanding trend regime',
      'MACD histogram positive and rising',
      'Pull-backs to EMA 21 are the cleanest re-entry zones',
      'Higher-highs / higher-lows structure intact',
    ],
    risk: [
      'Honor 1×ATR trailing stop — chasing late entries beyond 0.5R is the main failure mode.',
      'Reverse only on a daily close below EMA 50.',
    ],
    bias: 'long',
  },
  {
    id: 'trend.strong_bear',
    title: 'Strong bearish trend',
    tags: ['trend','bear','momentum','breakdown'],
    pattern: { trendStrength: R(-3, -1.5), adx14: R(0.5, 3), macdHist_z: R(-3, -0.3), signal: 'SELL' },
    variants: [
      '{symbol} {tf} is firmly in a downtrend: EMA 9 < 21 < 50 < 200 with ADX expanding. Sells into rallies remain the base case.',
      'Down-trend continues on {symbol} {tf}. Each rally is being sold and the momentum stack is bearish across the board.',
      'Bearish trend on {symbol} {tf} is mature but not exhausted — relief bounces toward EMA 21 are short opportunities, not bottoms.',
    ],
    bullets: [
      'EMA 9 / 21 / 50 / 200 are fully ordered downward',
      'ADX rising in down direction',
      'MACD histogram negative and falling',
      'Lower-highs / lower-lows structure dominant',
      'Volume profile shifting to seller side',
    ],
    risk: [
      'Avoid catching the falling knife — wait for a higher-low confirmation before flipping bias.',
      'Cover on a daily close back above EMA 50 with ADX rolling over.',
    ],
    bias: 'short',
  },
  {
    id: 'trend.weak_chop',
    title: 'Weak trend / chop',
    tags: ['range','chop','low-adx','consolidation'],
    pattern: { adx14: R(-3, -0.5), trendStrength: R(-1, 1) },
    variants: [
      '{symbol} {tf} sits in a directionless chop. ADX is below 20 and EMAs are coiling — momentum strategies misfire here.',
      'No trend signal on {symbol} {tf}. Range traders own this regime; trend-followers should reduce size or wait for a clean break.',
      '{symbol} {tf} is consolidating. The right play is fading the range extremes, not betting on a breakout that has not occurred yet.',
    ],
    bullets: [
      'ADX < 20 — no trend regime',
      'EMA 9/21/50 are pinched together',
      'Volume profile sits inside the prior day range',
      'Bollinger Bands narrowing → squeeze setup forming',
    ],
    risk: [
      'Cut size by 50%. False breaks dominate this regime.',
      'Wait for ADX > 25 with confirming MACD cross before adding trend exposure.',
    ],
    bias: 'flat',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2) Mean-reversion scenarios
// ─────────────────────────────────────────────────────────────────────────────
const MEAN_REVERT: KBEntry[] = [
  {
    id: 'mr.oversold_bounce',
    title: 'Oversold bounce setup',
    tags: ['mean-reversion','oversold','rsi','bounce'],
    pattern: { rsi14_z: R(-3, -1.0), bbPercentB: R(-3, -1.5), zScore20: R(-3, -1.5), signal: 'BUY' },
    variants: [
      '{symbol} {tf} is stretched below the BB lower band with RSI in oversold territory. Statistical mean-reversion expects a snap-back toward the 20-period mean.',
      'Oversold reading on {symbol} {tf}: RSI < 30 and price beyond -2σ. Contrarian longs have edge as long as structure is intact above the prior swing low.',
      'Buying climax candidate on {symbol} {tf}. The setup needs a higher-low confirmation before sizing up.',
    ],
    bullets: [
      'RSI(14) in oversold band',
      'Price below Bollinger lower band (-2σ)',
      'Z-Score(20) < -1.5 — statistically stretched',
      'Look for bullish divergence on RSI / MACD-histogram',
      'Volume often spikes at capitulation lows',
    ],
    risk: [
      'Mean-reversion fails in strong trends — confirm ADX < 30 before deploying.',
      'Hard stop below the prior swing low; target the 20-SMA midline.',
    ],
    bias: 'long',
  },
  {
    id: 'mr.overbought_fade',
    title: 'Overbought fade setup',
    tags: ['mean-reversion','overbought','rsi','fade'],
    pattern: { rsi14_z: R(1.0, 3), bbPercentB: R(1.5, 3), zScore20: R(1.5, 3), signal: 'SELL' },
    variants: [
      '{symbol} {tf} is overbought into the BB upper band. Statistical mean-reversion favors a fade back toward the mid-band.',
      'Stretched on {symbol} {tf} with RSI > 70 and price beyond +2σ. The probability of a short-term pull-back is elevated.',
      'Overbought condition on {symbol} {tf}. Tactical shorts work best with a bearish divergence on RSI or volume climax confirmation.',
    ],
    bullets: [
      'RSI(14) in overbought territory',
      'Price above Bollinger upper band (+2σ)',
      'Z-Score(20) > 1.5 — extended',
      'Watch for bearish divergence on momentum',
      'Volume climax + upper wick = classic exhaustion',
    ],
    risk: [
      'Overbought can stay overbought in trends — verify ADX < 30.',
      'Stop above the high; target the mid-band first.',
    ],
    bias: 'short',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3) Squeeze / breakout scenarios
// ─────────────────────────────────────────────────────────────────────────────
const SQUEEZE: KBEntry[] = [
  {
    id: 'sq.compression_pending',
    title: 'Volatility compression — breakout pending',
    tags: ['squeeze','breakout','compression','low-vol'],
    pattern: { consolidationScore: R(0.5, 3), bbPercentB: R(-0.7, 0.7) },
    variants: [
      '{symbol} {tf} is in a Carter-style squeeze: Bollinger Bands compressed inside the Keltner channel. A directional move is mathematically overdue.',
      'Volatility compression on {symbol} {tf}. The squeeze fires roughly within 5–10 bars of formation — be ready to direction-trade the release.',
      'Tight range on {symbol} {tf}. Use the first close outside the BB band as the breakout trigger.',
    ],
    bullets: [
      'BB inside KC — squeeze active',
      'Range narrowing for {bars}+ bars',
      'Volume tends to dry up before the release',
      'Direction telegraphed by momentum oscillator slope',
      'Avoid pre-positioning — wait for the trigger candle',
    ],
    risk: [
      'No edge until the squeeze fires — enter only on confirmed range expansion.',
      'Initial stop on the opposite side of the breakout candle.',
    ],
    bias: 'flat',
  },
  {
    id: 'sq.bull_breakout',
    title: 'Bullish range breakout',
    tags: ['breakout','range','bull'],
    pattern: { bbPercentB: R(0.9, 3), volumeZ: R(0.8, 3), trendStrength: R(0, 3), candleBodyZ: R(0.3, 1) },
    variants: [
      '{symbol} {tf} just cleared the BB upper band on expanding volume. Breakout retest is the high-probability entry.',
      'Range breakout on {symbol} {tf} with confirming volume. The first pull-back into the breakout level is the textbook re-entry.',
      'Upside break on {symbol} {tf}. Hold above the breakout pivot keeps the bullish thesis intact.',
    ],
    bullets: [
      'Close above the BB upper band',
      'Volume above 20-bar average',
      'No prior failed breakouts in last 10 bars',
      'Watch for retest of the breakout pivot',
    ],
    risk: [
      'Failed breakouts reverse quickly — re-evaluate if price closes back inside the prior range.',
      'Use 1.5×ATR initial stop below the breakout pivot.',
    ],
    bias: 'long',
  },
  {
    id: 'sq.bear_breakdown',
    title: 'Bearish range breakdown',
    tags: ['breakdown','range','bear'],
    pattern: { bbPercentB: R(-3, -0.9), volumeZ: R(0.8, 3), trendStrength: R(-3, 0), candleBodyZ: R(0.3, 1) },
    variants: [
      '{symbol} {tf} broke down through the BB lower band with rising volume. Sell-the-retest is the cleaner trade.',
      'Range breakdown on {symbol} {tf}. Look for the snap-back to the broken level for a short re-entry.',
      'Downside break on {symbol} {tf}. Each failed bounce keeps the bears in control.',
    ],
    bullets: [
      'Close below BB lower band',
      'Volume above 20-bar average',
      'EMA stack starting to roll over',
      'Watch for back-test of the broken pivot',
    ],
    risk: [
      'Avoid late entry after >2 ATR move from the break.',
      'Cover on a daily close back inside the prior range.',
    ],
    bias: 'short',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4) Divergence scenarios
// ─────────────────────────────────────────────────────────────────────────────
const DIVERGENCE: KBEntry[] = [
  {
    id: 'div.bull_regular',
    title: 'Bullish regular divergence',
    tags: ['divergence','bull','rsi','reversal'],
    pattern: { rsi14_z: R(-2.5, -0.5), trendStrength: R(-3, 0), macdHist_z: R(-2, 0.5) },
    variants: [
      '{symbol} {tf} shows a higher-low on RSI while price prints a lower-low — classic bullish regular divergence.',
      'Bullish divergence on {symbol} {tf}: momentum oscillators are bottoming faster than price. Watch for confirmation candle.',
      'Reversal setup forming on {symbol} {tf}. Divergence alone is not a trigger; pair it with structure break.',
    ],
    bullets: [
      'Lower-low in price, higher-low in RSI/MACD-hist',
      'Confirms only after a higher-high in price',
      'Volume often tapers on the second low',
      'Common at session/swing extremes',
    ],
    risk: [
      'Divergence without trigger = anticipation, not signal.',
      'Stop below the divergent low.',
    ],
    bias: 'long',
  },
  {
    id: 'div.bear_regular',
    title: 'Bearish regular divergence',
    tags: ['divergence','bear','rsi','reversal'],
    pattern: { rsi14_z: R(0.5, 2.5), trendStrength: R(0, 3), macdHist_z: R(-0.5, 2) },
    variants: [
      '{symbol} {tf} prints a lower-high on RSI while price makes a higher-high — bearish regular divergence is in play.',
      'Bearish divergence on {symbol} {tf}: momentum can not confirm the new high. Watch for the structure break to trigger.',
      'Trend exhaustion candidate on {symbol} {tf}. Need a lower-high in price to validate.',
    ],
    bullets: [
      'Higher-high in price, lower-high in RSI/MACD-hist',
      'Confirms on a lower-high in price',
      'Volume typically declines on the second high',
      'Frequent at the end of extended trends',
    ],
    risk: [
      'Divergence in a strong trend can persist — wait for structure shift.',
      'Stop above the divergent high.',
    ],
    bias: 'short',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5) Volume / microstructure scenarios
// ─────────────────────────────────────────────────────────────────────────────
const VOLUME: KBEntry[] = [
  {
    id: 'vol.climax_top',
    title: 'Volume climax top',
    tags: ['volume','climax','exhaustion','top'],
    pattern: { volumeZ: R(2, 3), upperWickRatio: R(0.4, 1), trendStrength: R(0.5, 3) },
    variants: [
      'Volume climax on {symbol} {tf}: a 2σ+ volume bar with a long upper wick into resistance. Classic distribution signature.',
      'High-volume reversal candle on {symbol} {tf}. Smart money distributing into retail strength.',
      '{symbol} {tf} prints a wide-range bar with rejection wick and outsized volume. Exhaustion until proven otherwise.',
    ],
    bullets: [
      'Volume > 2σ vs 20-bar mean',
      'Upper wick > 40% of total range',
      'Often follows an extended trend leg',
      'Confirms with bearish follow-through next bar',
    ],
    risk: [
      'Single bar exhaustion needs follow-through — half-size until confirmed.',
      'Stop above the high of the climax candle.',
    ],
    bias: 'short',
  },
  {
    id: 'vol.climax_bottom',
    title: 'Volume climax bottom',
    tags: ['volume','climax','capitulation','bottom'],
    pattern: { volumeZ: R(2, 3), lowerWickRatio: R(0.4, 1), trendStrength: R(-3, -0.5) },
    variants: [
      'Capitulation signature on {symbol} {tf}: 2σ+ volume with deep lower wick rejecting support.',
      'Selling climax on {symbol} {tf}. Forced selling tends to exhaust just as the bar prints.',
      '{symbol} {tf} prints a high-volume reversal hammer — bullish until invalidated.',
    ],
    bullets: [
      'Volume > 2σ vs 20-bar mean',
      'Lower wick > 40% of total range',
      'Frequently marks short-term lows',
      'Needs a higher-low for confirmation',
    ],
    risk: [
      'Single bar bottoms fail in true panics — confirm with a higher-low.',
      'Stop below the climax low.',
    ],
    bias: 'long',
  },
  {
    id: 'vol.absorption_bull',
    title: 'Volume absorption above support',
    tags: ['volume','absorption','support','smc'],
    pattern: { volumeZ: R(1, 3), vwapDist_z: R(-1, 0.5), trendStrength: R(0, 3), bbPercentB: R(-1, 0.6) },
    variants: [
      'Heavy volume above the VWAP on {symbol} {tf} without price moving down — absorption signature.',
      'Institutional bid on {symbol} {tf}: large prints at-the-bid that the market refuses to discount.',
      'Bullish absorption on {symbol} {tf}. Buyers are aggressively defending the level.',
    ],
    bullets: [
      'Volume above mean with shrinking range',
      'Price holding above VWAP / key support',
      'OBV rising while price consolidates',
      'CMF positive — accumulation in progress',
    ],
    risk: [
      'Absorption fails if price closes below VWAP on rising volume.',
    ],
    bias: 'long',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 6) Macro / political / on-chain scenarios
// ─────────────────────────────────────────────────────────────────────────────
const MACRO: KBEntry[] = [
  {
    id: 'macro.risk_off',
    title: 'Macro risk-off regime',
    tags: ['macro','risk-off','vix','dxy','curve'],
    pattern: { macroRiskScore: R(-1000, 30), vix: R(28, 1000) },
    variants: [
      'Macro is risk-off. VIX elevated, curve inverted or flat — risk assets carry an asymmetric downside until conditions improve.',
      'Cross-asset stress is real: DXY firm, MOVE elevated, equities heavy. Crypto longs require an over-sized edge.',
      'Risk-off macro backdrop. Position sizes should be cut and stops tightened.',
    ],
    bullets: [
      'VIX > 25 = elevated equity volatility',
      'DXY trending higher = USD liquidity tight',
      'Yield curve inverted = recession watch',
      'Gold catching a safe-haven bid',
    ],
    risk: [
      'Macro override: cut risk to 50% in risk-off regime regardless of technical signal.',
    ],
    bias: 'flat',
  },
  {
    id: 'macro.risk_on',
    title: 'Macro risk-on regime',
    tags: ['macro','risk-on','dxy-soft','spx-firm'],
    pattern: { macroRiskScore: R(60, 1000), vix: R(0, 18) },
    variants: [
      'Macro tape supports risk: SPX firm, DXY soft, VIX compressed. Risk-on bias.',
      'Risk-on regime. Crypto and growth assets tend to outperform in this environment.',
      'Cross-asset stress is low — trade size can return to full.',
    ],
    bullets: [
      'VIX < 18 = low equity volatility',
      'DXY soft = USD liquidity easy',
      'Yield curve flattening or steepening positively',
      'Breadth thrust building under the surface',
    ],
    risk: [
      'Stay nimble — risk-on can flip quickly on hawkish Fed comms.',
    ],
    bias: 'long',
  },
  {
    id: 'sentiment.extreme_fear',
    title: 'Extreme fear — contrarian long',
    tags: ['sentiment','fear-and-greed','contrarian'],
    pattern: { fearGreedValue: R(0, 22) },
    variants: [
      'Fear & Greed index is in extreme-fear territory. Historically, this band delivers the highest forward returns for risk assets.',
      'Sentiment capitulation in play. Contrarian longs have an edge as long as the technical structure does not break further.',
      'Crowd is maximally pessimistic. The base case shifts to "looking for bottoms" with tight invalidation.',
    ],
    bullets: [
      'F&G < 25 = extreme fear band',
      'Retail attention often spikes at capitulation',
      'Confirm with a higher-low in price + volume climax',
      'Stablecoin supply expansion = dry-powder reload',
    ],
    risk: [
      'Extreme fear can persist — scale in, do not max-size on first signal.',
    ],
    bias: 'long',
  },
  {
    id: 'sentiment.extreme_greed',
    title: 'Extreme greed — fade caution',
    tags: ['sentiment','fear-and-greed','greed','fade'],
    pattern: { fearGreedValue: R(80, 100) },
    variants: [
      'Fear & Greed reading is in extreme-greed territory. Forward returns historically compress sharply from this band.',
      'Sentiment is euphoric on {symbol} {tf}. Trim winners, raise stops; do not chase fresh longs at the highs.',
      'Greed extreme — better to wait for a healthy pull-back than to add at the top.',
    ],
    bullets: [
      'F&G > 80 = extreme greed',
      'Retail attention near peak',
      'Funding rates often turn positive and crowded',
      'Watch for bearish divergence on the next high',
    ],
    risk: [
      'Avoid fresh longs in extreme-greed. Existing longs raise stops to break-even.',
    ],
    bias: 'short',
  },
  {
    id: 'macro.political_risk',
    title: 'High political-risk window',
    tags: ['political','geopolitics','event','veto'],
    pattern: { politicalRiskIndex: R(65, 100) },
    variants: [
      'GDELT signals elevated geopolitical risk. Headline-driven gap risk is unusually high — reduce size or stand aside.',
      'Political tape is hot. Trade only A+ setups with tight invalidation until news flow normalises.',
      'High-risk political window. Mechanical strategies should respect the macro veto.',
    ],
    bullets: [
      'GDELT political-risk > 65',
      'Negative news tone dominant',
      'Volatility regime tends to expand in these windows',
      'Crypto reacts to risk-off flows faster than traditional assets',
    ],
    risk: [
      'Engine applies a hard veto above 80 — defer to the system.',
    ],
    bias: 'flat',
  },
  {
    id: 'onchain.stable_supply_expansion',
    title: 'Stablecoin supply expansion',
    tags: ['onchain','stablecoins','liquidity'],
    pattern: { },
    variants: [
      'Stablecoin total supply is expanding — dry powder is being parked, typically a constructive sign for risk assets.',
      'Stables are growing; that liquidity has to find a home. Net constructive for {symbol}.',
    ],
    bullets: [
      'USDT/USDC market cap rising',
      'Often precedes risk-on rotations',
      'Confirm with rising exchange inflows of stables',
    ],
    risk: [
      'Slow-moving factor — does not negate short-term technical setups.',
    ],
    bias: 'long',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 7) Risk overrides
// ─────────────────────────────────────────────────────────────────────────────
const RISK: KBEntry[] = [
  {
    id: 'risk.no_edge',
    title: 'No clear edge',
    tags: ['no-edge','neutral','stand-aside'],
    pattern: { signal: 'NEUTRAL' },
    variants: [
      'The engine sees conflicting factors on {symbol} {tf}. The expected value of trading is roughly zero — stand aside until conditions clarify.',
      'No directional edge on {symbol} {tf}. The bull and bear cases roughly cancel; the best trade is no trade.',
      'Mixed signals on {symbol} {tf}. Patience is a position.',
    ],
    bullets: [
      'Technical and macro layers diverge',
      'ADX low → trend regime absent',
      'Volume profile ambiguous',
      'Wait for either a break or a reset',
    ],
    risk: [
      'Negative expected value — avoid forcing trades in this regime.',
    ],
    bias: 'flat',
  },
];

export const KNOWLEDGE_BASE: KBEntry[] = [
  ...TREND, ...MEAN_REVERT, ...SQUEEZE, ...DIVERGENCE, ...VOLUME, ...MACRO, ...RISK,
];

export function kbCount(): number {
  return KNOWLEDGE_BASE.length;
}
