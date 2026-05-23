/**
 * Atlas Quant · Knowledge Base — expansion pack v2
 * --------------------------------------------------------------------
 * Adds 70+ extra trading scenarios covering Wyckoff phases, Elliott
 * waves, classic chart patterns, harmonic patterns, ICT killzones,
 * SMC concepts, order flow microstructure, session profile setups,
 * Renaissance-style cross-asset signals, and on-chain regimes.
 *
 * Each entry follows the same KBEntry schema as the base KB.
 */

import type { KBEntry } from './knowledgeBase';

const R = (lo: number, hi: number): [number, number] => [lo, hi];

// ─────────────────────────────────────────────────────────────────────────────
// Wyckoff phases
// ─────────────────────────────────────────────────────────────────────────────
const WYCKOFF: KBEntry[] = [
  {
    id: 'wyckoff.accumulation_a',
    title: 'Wyckoff accumulation phase A — selling climax',
    tags: ['wyckoff','accumulation','phase-a','sc','st'],
    pattern: { volumeZ: R(1.8, 3), lowerWickRatio: R(0.4, 1), trendStrength: R(-3, -1) },
    variants: [
      '{symbol} {tf} shows Wyckoff Phase A: preliminary support, then a selling climax (high volume, wide range, long lower wick).',
      'Capitulation signature on {symbol} {tf} — classic SC bar. The next bar tends to be an automatic rally.',
    ],
    bullets: [
      'Volume > 2σ on the SC bar',
      'Lower wick > 40% of total range',
      'Look for ST (secondary test) to confirm Phase A',
      'Do not anticipate Phase B; wait for the AR rally',
    ],
    risk: ['SC alone is not a bottom — confirm with ST and rising spring.'],
    bias: 'long',
  },
  {
    id: 'wyckoff.spring',
    title: 'Wyckoff Spring (terminal shakeout)',
    tags: ['wyckoff','spring','shakeout','liquidity-grab'],
    pattern: { bbPercentB: R(-3, -1), volumeZ: R(0.5, 3), lowerWickRatio: R(0.3, 1) },
    variants: [
      'Spring on {symbol} {tf}: price punches below prior support, sweeps liquidity, then reclaims. Highest-probability long in Wyckoff playbook.',
      'Terminal shakeout on {symbol} {tf}. Test the spring low with lighter volume → green light to long.',
    ],
    bullets: [
      'Wick below the trading range, body back inside',
      'Volume spikes on the sweep, fades on the test',
      'Stop below the spring low + 0.5×ATR',
      'Target the top of the range first, then markup',
    ],
    risk: ['Failed springs are devastating — must reclaim within 1-2 bars.'],
    bias: 'long',
  },
  {
    id: 'wyckoff.upthrust',
    title: 'Wyckoff Upthrust After Distribution (UTAD)',
    tags: ['wyckoff','utad','distribution','liquidity-grab'],
    pattern: { bbPercentB: R(1, 3), volumeZ: R(0.5, 3), upperWickRatio: R(0.3, 1) },
    variants: [
      'UTAD on {symbol} {tf}: price stabs above resistance to grab stops, then closes back inside. Highest-probability Wyckoff short.',
      'Failed breakout signature on {symbol} {tf}. Mark-down often begins within 3-5 bars.',
    ],
    bullets: [
      'Wick above the range, body back inside',
      'Volume often climactic on the stab',
      'Stop above the UTAD high + 0.5×ATR',
      'Target the bottom of the range first',
    ],
    risk: ['If price closes above the UTAD high on follow-through, abandon the short.'],
    bias: 'short',
  },
  {
    id: 'wyckoff.markup_phase_d',
    title: 'Wyckoff Phase D — markup begins',
    tags: ['wyckoff','phase-d','markup','breakout'],
    pattern: { trendStrength: R(1, 3), adx14: R(0, 3), bbPercentB: R(0.5, 3), volumeZ: R(0.5, 3) },
    variants: [
      '{symbol} {tf} is in Wyckoff Phase D: signs of strength on rising volume, last point of support tested. Markup is underway.',
      'Phase D markup on {symbol} {tf}. Pullbacks to the broken range top are the cleanest re-entries.',
    ],
    bullets: [
      'SOS bar (Sign Of Strength) on wide range + volume',
      'LPS (Last Point of Support) holds on lighter volume',
      'Distribution far in the rear-view',
      'Targets project from the cause built in Phase B',
    ],
    risk: ['Re-enter the range = failed markup; respect the LPS as invalidation.'],
    bias: 'long',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Elliott Wave
// ─────────────────────────────────────────────────────────────────────────────
const ELLIOTT: KBEntry[] = [
  {
    id: 'elliott.wave_3_extension',
    title: 'Elliott Wave 3 extension',
    tags: ['elliott','wave-3','extension','impulse'],
    pattern: { trendStrength: R(1.5, 3), adx14: R(0.5, 3), macdHist_z: R(0.5, 3), momentum10: R(0.5, 3) },
    variants: [
      'Wave 3 conditions are aligning on {symbol} {tf}: steepest momentum, breadth thrust, MACD histogram strongest.',
      '{symbol} {tf} looks like the middle of a 3rd-wave impulse — strongest, longest, fastest wave in the sequence.',
    ],
    bullets: [
      'Strongest momentum in the sequence',
      'Often extends to 1.618 × wave 1',
      'Wave 3 never the shortest (Elliott rule)',
      'Sub-waves visible at lower TF',
    ],
    risk: ['Mis-counts kill — confirm with momentum, do not rely on count alone.'],
    bias: 'long',
  },
  {
    id: 'elliott.wave_5_exhaustion',
    title: 'Elliott Wave 5 exhaustion (bearish divergence)',
    tags: ['elliott','wave-5','exhaustion','divergence'],
    pattern: { trendStrength: R(0.5, 3), macdHist_z: R(-1, 1), rsi14_z: R(0, 2) },
    variants: [
      '{symbol} {tf} prints a new high but momentum can not confirm — Wave 5 exhaustion candidate.',
      'Possible terminal 5th wave on {symbol} {tf}. Look for ending diagonal pattern.',
    ],
    bullets: [
      'Higher-high in price, lower-high in MACD-hist / RSI',
      'Ending diagonal often appears as wedge',
      'Volume contracts on wave 5',
      'Pre-position only at clear invalidation',
    ],
    risk: ['Truncated 5ths happen — wait for 1-2 confirmation.'],
    bias: 'short',
  },
  {
    id: 'elliott.abc_correction',
    title: 'Elliott ABC zigzag correction',
    tags: ['elliott','correction','abc','zigzag'],
    pattern: { trendStrength: R(-1.5, 1.5), adx14: R(-1, 1), bbPercentB: R(-1, 1) },
    variants: [
      '{symbol} {tf} appears to be in a corrective ABC zigzag. Trade the C-wave for higher probability.',
      'Counter-trend correction on {symbol} {tf} — typical 38.2% / 61.8% retracement of the prior impulse.',
    ],
    bullets: [
      'A and C waves are 5-wave impulses',
      'B-wave is 3-wave corrective',
      'C often equals A in length',
      'Look for 1.618 extension when C extends',
    ],
    risk: ['Corrections morph — flat vs zigzag vs triangle each invalidates differently.'],
    bias: 'flat',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Classic chart patterns
// ─────────────────────────────────────────────────────────────────────────────
const CHART_PATTERNS: KBEntry[] = [
  {
    id: 'pattern.head_and_shoulders',
    title: 'Head & Shoulders top',
    tags: ['pattern','head-and-shoulders','reversal','top'],
    pattern: { trendStrength: R(0, 3), upperWickRatio: R(0.2, 1), rsi14_z: R(0, 2) },
    variants: [
      'Classic Head & Shoulders forming on {symbol} {tf}. Neckline break with volume is the trigger.',
      'H&S top on {symbol} {tf}: lower-high on the right shoulder, decreasing volume on each peak.',
    ],
    bullets: [
      'Left shoulder, head, right shoulder structure',
      'Volume highest on left shoulder, lowest on right',
      'Neckline = key invalidation line',
      'Measured move = height of head from neckline',
    ],
    risk: ['Failed H&S reverses violently — invalidate on close back above the right shoulder.'],
    bias: 'short',
  },
  {
    id: 'pattern.inverse_head_and_shoulders',
    title: 'Inverse Head & Shoulders bottom',
    tags: ['pattern','inverse-hs','reversal','bottom'],
    pattern: { trendStrength: R(-3, 0), lowerWickRatio: R(0.2, 1), rsi14_z: R(-2, 0) },
    variants: [
      'Inverse H&S forming on {symbol} {tf}. Neckline reclaim with volume confirms.',
      'Bottoming pattern on {symbol} {tf}: higher-low on the right shoulder, volume expanding on the breakout.',
    ],
    bullets: [
      'Three lows: left shoulder, head (lowest), right shoulder',
      'Right shoulder higher than head',
      'Neckline break with volume = entry',
      'Target = head depth projected from neckline',
    ],
    risk: ['Failed inverse H&S = bull trap; close back below the right shoulder invalidates.'],
    bias: 'long',
  },
  {
    id: 'pattern.double_top',
    title: 'Double Top',
    tags: ['pattern','double-top','reversal'],
    pattern: { trendStrength: R(0, 3), upperWickRatio: R(0.2, 1), bbPercentB: R(0.7, 1.5) },
    variants: [
      'Double top forming on {symbol} {tf}: second peak rejects same level, momentum weaker.',
      '{symbol} {tf} fails at prior high — classic double-top print.',
    ],
    bullets: [
      'Two peaks at similar price',
      'Volume weaker on the second peak',
      'Trough between peaks = neckline',
      'Confirm on neckline break',
    ],
    risk: ['False double-top common in strong trends — wait for the neckline break.'],
    bias: 'short',
  },
  {
    id: 'pattern.double_bottom',
    title: 'Double Bottom',
    tags: ['pattern','double-bottom','reversal'],
    pattern: { trendStrength: R(-3, 0), lowerWickRatio: R(0.2, 1), bbPercentB: R(-1.5, -0.7) },
    variants: [
      'Double bottom forming on {symbol} {tf}: second low holds the prior swing low, momentum diverges.',
      '{symbol} {tf} prints a higher-low test — classic W reversal setup.',
    ],
    bullets: [
      'Two lows at similar price',
      'Bullish divergence on RSI / MACD',
      'Peak between lows = neckline',
      'Confirm on neckline reclaim',
    ],
    risk: ['Failed double-bottom often retests lower — invalidate on close below the second low.'],
    bias: 'long',
  },
  {
    id: 'pattern.bull_flag',
    title: 'Bull Flag continuation',
    tags: ['pattern','bull-flag','continuation'],
    pattern: { trendStrength: R(0.5, 3), bbPercentB: R(-0.5, 0.8), consolidationScore: R(0.3, 1) },
    variants: [
      'Bull flag on {symbol} {tf}: tight pull-back after an impulse leg. Breakout target = flag pole length.',
      '{symbol} {tf} is consolidating after a thrust — textbook continuation pattern.',
    ],
    bullets: [
      'Impulse leg followed by parallel pull-back',
      'Volume dries up in the flag',
      'Breakout direction = direction of the pole',
      'Target = pole height projected from break',
    ],
    risk: ['Failed flags reverse the trend — exit on close below flag low.'],
    bias: 'long',
  },
  {
    id: 'pattern.bear_flag',
    title: 'Bear Flag continuation',
    tags: ['pattern','bear-flag','continuation'],
    pattern: { trendStrength: R(-3, -0.5), bbPercentB: R(-0.8, 0.5), consolidationScore: R(0.3, 1) },
    variants: [
      'Bear flag on {symbol} {tf}: counter-trend bounce after a sell-off leg. Sell-the-rip into the upper flag rail.',
      '{symbol} {tf} consolidates against the downtrend — bear flag for continuation.',
    ],
    bullets: [
      'Impulse down leg, then counter-trend rise',
      'Volume contracts in the flag',
      'Break of flag low = trigger',
      'Target = pole length projected lower',
    ],
    risk: ['If price closes above the flag top, switch bias.'],
    bias: 'short',
  },
  {
    id: 'pattern.ascending_triangle',
    title: 'Ascending Triangle',
    tags: ['pattern','triangle','ascending','continuation'],
    pattern: { trendStrength: R(0, 3), consolidationScore: R(0.4, 1), bbPercentB: R(0.3, 1) },
    variants: [
      'Ascending triangle on {symbol} {tf}: flat top, rising lows. Each test of resistance weakens supply.',
      '{symbol} {tf} compresses into a flat ceiling — typical bullish continuation.',
    ],
    bullets: [
      'Flat horizontal resistance',
      'Higher-lows progression',
      'Volume contracts; expands on break',
      'Target = triangle base height',
    ],
    risk: ['Wait for break with volume; pre-positioning often gets stopped on fake-outs.'],
    bias: 'long',
  },
  {
    id: 'pattern.descending_triangle',
    title: 'Descending Triangle',
    tags: ['pattern','triangle','descending','continuation'],
    pattern: { trendStrength: R(-3, 0), consolidationScore: R(0.4, 1), bbPercentB: R(-1, -0.3) },
    variants: [
      'Descending triangle on {symbol} {tf}: flat floor, lower highs. Sellers absorb each rally.',
      '{symbol} {tf} grinds into a flat floor — bearish continuation setup.',
    ],
    bullets: [
      'Flat horizontal support',
      'Lower-highs progression',
      'Volume contracts; expands on break',
      'Target = triangle base projected lower',
    ],
    risk: ['Failed descending triangle = sharp short squeeze.'],
    bias: 'short',
  },
  {
    id: 'pattern.symmetrical_triangle',
    title: 'Symmetrical Triangle',
    tags: ['pattern','triangle','symmetric','neutral'],
    pattern: { consolidationScore: R(0.5, 1), bbPercentB: R(-0.5, 0.5), adx14: R(-1.5, 0) },
    variants: [
      'Symmetrical triangle on {symbol} {tf}: lower highs and higher lows converging. Direction telegraphed only by the break.',
      '{symbol} {tf} coils into a sym-triangle. The break direction is the trade — do not anticipate.',
    ],
    bullets: [
      'Two converging trendlines',
      'Volume bleeds into the apex',
      'Wait for the break + close',
      'Target = triangle base height',
    ],
    risk: ['False breaks common near the apex; require a closed candle outside.'],
    bias: 'flat',
  },
  {
    id: 'pattern.rising_wedge',
    title: 'Rising Wedge (bearish)',
    tags: ['pattern','wedge','rising','reversal'],
    pattern: { trendStrength: R(0, 3), rsi14_z: R(0, 2.5), upperWickRatio: R(0.2, 1) },
    variants: [
      'Rising wedge on {symbol} {tf}: higher highs and higher lows, but momentum decelerating. Reversal candidate.',
      '{symbol} {tf} climbs into a wedge with weakening RSI — classic ending pattern.',
    ],
    bullets: [
      'Both trendlines slope up, converging',
      'Volume declines as price rises',
      'Bearish divergence on momentum',
      'Break of lower trendline = trigger',
    ],
    risk: ['Wedges fail in strong trends — only act on the break.'],
    bias: 'short',
  },
  {
    id: 'pattern.falling_wedge',
    title: 'Falling Wedge (bullish)',
    tags: ['pattern','wedge','falling','reversal'],
    pattern: { trendStrength: R(-3, 0), rsi14_z: R(-2.5, 0), lowerWickRatio: R(0.2, 1) },
    variants: [
      'Falling wedge on {symbol} {tf}: lower highs and lower lows, but momentum bottoming.',
      '{symbol} {tf} bleeds into a wedge with RSI carving higher lows — bullish reversal candidate.',
    ],
    bullets: [
      'Both trendlines slope down, converging',
      'Volume declines as price falls',
      'Bullish divergence on momentum',
      'Break of upper trendline = trigger',
    ],
    risk: ['Confirm with a close + volume above the wedge.'],
    bias: 'long',
  },
  {
    id: 'pattern.cup_and_handle',
    title: 'Cup & Handle',
    tags: ['pattern','cup-and-handle','continuation','breakout'],
    pattern: { trendStrength: R(0, 3), consolidationScore: R(0.3, 1) },
    variants: [
      'Cup & Handle forming on {symbol} {tf}: rounded base, then a tight handle pull-back. Breakout above the cup rim is the trigger.',
      'O\'Neil-style cup pattern on {symbol} {tf}. Classic stage-2 base.',
    ],
    bullets: [
      'U-shaped base (no V-shape)',
      'Handle = small pull-back inside upper third',
      'Volume dries on handle, expands on breakout',
      'Target = cup depth projected from rim',
    ],
    risk: ['Avoid pre-emptive entry; wait for the rim break.'],
    bias: 'long',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SMC / ICT
// ─────────────────────────────────────────────────────────────────────────────
const SMC_ICT: KBEntry[] = [
  {
    id: 'smc.bullish_ob',
    title: 'Bullish Order Block tap',
    tags: ['smc','order-block','demand'],
    pattern: { trendStrength: R(0, 3), bbPercentB: R(-0.5, 0.5), vwapDist_z: R(-1, 0.5) },
    variants: [
      '{symbol} {tf} taps a bullish OB — last down-candle before the impulse leg up. Smart-money demand zone.',
      'Mitigation of a bullish OB on {symbol} {tf}. Look for displacement to confirm long bias.',
    ],
    bullets: [
      'Last bearish candle before bullish displacement',
      'Inefficiency / FVG often follows',
      'Look for liquidity sweep into the OB',
      'Stop below the OB low',
    ],
    risk: ['Failed OBs reverse hard — confirm with structure.'],
    bias: 'long',
  },
  {
    id: 'smc.bearish_ob',
    title: 'Bearish Order Block tap',
    tags: ['smc','order-block','supply'],
    pattern: { trendStrength: R(-3, 0), bbPercentB: R(-0.5, 0.5), vwapDist_z: R(-0.5, 1) },
    variants: [
      '{symbol} {tf} mitigates a bearish OB — last bullish candle before the impulse leg down. Smart-money supply.',
      'Tap of bearish OB on {symbol} {tf}. Watch for bearish displacement to enter short.',
    ],
    bullets: [
      'Last bullish candle before bearish displacement',
      'Inefficiency / FVG often follows',
      'Look for liquidity sweep into the OB',
      'Stop above the OB high',
    ],
    risk: ['Confirm with structure break; raw OBs alone are not a signal.'],
    bias: 'short',
  },
  {
    id: 'smc.fvg_bullish',
    title: 'Bullish Fair Value Gap mitigation',
    tags: ['smc','fvg','imbalance','bullish'],
    pattern: { trendStrength: R(0, 3), bbPercentB: R(-0.3, 0.7) },
    variants: [
      '{symbol} {tf} retraces into a bullish FVG (3-candle imbalance). Market typically rebalances and continues.',
      'FVG fill in progress on {symbol} {tf}. Look for the reaction at the gap mid.',
    ],
    bullets: [
      '3-candle imbalance with gap between 1st high & 3rd low',
      'Price often rebalances 50-100% of the gap',
      'Stronger when paired with OB / liquidity',
      'Stop below the FVG bottom',
    ],
    risk: ['FVGs can be left open for weeks — do not over-anticipate.'],
    bias: 'long',
  },
  {
    id: 'smc.liquidity_grab',
    title: 'Liquidity grab / stop run',
    tags: ['smc','liquidity','stop-hunt','sweep'],
    pattern: { upperWickRatio: R(0.4, 1), lowerWickRatio: R(0.4, 1), volumeZ: R(0.5, 3) },
    variants: [
      '{symbol} {tf} sweeps liquidity beyond the prior session high/low then closes back inside. Classic stop hunt.',
      'Liquidity grab on {symbol} {tf}. Smart money fills orders by inducing retail breakouts.',
    ],
    bullets: [
      'Wick beyond a key swing high/low',
      'Body closes back inside the prior range',
      'Volume often spikes on the sweep',
      'Trade in the direction of the reclaim',
    ],
    risk: ['Sweeps that hold beyond the level become real breakouts — wait for reclaim confirmation.'],
    bias: 'flat',
  },
  {
    id: 'ict.killzone_london',
    title: 'ICT London killzone',
    tags: ['ict','killzone','london','session'],
    pattern: { volumeZ: R(0.3, 3) },
    variants: [
      '{symbol} {tf} is in the ICT London killzone (02:00-05:00 EST). High-probability window for impulsive moves.',
      'London-open volatility on {symbol} {tf}. Watch for Asian range liquidity sweeps.',
    ],
    bullets: [
      'Session typically sets the high or low of the day',
      'Asian range often gets swept early',
      'Highest probability for impulsive moves',
      'Pair with HTF bias for best results',
    ],
    risk: ['First hour can chop — wait for displacement before entering.'],
    bias: 'flat',
  },
  {
    id: 'ict.killzone_ny',
    title: 'ICT New York killzone',
    tags: ['ict','killzone','new-york','session'],
    pattern: { volumeZ: R(0.3, 3) },
    variants: [
      '{symbol} {tf} is in the ICT NY killzone (07:00-10:00 EST). Second-leg moves and reversals common.',
      'NY-open momentum on {symbol} {tf}. Look for the daily range completion.',
    ],
    bullets: [
      'Often the day\'s reversal kill',
      'Watch the prior London leg for inversion',
      'PD arrays (PDH/PDL) frequently in play',
      'NY high/low usually completes by 10:00',
    ],
    risk: ['Mid-session chop is real — avoid forced entries after 10:30.'],
    bias: 'flat',
  },
  {
    id: 'ict.silver_bullet',
    title: 'ICT Silver Bullet (10:00-11:00 EST)',
    tags: ['ict','silver-bullet','session'],
    pattern: { volumeZ: R(0.3, 3) },
    variants: [
      'Silver Bullet window active on {symbol} {tf}: ~60-minute setup window after NYSE open.',
      'High-probability ICT setup window on {symbol} {tf}. FVG entries get cleanest fills here.',
    ],
    bullets: [
      'Window: 10:00-11:00 ET (~30 min before open)',
      'Trade FVG with HTF bias',
      'Stop at the OB / sweep',
      'Target the next liquidity pool',
    ],
    risk: ['Outside the window the edge fades — be strict on time.'],
    bias: 'flat',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Harmonic patterns
// ─────────────────────────────────────────────────────────────────────────────
const HARMONIC: KBEntry[] = [
  {
    id: 'harmonic.gartley_bull',
    title: 'Bullish Gartley pattern',
    tags: ['harmonic','gartley','reversal'],
    pattern: { trendStrength: R(-1, 1), rsi14_z: R(-2, 0) },
    variants: [
      'Bullish Gartley taking shape on {symbol} {tf}: XA, AB=0.618, BC=0.382-0.886, CD=1.272-1.618.',
      'Harmonic completion zone on {symbol} {tf}. PRZ (Potential Reversal Zone) near D.',
    ],
    bullets: [
      'AB = 0.618 of XA',
      'BC = 0.382-0.886 of AB',
      'CD = 1.272-1.618 of BC',
      'AD = 0.786 of XA (the Gartley ratio)',
    ],
    risk: ['PRZ entries fail more in trends than ranges — confirm with reaction candle.'],
    bias: 'long',
  },
  {
    id: 'harmonic.bat_bear',
    title: 'Bearish Bat pattern',
    tags: ['harmonic','bat','reversal'],
    pattern: { trendStrength: R(-1, 1), rsi14_z: R(0, 2) },
    variants: [
      'Bearish Bat on {symbol} {tf}: XA, AB=0.382-0.5, BC=0.382-0.886, CD=1.618-2.618, AD=0.886.',
      'Harmonic PRZ on {symbol} {tf} for a short. Reaction candle confirms.',
    ],
    bullets: [
      'AB = 0.382-0.5 of XA',
      'AD = 0.886 of XA (the Bat ratio)',
      'BC projection extends to 1.618-2.618',
      'Tighter risk than Gartley',
    ],
    risk: ['Bat fails into trends — confirm bearish structure first.'],
    bias: 'short',
  },
  {
    id: 'harmonic.butterfly_bull',
    title: 'Bullish Butterfly',
    tags: ['harmonic','butterfly','extension'],
    pattern: { trendStrength: R(-2, 0), rsi14_z: R(-3, -0.5) },
    variants: [
      'Bullish Butterfly extension on {symbol} {tf}: AD = 1.272-1.618 of XA. Deep extension reversal.',
      'Butterfly PRZ on {symbol} {tf} marks a deeper reversal than Gartley/Bat.',
    ],
    bullets: [
      'AB = 0.786 of XA',
      'AD = 1.272-1.618 of XA',
      'Aggressive entry at 1.272, scale at 1.618',
      'Stop beyond 1.618',
    ],
    risk: ['Failed Butterfly continues lower fast.'],
    bias: 'long',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Order flow / microstructure
// ─────────────────────────────────────────────────────────────────────────────
const ORDER_FLOW: KBEntry[] = [
  {
    id: 'of.delta_divergence_bull',
    title: 'Bullish cumulative delta divergence',
    tags: ['order-flow','delta','divergence','bullish'],
    pattern: { trendStrength: R(-2, 0), lowerWickRatio: R(0.2, 1), volumeZ: R(0.3, 3) },
    variants: [
      'Cumulative delta on {symbol} {tf} is rising while price makes a lower-low. Hidden bid absorption.',
      'Delta-price divergence on {symbol} {tf}: aggressive buyers stepping in while price drifts down.',
    ],
    bullets: [
      'Cumulative Δ rising on a price decline',
      'OFA (order flow analysis) flips bullish',
      'Stacked-bid clusters at support',
      'Often precedes a sharp short cover',
    ],
    risk: ['Delta divergence without structure break is noise — confirm with BoS.'],
    bias: 'long',
  },
  {
    id: 'of.absorption_resistance',
    title: 'Absorption at resistance',
    tags: ['order-flow','absorption','resistance'],
    pattern: { trendStrength: R(0, 3), upperWickRatio: R(0.3, 1), volumeZ: R(0.5, 3) },
    variants: [
      'Sellers absorbing aggressive bids at resistance on {symbol} {tf}. High volume, low progress.',
      'Absorption signature on {symbol} {tf}: large prints at-the-offer that price cannot pierce.',
    ],
    bullets: [
      'High volume but tight range bars',
      'Negative delta into resistance',
      'Footprint shows sell-side dominance',
      'Reversal precedes a sharp pull-back',
    ],
    risk: ['Absorption fails on a clean break + retest hold.'],
    bias: 'short',
  },
  {
    id: 'of.iceberg_bid',
    title: 'Iceberg bid detected',
    tags: ['order-flow','iceberg','liquidity'],
    pattern: { lowerWickRatio: R(0.2, 1), volumeZ: R(0.5, 3) },
    variants: [
      'Repeated absorption at a price level on {symbol} {tf} — iceberg bid signature.',
      'Hidden liquidity defending {symbol} {tf} at this level. Tactically bullish.',
    ],
    bullets: [
      'Same level absorbed multiple times',
      'Footprint shows persistent buy aggression',
      'Volume tape > order book size',
      'Trade with the iceberg, never against',
    ],
    risk: ['Iceberg can be pulled — exit on a clean break.'],
    bias: 'long',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sessions / time-of-day
// ─────────────────────────────────────────────────────────────────────────────
const SESSIONS: KBEntry[] = [
  {
    id: 'session.asia_range_break',
    title: 'Asia range break (forex)',
    tags: ['session','asia','range','forex','breakout'],
    pattern: { consolidationScore: R(0.4, 1), bbPercentB: R(-0.5, 0.5) },
    variants: [
      'Asia-session range on {symbol} {tf}. London-open break is the standard playbook.',
      '{symbol} {tf} consolidated overnight — wait for the London-open sweep + reclaim.',
    ],
    bullets: [
      'Tight range during Asia hours',
      'London open typically sweeps one side',
      'Trade the reclaim, not the initial break',
      'PDH/PDL bias adds confluence',
    ],
    risk: ['Range-bound Mondays often chop — reduce size.'],
    bias: 'flat',
  },
  {
    id: 'session.power_hour',
    title: 'Power hour (US equities)',
    tags: ['session','power-hour','us-stocks'],
    pattern: { volumeZ: R(0.3, 3) },
    variants: [
      '{symbol} {tf} entering the US equities power hour (15:00-16:00 EST). Volume + volatility peak.',
      'Power hour on {symbol} {tf}. Trend-day continuations and reversals both common.',
    ],
    bullets: [
      'Volume spikes into close',
      'Algorithmic rebalancing flow',
      'MOC (market-on-close) imbalances',
      'Daily range often completes here',
    ],
    risk: ['Late-day reversals brutal — tighten stops by 15:30.'],
    bias: 'flat',
  },
  {
    id: 'session.opex_window',
    title: 'OPEX / monthly expiry window',
    tags: ['session','opex','expiry','pinning'],
    pattern: { consolidationScore: R(0.3, 1) },
    variants: [
      '{symbol} approaches monthly OPEX. Pinning effect around large gamma strikes is common.',
      'OPEX week on {symbol}: directional moves often muted, then released the following Monday.',
    ],
    bullets: [
      'Gamma pinning to max-pain strike',
      'IV crush post-OPEX',
      'Friday close → Monday continuation',
      'Avoid sizing into OPEX without thesis',
    ],
    risk: ['Pin can break violently when gamma flips negative.'],
    bias: 'flat',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Cross-asset (Renaissance-style)
// ─────────────────────────────────────────────────────────────────────────────
const CROSS_ASSET: KBEntry[] = [
  {
    id: 'cross.dxy_inverse_btc',
    title: 'DXY inverse correlation (crypto)',
    tags: ['cross-asset','dxy','crypto','correlation'],
    pattern: { macroRiskScore: R(40, 100) },
    variants: [
      'DXY rolling over while {symbol} consolidates — historically a bullish setup for crypto.',
      'USD weakness on {symbol} {tf}. The DXY-crypto inverse correlation favours risk-on.',
    ],
    bullets: [
      'Crypto and DXY are negatively correlated (~-0.6 30d)',
      'DXY breaking 200-DMA = risk-on tailwind',
      'Watch DXY hourly for shifts',
      'Pair with on-chain stablecoin growth',
    ],
    risk: ['Correlations break during liquidity crises.'],
    bias: 'long',
  },
  {
    id: 'cross.yields_risk_off',
    title: 'Rising yields → risk-off',
    tags: ['cross-asset','yields','rates','risk-off'],
    pattern: { macroRiskScore: R(-1000, 30) },
    variants: [
      'US 10Y yield breaking higher on {symbol} {tf}. Growth-asset multiple compression risk.',
      'Bond-market stress signal active. Risk assets typically underperform until yields stabilise.',
    ],
    bullets: [
      '10Y above key MA = headwind for growth',
      'MOVE index elevated',
      '2s10s curve direction matters',
      'Watch real-yield (TIPS) more than nominal',
    ],
    risk: ['Yields can spike on hawkish Fed comms — respect the macro tape.'],
    bias: 'short',
  },
  {
    id: 'cross.gold_safe_haven',
    title: 'Gold catching safe-haven bid',
    tags: ['cross-asset','gold','safe-haven','risk-off'],
    pattern: { },
    variants: [
      'Gold ripping higher while {symbol} sells off — classic safe-haven flow.',
      '{symbol} risk-off setup confirmed by gold breakout.',
    ],
    bullets: [
      'Gold up + DXY up = funding stress',
      'Confirm with real-yield rolling over',
      'Equities historically underperform',
      'Crypto reacts after equities',
    ],
    risk: ['Gold-DXY divergence regimes are unstable.'],
    bias: 'short',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// On-chain / crypto-specific
// ─────────────────────────────────────────────────────────────────────────────
const ONCHAIN: KBEntry[] = [
  {
    id: 'onchain.exchange_outflow',
    title: 'Large exchange outflow',
    tags: ['onchain','exchange','outflow','accumulation'],
    pattern: { },
    variants: [
      'Net BTC/ETH outflow from exchanges on {symbol} — supply moves to cold storage. Accumulation signature.',
      'Large outflow detected. Reduces sell-side liquidity → bullish on the medium term.',
    ],
    bullets: [
      'Exchange reserves trending down',
      'Aggregate inflows < outflows',
      'Whales custody-ing → reduced overhead supply',
      'Combine with stablecoin growth for confluence',
    ],
    risk: ['Slow-moving factor — does not override short-term technicals.'],
    bias: 'long',
  },
  {
    id: 'onchain.miner_capitulation',
    title: 'Miner capitulation (BTC)',
    tags: ['onchain','miner','capitulation','bottom'],
    pattern: { trendStrength: R(-3, -1) },
    variants: [
      'Miner balances dropping rapidly on {symbol}. Historic bottom indicator for BTC.',
      'Hash ribbon inversion + Puell Multiple < 0.5 = miner capitulation signature.',
    ],
    bullets: [
      'Hash rate dropping with price',
      'Puell Multiple < 0.5',
      'Miner-to-exchange flows spike',
      'Historically 6-18 month bottom',
    ],
    risk: ['Macro can override — leverage flush events extend the bottom.'],
    bias: 'long',
  },
  {
    id: 'onchain.funding_extreme_positive',
    title: 'Extreme positive funding (crypto perps)',
    tags: ['onchain','funding','perps','crowded'],
    pattern: { },
    variants: [
      'Funding rate on {symbol} extreme positive. Crowded longs about to get squeezed.',
      'Perp funding > 0.1% / 8h on {symbol}. Tactically bearish into the next funding reset.',
    ],
    bullets: [
      'Funding > 0.08% / 8h = crowded longs',
      'OI rising with funding → liquidation cascade risk',
      'Watch the next funding settlement window',
      'Spot/perp basis widens',
    ],
    risk: ['Trends can sustain extreme funding for days — wait for OI to roll.'],
    bias: 'short',
  },
  {
    id: 'onchain.dex_volume_surge',
    title: 'DEX volume surge',
    tags: ['onchain','dex','volume','rotation'],
    pattern: { },
    variants: [
      'DEX volume surging on {symbol} — rotation into on-chain liquidity.',
      'On-chain DEX flows accelerating. Often precedes alt-season risk-on.',
    ],
    bullets: [
      'DEX volume > 30-day moving average',
      'Stablecoin pairs liquidity rising',
      'New tokens trending in volume',
      'Combine with CEX outflows for confluence',
    ],
    risk: ['DEX-led rallies fade fast — manage size.'],
    bias: 'long',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Risk / no-edge variants
// ─────────────────────────────────────────────────────────────────────────────
const RISK_OVERRIDES: KBEntry[] = [
  {
    id: 'risk.news_event_imminent',
    title: 'High-impact news event imminent',
    tags: ['risk','news','event','stand-aside'],
    pattern: { },
    variants: [
      'High-impact news event within hours on {symbol}. Volatility regime shift incoming — flatten or hedge.',
      'CPI / FOMC / NFP window active. The engine respects an event veto until release.',
    ],
    bullets: [
      'IV elevated into the event',
      'Liquidity thins minutes before',
      'Spreads widen, slippage rises',
      'Wait for post-release confirmation',
    ],
    risk: ['Event trades have negative EV outside specialist setups.'],
    bias: 'flat',
  },
  {
    id: 'risk.illiquid_session',
    title: 'Thin liquidity window',
    tags: ['risk','liquidity','thin','holiday'],
    pattern: { volumeZ: R(-3, -0.5) },
    variants: [
      'Volume on {symbol} {tf} is materially below the 20-bar mean. Thin liquidity → larger random moves.',
      'Holiday-thin tape on {symbol}. The engine reduces position size automatically.',
    ],
    bullets: [
      'Volume < 0.5×mean',
      'Spreads tend to widen',
      'Stop-runs more common',
      'Risk-reward asymmetry deteriorates',
    ],
    risk: ['Cut size 50% or stand aside in thin liquidity.'],
    bias: 'flat',
  },
];

export const KB_EXPANSION: KBEntry[] = [
  ...WYCKOFF, ...ELLIOTT, ...CHART_PATTERNS, ...SMC_ICT, ...HARMONIC,
  ...ORDER_FLOW, ...SESSIONS, ...CROSS_ASSET, ...ONCHAIN, ...RISK_OVERRIDES,
];
