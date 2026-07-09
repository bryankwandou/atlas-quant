/**
 * ATLAS-QUANT · Client-side Indicator Engine
 * TradingView-equivalent · 70+ indicators
 * Pure browser-safe functions — zero server dependency
 */

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function _ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values[0] ?? 0;
  for (let i = 0; i < values.length; i++) {
    if (i === 0) { result.push(values[0]); continue; }
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function _wilderEma(values: number[], period: number): number[] {
  const k = 1 / period;
  const result: number[] = [];
  let prev = values[0] ?? 0;
  for (let i = 0; i < values.length; i++) {
    if (i === 0) { result.push(values[0]); continue; }
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function _sma(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    const slice = values.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

function _wma(values: number[], period: number): number[] {
  const result: number[] = [];
  const wSum = period * (period + 1) / 2;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let s = 0;
    for (let j = 0; j < period; j++) s += values[i - (period - 1 - j)] * (j + 1);
    result.push(s / wSum);
  }
  return result;
}

function _hma(values: number[], period: number): number[] {
  const half  = Math.floor(period / 2);
  const sqrtP = Math.round(Math.sqrt(period));
  const w1 = _wma(values, half);
  const w2 = _wma(values, period);
  const diff = w1.map((v, i) => !isNaN(v) && !isNaN(w2[i]) ? 2 * v - w2[i] : NaN);
  return _wma(diff, sqrtP);
}

function _alma(values: number[], period = 21, sigma = 6, offset = 0.85): number[] {
  const m = Math.floor(offset * (period - 1));
  const s = period / sigma;
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let norm = 0, sum = 0;
    for (let j = 0; j < period; j++) {
      const w = Math.exp(-((j - m) ** 2) / (2 * s * s));
      norm += w; sum += values[i - (period - 1 - j)] * w;
    }
    result.push(sum / norm);
  }
  return result;
}

/** DEMA — Double Exponential MA */
function _dema(values: number[], period: number): number[] {
  const e1 = _ema(values, period);
  const e2 = _ema(e1, period);
  return e1.map((v, i) => 2 * v - e2[i]);
}

/** TEMA — Triple Exponential MA */
function _tema(values: number[], period: number): number[] {
  const e1 = _ema(values, period);
  const e2 = _ema(e1, period);
  const e3 = _ema(e2, period);
  return e1.map((v, i) => 3 * v - 3 * e2[i] + e3[i]);
}

/** ZLEMA — Zero-Lag EMA */
function _zlema(values: number[], period: number): number[] {
  const lag = Math.floor((period - 1) / 2);
  const adjusted = values.map((v, i) => i < lag ? v : 2 * v - values[i - lag]);
  return _ema(adjusted, period);
}

/** VWMA — Volume Weighted Moving Average */
function _vwma(closes: number[], volumes: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let sumPV = 0, sumV = 0;
    for (let j = i - period + 1; j <= i; j++) { sumPV += closes[j] * volumes[j]; sumV += volumes[j]; }
    result.push(sumV > 0 ? sumPV / sumV : NaN);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// OSCILLATORS
// ─────────────────────────────────────────────────────────────────────────────

function _rsi(closes: number[], period = 14): number[] {
  const changes = closes.map((c, i) => i === 0 ? 0 : c - closes[i - 1]);
  const result: number[] = [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period && i < closes.length; i++) {
    avgGain += Math.max(changes[i], 0);
    avgLoss += Math.abs(Math.min(changes[i], 0));
  }
  avgGain /= period; avgLoss /= period;
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { result.push(NaN); continue; }
    if (i === period) { result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)); continue; }
    const g = Math.max(changes[i], 0);
    const l = Math.abs(Math.min(changes[i], 0));
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

function _macd(closes: number[], fast = 12, slow = 26, sig = 9) {
  const fe = _ema(closes, fast);
  const se = _ema(closes, slow);
  const macdLine = fe.map((f, i) => f - se[i]);
  const sigLine  = _ema(macdLine, sig);
  return { macd: macdLine, signal: sigLine, histogram: macdLine.map((m, i) => m - sigLine[i]) };
}

/** PPO — Percentage Price Oscillator */
function _ppo(closes: number[], fast = 12, slow = 26, sig = 9) {
  const fe = _ema(closes, fast);
  const se = _ema(closes, slow);
  const ppoLine = fe.map((f, i) => se[i] !== 0 ? ((f - se[i]) / se[i]) * 100 : 0);
  const sigLine = _ema(ppoLine, sig);
  return { ppo: ppoLine, signal: sigLine, histogram: ppoLine.map((m, i) => m - sigLine[i]) };
}

/** DPO — Detrended Price Oscillator */
function _dpo(closes: number[], period = 20): number[] {
  const shift = Math.floor(period / 2) + 1;
  const smaV = _sma(closes, period);
  return closes.map((c, i) => {
    const idx = i - shift;
    return idx >= 0 && !isNaN(smaV[idx]) ? c - smaV[idx] : NaN;
  });
}

/** CCI — Commodity Channel Index */
function _cci(highs: number[], lows: number[], closes: number[], period = 20): number[] {
  return closes.map((c, i) => {
    if (i < period - 1) return NaN;
    const slice = Array.from({ length: period }, (_, j) => (highs[i-j] + lows[i-j] + closes[i-j]) / 3);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const mad  = slice.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
    return mad === 0 ? 0 : (((highs[i] + lows[i] + c) / 3) - mean) / (0.015 * mad);
  });
}

/** Williams %R */
function _williamsR(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  return closes.map((c, i) => {
    if (i < period - 1) return NaN;
    const hh = Math.max(...highs.slice(i - period + 1, i + 1));
    const ll = Math.min(...lows.slice(i - period + 1, i + 1));
    return hh === ll ? 0 : ((hh - c) / (hh - ll)) * -100;
  });
}

/** Stochastic Oscillator */
function _stochastic(highs: number[], lows: number[], closes: number[], kPeriod = 14, dPeriod = 3, smooth = 3) {
  const rawK = closes.map((c, i) => {
    if (i < kPeriod - 1) return NaN;
    const hh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const ll = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
    return hh === ll ? 50 : ((c - ll) / (hh - ll)) * 100;
  });
  const k = _sma(rawK.map(v => isNaN(v) ? 0 : v), smooth);
  const d = _sma(k, dPeriod);
  return { k, d };
}

/** Stoch RSI */
function _stochRsi(closes: number[], rsiP = 14, stochP = 14, kP = 3, dP = 3) {
  const rsiV = _rsi(closes, rsiP);
  const stochK = rsiV.map((v, i) => {
    if (i < stochP - 1 || isNaN(v)) return NaN;
    const slice = rsiV.slice(i - stochP + 1, i + 1).filter(x => !isNaN(x));
    const mn = Math.min(...slice), mx = Math.max(...slice);
    return mx === mn ? 0 : (v - mn) / (mx - mn) * 100;
  });
  return { k: _sma(stochK, kP), d: _sma(_sma(stochK, kP), dP) };
}

/** ROC — Rate of Change */
function _roc(closes: number[], period = 9): number[] {
  return closes.map((c, i) => i < period ? NaN : ((c - closes[i - period]) / closes[i - period]) * 100);
}

/** MOM — Momentum */
function _momentum(closes: number[], period = 10): number[] {
  return closes.map((c, i) => i < period ? NaN : c - closes[i - period]);
}

/** TSI — True Strength Index */
function _tsi(closes: number[], longP = 25, shortP = 13, sigP = 13) {
  const changes = closes.map((c, i) => i === 0 ? 0 : c - closes[i - 1]);
  const absChanges = changes.map(Math.abs);
  const pc1  = _ema(changes,    longP);
  const pc2  = _ema(pc1,        shortP);
  const apc1 = _ema(absChanges, longP);
  const apc2 = _ema(apc1,       shortP);
  const tsi = pc2.map((v, i) => apc2[i] !== 0 ? (v / apc2[i]) * 100 : 0);
  return { tsi, signal: _ema(tsi, sigP) };
}

/** CMO — Chande Momentum Oscillator */
function _cmo(closes: number[], period = 9): number[] {
  return closes.map((c, i) => {
    if (i < period) return NaN;
    let up = 0, down = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = closes[j] - closes[j - 1];
      if (d > 0) up += d; else down += Math.abs(d);
    }
    return (up + down) === 0 ? 0 : ((up - down) / (up + down)) * 100;
  });
}

/** Aroon */
function _aroon(highs: number[], lows: number[], period = 25) {
  const up = highs.map((h, i) => {
    if (i < period) return NaN;
    const slice = highs.slice(i - period, i + 1);
    const hiIdx = slice.indexOf(Math.max(...slice));
    return ((hiIdx) / period) * 100;
  });
  const down = lows.map((l, i) => {
    if (i < period) return NaN;
    const slice = lows.slice(i - period, i + 1);
    const loIdx = slice.indexOf(Math.min(...slice));
    return ((loIdx) / period) * 100;
  });
  return { up, down, osc: up.map((u, i) => isNaN(u) ? NaN : u - down[i]) };
}

/** Vortex Indicator */
function _vortex(highs: number[], lows: number[], closes: number[], period = 14) {
  const tr: number[] = [0];
  const vmPlus: number[]  = [0];
  const vmMinus: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1])));
    vmPlus.push(Math.abs(highs[i] - lows[i-1]));
    vmMinus.push(Math.abs(lows[i] - highs[i-1]));
  }
  const viPlus: number[] = [], viMinus: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { viPlus.push(NaN); viMinus.push(NaN); continue; }
    const sumTR = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumVP = vmPlus.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumVM = vmMinus.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    viPlus.push(sumTR > 0 ? sumVP / sumTR : 0);
    viMinus.push(sumTR > 0 ? sumVM / sumTR : 0);
  }
  return { viPlus, viMinus };
}

/** Mass Index */
function _massIndex(highs: number[], lows: number[], emaPeriod = 9, sumPeriod = 25): number[] {
  const hl = highs.map((h, i) => h - lows[i]);
  const e1 = _ema(hl, emaPeriod);
  const e2 = _ema(e1, emaPeriod);
  const ratio = e1.map((v, i) => e2[i] !== 0 ? v / e2[i] : 1);
  const result: number[] = [];
  for (let i = 0; i < highs.length; i++) {
    if (i < sumPeriod - 1) { result.push(NaN); continue; }
    result.push(ratio.slice(i - sumPeriod + 1, i + 1).reduce((a, b) => a + b, 0));
  }
  return result;
}

/** Elder Ray */
function _elderRay(highs: number[], lows: number[], closes: number[], period = 13) {
  const bull = _ema(closes, period);
  return {
    bullPower:  highs.map((h, i) => h - bull[i]),
    bearPower:  lows.map((l, i)  => l - bull[i]),
  };
}

/** Force Index */
function _forceIndex(closes: number[], volumes: number[], period = 13): number[] {
  const fi = closes.map((c, i) => i === 0 ? 0 : (c - closes[i-1]) * volumes[i]);
  return _ema(fi, period);
}

// ─────────────────────────────────────────────────────────────────────────────
// TREND INDICATORS
// ─────────────────────────────────────────────────────────────────────────────

function _atr(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const tr = highs.map((h, i) => {
    if (i === 0) return h - lows[i];
    return Math.max(h - lows[i], Math.abs(h - closes[i-1]), Math.abs(lows[i] - closes[i-1]));
  });
  const result: number[] = [];
  let prev = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    if (i === period - 1) { result.push(prev); continue; }
    prev = (prev * (period - 1) + tr[i]) / period;
    result.push(prev);
  }
  return result;
}

function _bollingerBands(closes: number[], period = 20, mult = 2) {
  const middle = _sma(closes, period);
  const upper: number[] = [], lower: number[] = [], bandwidth: number[] = [], percentB: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(NaN); lower.push(NaN); bandwidth.push(NaN); percentB.push(NaN); continue; }
    const sl = closes.slice(i - period + 1, i + 1);
    const mean = sl.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(sl.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    const u = mean + mult * std, l = mean - mult * std;
    upper.push(u); lower.push(l);
    bandwidth.push(mean > 0 ? (mult * 2 * std) / mean : 0);
    percentB.push(u !== l ? (closes[i] - l) / (u - l) * 100 : 50);
  }
  return { middle, upper, lower, bandwidth, percentB };
}

function _keltner(highs: number[], lows: number[], closes: number[], emaPeriod = 20, atrPeriod = 10, mult = 1.5) {
  const mid  = _ema(closes, emaPeriod);
  const atrV = _atr(highs, lows, closes, atrPeriod);
  return {
    middle: mid,
    upper:  mid.map((m, i) => m + mult * (atrV[i] || 0)),
    lower:  mid.map((m, i) => m - mult * (atrV[i] || 0)),
  };
}

/** Donchian Channel */
function _donchian(highs: number[], lows: number[], period = 20) {
  const upper  = highs.map((h, i) => i < period - 1 ? NaN : Math.max(...highs.slice(i - period + 1, i + 1)));
  const lower  = lows.map((l, i)  => i < period - 1 ? NaN : Math.min(...lows.slice(i - period + 1, i + 1)));
  const middle = upper.map((u, i) => isNaN(u) ? NaN : (u + lower[i]) / 2);
  return { upper, lower, middle };
}

/** Chandelier Exit */
function _chandelierExit(highs: number[], lows: number[], closes: number[], period = 22, mult = 3) {
  const atrV = _atr(highs, lows, closes, period);
  const longStop  = highs.map((h, i) => i < period - 1 ? NaN : Math.max(...highs.slice(i - period + 1, i + 1)) - mult * (atrV[i] || 0));
  const shortStop = lows.map((l, i)  => i < period - 1 ? NaN : Math.min(...lows.slice(i - period + 1, i + 1))  + mult * (atrV[i] || 0));
  return { longStop, shortStop };
}

/** Parabolic SAR */
function _parabolicSAR(highs: number[], lows: number[], step = 0.02, max = 0.2): number[] {
  const n = highs.length;
  const sar: number[] = new Array(n).fill(NaN);
  if (n < 2) return sar;
  let bull = true;
  let af   = step;
  let ep   = bull ? highs[0] : lows[0];
  sar[0]   = bull ? lows[0]  : highs[0];
  for (let i = 1; i < n; i++) {
    let prevSar = sar[i - 1];
    if (bull) {
      sar[i] = prevSar + af * (ep - prevSar);
      sar[i] = Math.min(sar[i], lows[i-1], i >= 2 ? lows[i-2] : lows[i-1]);
      if (lows[i] < sar[i]) {
        bull = false; af = step; ep = lows[i]; sar[i] = ep;
      } else {
        if (highs[i] > ep) { ep = highs[i]; af = Math.min(af + step, max); }
      }
    } else {
      sar[i] = prevSar - af * (prevSar - ep);
      sar[i] = Math.max(sar[i], highs[i-1], i >= 2 ? highs[i-2] : highs[i-1]);
      if (highs[i] > sar[i]) {
        bull = true; af = step; ep = highs[i]; sar[i] = ep;
      } else {
        if (lows[i] < ep) { ep = lows[i]; af = Math.min(af + step, max); }
      }
    }
  }
  return sar;
}

/** Supertrend */
function _supertrend(highs: number[], lows: number[], closes: number[], period = 10, mult = 3) {
  const atrV = _atr(highs, lows, closes, period);
  const upper: number[] = [], lower: number[] = [], direction: number[] = [];
  let prevUpper = 0, prevLower = 0, prevDir = 1;
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(atrV[i])) { upper.push(NaN); lower.push(NaN); direction.push(1); continue; }
    const hl2 = (highs[i] + lows[i]) / 2;
    const bu = hl2 + mult * atrV[i];
    const bl = hl2 - mult * atrV[i];
    const finalUpper = bu < prevUpper || closes[i-1 < 0 ? 0 : i-1] > prevUpper ? bu : prevUpper;
    const finalLower = bl > prevLower || closes[i-1 < 0 ? 0 : i-1] < prevLower ? bl : prevLower;
    let dir = prevDir;
    if (prevDir === -1 && closes[i] > prevUpper) dir = 1;
    else if (prevDir === 1 && closes[i] < prevLower) dir = -1;
    upper.push(finalUpper); lower.push(finalLower); direction.push(dir);
    prevUpper = finalUpper; prevLower = finalLower; prevDir = dir;
  }
  return { upper, lower, direction };
}

/** Ichimoku Cloud */
function _ichimoku(highs: number[], lows: number[], closes: number[], tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52, displacement = 26) {
  const midFn = (h: number[], l: number[], p: number, idx: number) => {
    if (idx < p - 1) return NaN;
    return (Math.max(...h.slice(idx-p+1,idx+1)) + Math.min(...l.slice(idx-p+1,idx+1))) / 2;
  };
  const tenkan  = closes.map((_, i) => midFn(highs, lows, tenkanPeriod,  i));
  const kijun   = closes.map((_, i) => midFn(highs, lows, kijunPeriod,   i));
  const senkouA: number[] = new Array(closes.length).fill(NaN);
  const senkouB: number[] = new Array(closes.length).fill(NaN);
  for (let i = 0; i < closes.length; i++) {
    const future = i + displacement;
    if (future < closes.length) {
      senkouA[future] = !isNaN(tenkan[i]) && !isNaN(kijun[i]) ? (tenkan[i] + kijun[i]) / 2 : NaN;
      senkouB[future] = midFn(highs, lows, senkouBPeriod, i);
    }
  }
  const chikou: number[] = new Array(closes.length).fill(NaN);
  for (let i = 0; i + displacement < closes.length; i++) chikou[i] = closes[i + displacement];
  return { tenkan, kijun, senkouA, senkouB, chikou };
}

/** ADX */
function _adx(highs: number[], lows: number[], closes: number[], period = 14) {
  const plusDM: number[]  = [0], minusDM: number[] = [0], tr: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < closes.length; i++) {
    const hd = highs[i] - highs[i-1], ld = lows[i-1] - lows[i];
    plusDM.push(hd > ld && hd > 0 ? hd : 0);
    minusDM.push(ld > hd && ld > 0 ? ld : 0);
    tr.push(Math.max(highs[i]-lows[i], Math.abs(highs[i]-closes[i-1]), Math.abs(lows[i]-closes[i-1])));
  }
  function wilder(vals: number[], p: number): number[] {
    const r: number[] = [];
    for (let i = 0; i < vals.length; i++) {
      if (i < p)    { r.push(NaN); continue; }
      if (i === p)  { r.push(vals.slice(0, p).reduce((a, b) => a + b, 0)); continue; }
      r.push(r[i-1] - r[i-1]/p + vals[i]);
    }
    return r;
  }
  const sTR = wilder(tr, period), sPDM = wilder(plusDM, period), sMDM = wilder(minusDM, period);
  const plusDI  = sPDM.map((p, i) => sTR[i] > 0 ? p / sTR[i] * 100 : 0);
  const minusDI = sMDM.map((m, i) => sTR[i] > 0 ? m / sTR[i] * 100 : 0);
  const dx      = plusDI.map((p, i) => (p + minusDI[i]) > 0 ? Math.abs(p - minusDI[i]) / (p + minusDI[i]) * 100 : 0);
  return { adx: wilder(dx, period), plusDI, minusDI };
}

// ─────────────────────────────────────────────────────────────────────────────
// VOLUME INDICATORS
// ─────────────────────────────────────────────────────────────────────────────

function _vwap(highs: number[], lows: number[], closes: number[], volumes: number[]): number[] {
  let cumTPV = 0, cumVol = 0;
  return closes.map((c, i) => {
    const tp = (highs[i] + lows[i] + c) / 3;
    cumTPV += tp * volumes[i]; cumVol += volumes[i];
    return cumVol > 0 ? cumTPV / cumVol : c;
  });
}

/** VWAP Bands */
function _vwapBands(highs: number[], lows: number[], closes: number[], volumes: number[], mult = 1.5) {
  let cumTPV = 0, cumVol = 0, cumTPV2 = 0;
  const vwapLine: number[] = [], upper: number[] = [], lower: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumTPV += tp * volumes[i]; cumVol += volumes[i]; cumTPV2 += tp * tp * volumes[i];
    const v = cumVol > 0 ? cumTPV / cumVol : closes[i];
    const variance = cumVol > 0 ? Math.max(0, cumTPV2 / cumVol - v * v) : 0;
    const std = Math.sqrt(variance);
    vwapLine.push(v); upper.push(v + mult * std); lower.push(v - mult * std);
  }
  return { vwap: vwapLine, upper, lower };
}

function _mfi(highs: number[], lows: number[], closes: number[], volumes: number[], period = 14): number[] {
  return closes.map((c, i) => {
    if (i < period) return NaN;
    let pos = 0, neg = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const tp     = (highs[j] + lows[j] + closes[j]) / 3;
      const prevTp = j > 0 ? (highs[j-1] + lows[j-1] + closes[j-1]) / 3 : tp;
      const rf = tp * volumes[j];
      if (tp > prevTp) pos += rf; else if (tp < prevTp) neg += rf;
    }
    return neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
  });
}

/** OBV — On Balance Volume */
function _obv(closes: number[], volumes: number[]): number[] {
  const result: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    const prev = result[i - 1];
    if (closes[i] > closes[i-1])      result.push(prev + volumes[i]);
    else if (closes[i] < closes[i-1]) result.push(prev - volumes[i]);
    else                               result.push(prev);
  }
  return result;
}

/** CMF — Chaikin Money Flow */
function _cmf(highs: number[], lows: number[], closes: number[], volumes: number[], period = 20): number[] {
  return closes.map((c, i) => {
    if (i < period - 1) return NaN;
    let sumMFV = 0, sumVol = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const hl = highs[j] - lows[j];
      const mf = hl !== 0 ? ((closes[j] - lows[j] - (highs[j] - closes[j])) / hl) * volumes[j] : 0;
      sumMFV += mf; sumVol += volumes[j];
    }
    return sumVol !== 0 ? sumMFV / sumVol : 0;
  });
}

/** Accumulation/Distribution */
function _accumDist(highs: number[], lows: number[], closes: number[], volumes: number[]): number[] {
  const result: number[] = [];
  let cum = 0;
  for (let i = 0; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const clv = hl !== 0 ? ((closes[i] - lows[i]) - (highs[i] - closes[i])) / hl : 0;
    cum += clv * volumes[i];
    result.push(cum);
  }
  return result;
}

/** PVO — Percentage Volume Oscillator */
function _pvo(volumes: number[], fast = 12, slow = 26, sig = 9) {
  const fe = _ema(volumes, fast);
  const se = _ema(volumes, slow);
  const pvoLine = fe.map((f, i) => se[i] !== 0 ? ((f - se[i]) / se[i]) * 100 : 0);
  return { pvo: pvoLine, signal: _ema(pvoLine, sig), histogram: pvoLine.map((v, i) => v - _ema(pvoLine, sig)[i]) };
}

// ─────────────────────────────────────────────────────────────────────────────
// BANDARMOLOGI (smart-money / big-player flow) — OHLCV-proxy variants.
// No true order-flow feed needed: buy/sell pressure is inferred from each candle's
// body direction, close position within range, and volume. Good for retail use.
// ─────────────────────────────────────────────────────────────────────────────

/** CVD proxy — Cumulative Volume Delta. Per-bar delta = volume × signed body
 *  fraction (green bar = net taker-buy, red = net taker-sell). Cumulative sum is
 *  the "smart-money flow" line; rising = net accumulation. */
function _cvd(opens: number[], highs: number[], lows: number[], closes: number[], volumes: number[]) {
  const cvd: number[] = []; const delta: number[] = [];
  let cum = 0;
  for (let i = 0; i < closes.length; i++) {
    const range = (highs[i] - lows[i]) || 1e-9;
    // blend candle-body direction with close-in-range position for a stable proxy
    const body = (closes[i] - opens[i]) / range;                       // -1..1
    const clv  = ((closes[i] - lows[i]) - (highs[i] - closes[i])) / range; // -1..1
    const d = (0.6 * body + 0.4 * clv) * (volumes[i] || 0);
    delta.push(d); cum += d; cvd.push(cum);
  }
  return { cvd, delta };
}

/** Bandar Accumulation/Distribution — A/D line + how far it sits above/below its
 *  own EMA (accumulation osc). Positive hist = bandar accumulating, negative =
 *  distributing. */
function _bandarAD(highs: number[], lows: number[], closes: number[], volumes: number[], period = 21) {
  const ad = _accumDist(highs, lows, closes, volumes);
  const sig = _ema(ad, period);
  const hist = ad.map((v, i) => Number.isFinite(sig[i]) ? v - sig[i] : 0);
  return { ad, signal: sig, histogram: hist };
}

/** Bandar Detector — composite 0–100 accumulation score + Wyckoff-style phase.
 *  Blends the slopes of CVD / A/D / OBV with CMF and MFI, normalized by their own
 *  rolling magnitude so the score stays vivid. >55 accumulation, <45 distribution. */
function _bandarDetector(opens: number[], highs: number[], lows: number[], closes: number[], volumes: number[], look = 8) {
  const n = closes.length;
  const { cvd, delta } = _cvd(opens, highs, lows, closes, volumes);
  const ad  = _accumDist(highs, lows, closes, volumes);
  const obv = _obv(closes, volumes);
  const cmf = _cmf(highs, lows, closes, volumes, 20);
  const mfi = _mfi(highs, lows, closes, volumes, 14);

  // rolling-normalized slope of a cumulative series → -1..1
  const normSlope = (arr: number[]) => {
    const sl = arr.map((_, i) => i >= look ? arr[i] - arr[i - look] : 0);
    const out = new Array(n).fill(0);
    const win = 50;
    for (let i = 0; i < n; i++) {
      let mag = 0, c = 0;
      for (let j = Math.max(0, i - win + 1); j <= i; j++) { mag += Math.abs(sl[j]); c++; }
      const avg = c ? mag / c : 0;
      out[i] = avg > 0 ? Math.max(-1, Math.min(1, sl[i] / (avg * 1.5))) : 0;
    }
    return out;
  };

  // True range — used to normalize price moves for the divergence term.
  const tr = closes.map((_, i) => i === 0 ? (highs[i] - lows[i])
    : Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));

  // Price ↔ CVD divergence over a swing window — the strongest "bandar" tell:
  //  price falling while CVD holds/rises = hidden ACCUMULATION (smart money buying
  //  the dip); price rising while CVD falls = hidden DISTRIBUTION (selling the rally).
  const dWin = Math.max(10, look * 3);
  const diverg = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const j = Math.max(0, i - dWin);
    let trSum = 1e-9, dSum = 1e-9;
    for (let k = j + 1; k <= i; k++) { trSum += tr[k]; dSum += Math.abs(delta[k]); }
    const pMove = Math.max(-1, Math.min(1, (closes[i] - closes[j]) / trSum)); // -1..1 (in ATRs)
    const cMove = Math.max(-1, Math.min(1, (cvd[i] - cvd[j]) / dSum));        // -1..1 (in net flow)
    // flow stronger than price → accumulation (+); price stronger than flow → distribution (−)
    diverg[i] = Math.max(-1, Math.min(1, cMove - pMove));
  }

  const sCvd = normSlope(cvd), sAd = normSlope(ad), sObv = normSlope(obv);
  const score: number[] = [], phase: string[] = [];
  for (let i = 0; i < n; i++) {
    const cmfN = Math.max(-1, Math.min(1, (cmf[i] || 0) * 4));         // ~-1..1
    const mfiN = Math.max(-1, Math.min(1, ((mfi[i] || 50) - 50) / 50)); // -1..1
    const blend = 0.26 * sCvd[i] + 0.16 * sAd[i] + 0.12 * sObv[i]
                + 0.12 * cmfN + 0.10 * mfiN + 0.24 * diverg[i];
    // tanh → decisive (saturates toward 0/100 on conviction) instead of hugging 50.
    const sc = Math.max(0, Math.min(100, 50 + 50 * Math.tanh(blend * 1.9)));
    score.push(sc);
    const up = closes[i] >= (closes[Math.max(0, i - look)] ?? closes[i]);
    phase.push(sc >= 55 ? (up ? 'MARKUP' : 'AKUMULASI') : sc <= 45 ? (up ? 'DISTRIBUSI' : 'MARKDOWN') : 'NETRAL');
  }
  // Light 3-bar smoothing keeps the histogram readable without dulling turns.
  const smooth = _ema(score, 3);
  return { score: smooth, phase, signal: _ema(score, 9) };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT / RESISTANCE / PIVOTS
// ─────────────────────────────────────────────────────────────────────────────

function _pivots(highs: number[], lows: number[], period = 5) {
  const swingH: number[] = [], swingL: number[] = [];
  for (let i = period; i < highs.length - period; i++) {
    let isHigh = true, isLow = true;
    for (let j = i - period; j <= i + period; j++) {
      if (j === i) continue;
      if (highs[j] >= highs[i]) isHigh = false;
      if (lows[j]  <= lows[i])  isLow  = false;
    }
    if (isHigh) swingH.push(i);
    if (isLow)  swingL.push(i);
  }
  return { swingH, swingL };
}

/** Standard Pivot Points */
function _pivotPoints(highs: number[], lows: number[], closes: number[]) {
  const n = closes.length;
  if (n < 2) return null;
  const ph = highs[n-2], pl = lows[n-2], pc = closes[n-2];
  const pp = (ph + pl + pc) / 3;
  return { pp, r1: 2*pp-pl, r2: pp+(ph-pl), r3: ph+2*(pp-pl), s1: 2*pp-ph, s2: pp-(ph-pl), s3: pl-2*(ph-pp) };
}

function _supportResistance(highs: number[], lows: number[], closes: number[], n = 5) {
  const pivs  = _pivots(highs, lows, n);
  const price = closes[closes.length - 1];
  const supports    = pivs.swingL.slice(-6).map(i => ({ price: lows[i],  type: 'S' as const })).filter(l => l.price < price).sort((a, b) => b.price - a.price).slice(0, 3);
  const resistances = pivs.swingH.slice(-6).map(i => ({ price: highs[i], type: 'R' as const })).filter(l => l.price > price).sort((a, b) => a.price - b.price).slice(0, 3);
  return { supports, resistances };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCED / QUANTITATIVE
// ─────────────────────────────────────────────────────────────────────────────

/** Z-Score */
function _zscore(closes: number[], period = 20): number[] {
  return closes.map((c, i) => {
    if (i < period - 1) return NaN;
    const sl   = closes.slice(i - period + 1, i + 1);
    const mean = sl.reduce((a, b) => a + b, 0) / period;
    const std  = Math.sqrt(sl.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return std > 0 ? (c - mean) / std : 0;
  });
}

/** Historical Volatility (annualized %) */
function _historicalVolatility(closes: number[], period = 20): number[] {
  const logRet = closes.map((c, i) => i === 0 ? 0 : Math.log(c / closes[i-1]));
  return closes.map((_, i) => {
    if (i < period) return NaN;
    const sl   = logRet.slice(i - period + 1, i + 1);
    const mean = sl.reduce((a, b) => a + b, 0) / period;
    const std  = Math.sqrt(sl.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return std * Math.sqrt(252) * 100;
  });
}

/** Coppock Curve */
function _coppockCurve(closes: number[], wma_period = 10, roc1 = 14, roc2 = 11): number[] {
  const r1 = _roc(closes, roc1);
  const r2 = _roc(closes, roc2);
  const sum = r1.map((v, i) => isNaN(v) || isNaN(r2[i]) ? NaN : v + r2[i]);
  return _wma(sum.map(v => isNaN(v) ? 0 : v), wma_period);
}

/** TRIX */
function _trix(closes: number[], period = 15, sigPeriod = 9) {
  const t1 = _ema(closes, period);
  const t2 = _ema(t1, period);
  const t3 = _ema(t2, period);
  const trixLine = t3.map((v, i) => i > 0 && t3[i-1] !== 0 ? ((v - t3[i-1]) / t3[i-1]) * 100 : 0);
  return { trix: trixLine, signal: _ema(trixLine, sigPeriod) };
}

/** Ultimate Oscillator */
function _ultimateOscillator(highs: number[], lows: number[], closes: number[], p1 = 7, p2 = 14, p3 = 28): number[] {
  return closes.map((c, i) => {
    if (i < p3) return NaN;
    const calc = (p: number) => {
      let sumBP = 0, sumTR = 0;
      for (let j = i - p + 1; j <= i; j++) {
        const prevC = closes[j-1];
        const lo = Math.min(lows[j], prevC), hi = Math.max(highs[j], prevC);
        sumBP += c - lo; sumTR += hi - lo;
      }
      return sumTR > 0 ? sumBP / sumTR : 0;
    };
    return (4 * calc(p1) + 2 * calc(p2) + calc(p3)) / 7 * 100;
  });
}

/** Fisher Transform */
function _fisherTransform(highs: number[], lows: number[], period = 9) {
  const midpoints = highs.map((h, i) => (h + lows[i]) / 2);
  const result: number[] = [], trigger: number[] = [];
  let prevFisher = 0;
  for (let i = 0; i < highs.length; i++) {
    if (i < period - 1) { result.push(0); trigger.push(0); continue; }
    const hi = Math.max(...highs.slice(i - period + 1, i + 1));
    const lo = Math.min(...lows.slice(i - period + 1, i + 1));
    const hl = hi - lo;
    const val = hl > 0 ? Math.max(-0.999, Math.min(0.999, 2 * ((midpoints[i] - lo) / hl) - 1)) : 0;
    const fish = 0.5 * Math.log((1 + val) / (1 - val));
    trigger.push(prevFisher);
    result.push(fish);
    prevFisher = fish;
  }
  return { fisher: result, trigger };
}

/** Squeeze Momentum (LazyBear style) */
function _squeezeMomentum(highs: number[], lows: number[], closes: number[], volumes: number[], bbPeriod = 20, bbMult = 2, kcPeriod = 20, kcMult = 1.5) {
  const bb = _bollingerBands(closes, bbPeriod, bbMult);
  const kc = _keltner(highs, lows, closes, kcPeriod, kcPeriod, kcMult);
  const sqz = bb.upper.map((u, i) => ({ squeeze: bb.lower[i] > kc.lower[i] && u < kc.upper[i], noSqueeze: bb.lower[i] < kc.lower[i] && u > kc.upper[i] }));
  const linReg = closes.map((c, i) => {
    if (i < kcPeriod - 1) return NaN;
    const highest = Math.max(...highs.slice(i - kcPeriod + 1, i + 1));
    const lowest  = Math.min(...lows.slice(i - kcPeriod + 1, i + 1));
    const midHL   = (highest + lowest) / 2;
    const midKC   = (kc.upper[i] + kc.lower[i]) / 2;
    const delta   = c - (midHL + midKC) / 2;
    return delta;
  });
  return { squeeze: sqz, momentum: _ema(linReg.map(v => isNaN(v) ? 0 : v), 3) };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMC (Smart Money Concepts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Smart-Money Concept detector — proper structural version (2026-07-09 rewrite).
 *
 * The OLD detector fired an "order block" on every 3-bar micro-pivot, so hundreds
 * clustered densely and the render's `.slice(-3)` always landed inside the last few
 * bars ("SMC only reads the last 10 minutes" bug). This version follows real SMC:
 *
 *   1. Pivots  — swing high/low over ±`L` bars (structural, not micro).
 *   2. BOS     — a close that breaks the most-recent opposite swing = Break of
 *                Structure (trend continuation event).
 *   3. OB      — the LAST opposite-direction candle before the impulse that caused
 *                the BOS. Filtered by strength: the impulse leg must be ≥1.5×ATR
 *                (kills noise pivots entirely).
 *   4. Mitigation — an OB is dropped once price later trades back through its zone;
 *                only FRESH (unmitigated) zones survive. These naturally spread
 *                across the whole lookback instead of piling up at the right edge.
 *
 * `lookback` bounds how far back OBs stay relevant (default 250 bars → "reads 200+
 * candles of any timeframe", matching the user's expectation).
 */
function _detectSMC(
  closes: number[], highs: number[], lows: number[], lookback = 250,
) {
  const n = closes.length;
  const orderBlocks: Array<{ type: 'bullish' | 'bearish'; high: number; low: number; idx: number; breakIdx: number }> = [];
  const fvg: Array<{ type: 'bullish' | 'bearish'; top: number; bottom: number; idx: number }> = [];
  const bos: Array<{ type: 'bullish' | 'bearish'; level: number; idx: number }> = [];
  if (n < 20) return { orderBlocks, fvg, bos };

  // ATR(14) for the significance filter (Wilder EMA of true range).
  const atr = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const tr = i === 0 ? highs[i] - lows[i]
      : Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    atr[i] = i === 0 ? tr : (atr[i - 1] * 13 + tr) / 14;
  }

  // Swing pivots over ±L bars (structural highs/lows).
  const L = 3;
  const isHigh = new Array<boolean>(n).fill(false);
  const isLow  = new Array<boolean>(n).fill(false);
  for (let i = L; i < n - L; i++) {
    let hi = true, lo = true;
    for (let j = i - L; j <= i + L; j++) {
      if (j === i) continue;
      if (highs[j] >= highs[i]) hi = false;
      if (lows[j]  <= lows[i])  lo = false;
    }
    isHigh[i] = hi; isLow[i] = lo;
  }

  // Walk forward; on each BOS, find the originating order block.
  let lastSwingHigh: { level: number; idx: number } | null = null;
  let lastSwingLow:  { level: number; idx: number } | null = null;
  const dir = (j: number) => (j > 0 ? closes[j] - closes[j - 1] : 0); // close-to-close candle direction
  for (let i = L; i < n; i++) {
    if (isHigh[i]) lastSwingHigh = { level: highs[i], idx: i };
    if (isLow[i])  lastSwingLow  = { level: lows[i],  idx: i };

    // Bullish BOS — close breaks the last swing high.
    if (lastSwingHigh && i > lastSwingHigh.idx && closes[i] > lastSwingHigh.level) {
      let obIdx = -1;
      for (let j = i - 1; j >= Math.max(0, i - 20); j--) { if (dir(j) < 0) { obIdx = j; break; } }
      if (obIdx >= 0 && closes[i] - lows[obIdx] >= atr[i] * 1.5) {
        orderBlocks.push({ type: 'bullish', high: highs[obIdx], low: lows[obIdx], idx: obIdx, breakIdx: i });
        bos.push({ type: 'bullish', level: lastSwingHigh.level, idx: i });
      }
      lastSwingHigh = null; // consumed — wait for a new structural high
    }

    // Bearish BOS — close breaks the last swing low.
    if (lastSwingLow && i > lastSwingLow.idx && closes[i] < lastSwingLow.level) {
      let obIdx = -1;
      for (let j = i - 1; j >= Math.max(0, i - 20); j--) { if (dir(j) > 0) { obIdx = j; break; } }
      if (obIdx >= 0 && highs[obIdx] - closes[i] >= atr[i] * 1.5) {
        orderBlocks.push({ type: 'bearish', high: highs[obIdx], low: lows[obIdx], idx: obIdx, breakIdx: i });
        bos.push({ type: 'bearish', level: lastSwingLow.level, idx: i });
      }
      lastSwingLow = null;
    }
  }

  // Keep only UNMITIGATED order blocks within the lookback (fresh zones spread out
  // across history, not micro-pivots crammed at the right edge).
  const minIdx = Math.max(0, n - lookback);
  const freshOB = orderBlocks.filter((ob) => {
    if (ob.idx < minIdx) return false;
    for (let j = ob.breakIdx + 1; j < n; j++) {
      if (ob.type === 'bullish' && lows[j]  <= ob.high) return false; // price returned into the zone
      if (ob.type === 'bearish' && highs[j] >= ob.low)  return false;
    }
    return true;
  });

  // Fair Value Gaps (3-candle imbalance) with a size filter; keep unmitigated only.
  for (let i = 2; i < n; i++) {
    if (i < minIdx) continue;
    if (lows[i] > highs[i - 2] && lows[i] - highs[i - 2] >= atr[i] * 0.3) fvg.push({ type: 'bullish', top: lows[i], bottom: highs[i - 2], idx: i });
    if (highs[i] < lows[i - 2] && lows[i - 2] - highs[i] >= atr[i] * 0.3) fvg.push({ type: 'bearish', top: lows[i - 2], bottom: highs[i], idx: i });
  }
  const freshFvg = fvg.filter((g) => {
    for (let j = g.idx + 1; j < n; j++) {
      if (g.type === 'bullish' && lows[j]  <= g.bottom) return false;
      if (g.type === 'bearish' && highs[j] >= g.top)    return false;
    }
    return true;
  });

  return { orderBlocks: freshOB.slice(-12), fvg: freshFvg.slice(-8), bos: bos.slice(-8) };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTIVE MOVING AVERAGES
// ─────────────────────────────────────────────────────────────────────────────

/** KAMA — Kaufman Adaptive Moving Average */
function _kama(closes: number[], period = 10, fastEnd = 2, slowEnd = 30): number[] {
  const fast = 2 / (fastEnd + 1);
  const slow = 2 / (slowEnd + 1);
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;
  result[period] = closes[period];
  for (let i = period + 1; i < closes.length; i++) {
    const change  = Math.abs(closes[i] - closes[i - period]);
    let volatility = 0;
    for (let j = i - period + 1; j <= i; j++) volatility += Math.abs(closes[j] - closes[j - 1]);
    const er = volatility > 0 ? change / volatility : 0;
    const sc = Math.pow(er * (fast - slow) + slow, 2);
    result[i] = result[i - 1] + sc * (closes[i] - result[i - 1]);
  }
  return result;
}

/** McGinley Dynamic MA */
function _mcginley(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  let prev = closes[0];
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { result[0] = closes[0]; continue; }
    const denom = period * Math.pow(closes[i] / prev, 4);
    prev = denom > 0 ? prev + (closes[i] - prev) / denom : prev;
    result[i] = prev;
  }
  return result;
}

/** T3 — Tim Tillson's Triple EMA (5th-order) */
function _t3(closes: number[], period = 5, vFactor = 0.7): number[] {
  const vf2 = vFactor * vFactor;
  const vf3 = vf2 * vFactor;
  const c1 = -(vf3);
  const c2 = 3 * vf2 + 3 * vf3;
  const c3 = -6 * vf2 - 3 * vFactor - 3 * vf3;
  const c4 = 1 + 3 * vFactor + vf3 + 3 * vf2;
  const e1 = _ema(closes, period);
  const e2 = _ema(e1, period);
  const e3 = _ema(e2, period);
  const e4 = _ema(e3, period);
  const e5 = _ema(e4, period);
  const e6 = _ema(e5, period);
  return e6.map((v, i) => c1*v + c2*e5[i] + c3*e4[i] + c4*e3[i]);
}

/** SMMA / RMA — Smoothed/Running Moving Average (Wilder) */
function _smma(values: number[], period: number): number[] {
  return _wilderEma(values, period);
}

/** LSMA — Least Squares Moving Average (Linear Regression MA) */
function _lsma(closes: number[], period = 25): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    const x = Array.from({ length: period }, (_, j) => j);
    const y = closes.slice(i - period + 1, i + 1);
    const n = period;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, j) => a + b * y[j], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) { result.push(closes[i]); continue; }
    const m = (n * sumXY - sumX * sumY) / denom;
    const b2 = (sumY - m * sumX) / n;
    result.push(m * (period - 1) + b2);
  }
  return result;
}

/** VIDYA — Variable Index Dynamic Average */
function _vidya(closes: number[], period = 14, momentumPeriod = 10): number[] {
  const cmo = _cmo(closes, momentumPeriod).map(v => Math.abs(v) / 100);
  const alpha = 2 / (period + 1);
  const result: number[] = new Array(closes.length).fill(NaN);
  result[0] = closes[0];
  for (let i = 1; i < closes.length; i++) {
    const k = alpha * (isNaN(cmo[i]) ? 0 : cmo[i]);
    const prev = isNaN(result[i - 1]) ? closes[i - 1] : result[i - 1];
    result[i] = k * closes[i] + (1 - k) * prev;
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCED OSCILLATORS
// ─────────────────────────────────────────────────────────────────────────────

/** WaveTrend Oscillator (WT1, WT2) — popular LazyBear community script */
function _waveTrend(highs: number[], lows: number[], closes: number[], n1 = 10, n2 = 21) {
  const hlc3 = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
  const esa = _ema(hlc3, n1);
  const d   = _ema(hlc3.map((v, i) => Math.abs(v - esa[i])), n1);
  const ci  = hlc3.map((v, i) => d[i] !== 0 ? (v - esa[i]) / (0.015 * d[i]) : 0);
  const wt1 = _ema(ci, n2);
  const wt2 = _sma(wt1, 4);
  return { wt1, wt2, cross: wt1.map((v, i) => v - wt2[i]) };
}

/** Schaff Trend Cycle (STC) */
function _stc(closes: number[], stcPeriod = 10, fast = 23, slow = 50, signal = 3) {
  const { macd } = _macd(closes, fast, slow, signal);
  const stochMacd = macd.map((m, i) => {
    if (i < stcPeriod - 1) return NaN;
    const sl = macd.slice(i - stcPeriod + 1, i + 1).filter(x => !isNaN(x));
    const mn = Math.min(...sl), mx = Math.max(...sl);
    return mx === mn ? 0 : ((m - mn) / (mx - mn)) * 100;
  });
  const kLine = _ema(stochMacd.map(v => isNaN(v) ? 0 : v), 3);
  const stcLine = kLine.map((k, i) => {
    if (i < stcPeriod - 1) return NaN;
    const sl = kLine.slice(i - stcPeriod + 1, i + 1).filter(x => !isNaN(x));
    const mn = Math.min(...sl), mx = Math.max(...sl);
    return mx === mn ? 0 : ((k - mn) / (mx - mn)) * 100;
  });
  return { stc: _ema(stcLine.map(v => isNaN(v) ? 0 : v), 3), raw: stcLine };
}

/** Connors RSI (3-component: RSI2 + streak RSI + ROC percentile) */
function _connorsRsi(closes: number[], rsiPeriod = 3, streakPeriod = 2, rocPeriod = 100): number[] {
  const rsi2 = _rsi(closes, rsiPeriod);
  // Streak calculation (consecutive up/down bars)
  const streak: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1])      streak.push(streak[i - 1] >= 0 ? streak[i - 1] + 1 :  1);
    else if (closes[i] < closes[i - 1]) streak.push(streak[i - 1] <= 0 ? streak[i - 1] - 1 : -1);
    else streak.push(0);
  }
  const streakRsi = _rsi(streak, streakPeriod);
  const roc1 = closes.map((c, i) => i < 1 ? 0 : c - closes[i - 1]);
  const pctRank = roc1.map((r, i) => {
    if (i < rocPeriod) return 50;
    const hist = roc1.slice(i - rocPeriod, i);
    const below = hist.filter(v => v < r).length;
    return (below / rocPeriod) * 100;
  });
  return closes.map((_, i) => {
    const r = isNaN(rsi2[i]) ? 50 : rsi2[i];
    const s = isNaN(streakRsi[i]) ? 50 : streakRsi[i];
    return (r + s + pctRank[i]) / 3;
  });
}

/** Relative Vigor Index (RVI) */
function _rvi(opens: number[], highs: number[], lows: number[], closes: number[], period = 10) {
  const numerator   = closes.map((c, i) => ((c - opens[i]) + 2*(closes[Math.max(0,i-1)]-opens[Math.max(0,i-1)]) + 2*(closes[Math.max(0,i-2)]-opens[Math.max(0,i-2)]) + (closes[Math.max(0,i-3)]-opens[Math.max(0,i-3)])) / 6);
  const denominator = highs.map((h, i) => ((h - lows[i]) + 2*(highs[Math.max(0,i-1)]-lows[Math.max(0,i-1)]) + 2*(highs[Math.max(0,i-2)]-lows[Math.max(0,i-2)]) + (highs[Math.max(0,i-3)]-lows[Math.max(0,i-3)])) / 6);
  const rviLine = closes.map((_, i) => {
    if (i < period - 1) return NaN;
    const n = numerator.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const d = denominator.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    return d !== 0 ? n / d : 0;
  });
  const signal = rviLine.map((v, i) => {
    if (i < 3 || isNaN(v)) return NaN;
    const p0 = rviLine[i], p1 = rviLine[i-1], p2 = rviLine[i-2], p3 = rviLine[i-3];
    if ([p0,p1,p2,p3].some(isNaN)) return NaN;
    return (p0 + 2*p1 + 2*p2 + p3) / 6;
  });
  return { rvi: rviLine, signal };
}

/** Stochastic Momentum Index (SMI) */
function _smi(highs: number[], lows: number[], closes: number[], period = 13, smoothK = 25, smoothD = 2) {
  const midHL = closes.map((c, i) => {
    if (i < period - 1) return { hh: NaN, ll: NaN };
    const hh = Math.max(...highs.slice(i - period + 1, i + 1));
    const ll = Math.min(...lows.slice(i - period + 1, i + 1));
    return { hh, ll };
  });
  const delta = midHL.map(({ hh, ll }, i) => isNaN(hh) ? NaN : closes[i] - (hh + ll) / 2);
  const hlRange = midHL.map(({ hh, ll }) => isNaN(hh) ? NaN : hh - ll);
  const d2 = _ema(_ema(delta.map(v => isNaN(v) ? 0 : v), smoothK), smoothD);
  const r2 = _ema(_ema(hlRange.map(v => isNaN(v) ? 0 : v), smoothK), smoothD);
  const smi = d2.map((d, i) => r2[i] !== 0 ? (d / (r2[i] / 2)) * 100 : 0);
  return { smi, signal: _ema(smi, smoothD) };
}

/** Chande Kroll Stop */
function _chandeKrollStop(highs: number[], lows: number[], closes: number[], p = 10, q = 9, x = 1) {
  const atrV = _atr(highs, lows, closes, p);
  const stopShortFirst = highs.map((h, i) => {
    if (i < p - 1) return NaN;
    return Math.max(...highs.slice(i - p + 1, i + 1)) - x * atrV[i];
  });
  const stopLongFirst = lows.map((l, i) => {
    if (i < p - 1) return NaN;
    return Math.min(...lows.slice(i - p + 1, i + 1)) + x * atrV[i];
  });
  const stopShort = stopShortFirst.map((v, i) => {
    if (i < q - 1 || isNaN(v)) return NaN;
    return Math.max(...stopShortFirst.slice(i - q + 1, i + 1).filter(x => !isNaN(x)));
  });
  const stopLong = stopLongFirst.map((v, i) => {
    if (i < q - 1 || isNaN(v)) return NaN;
    return Math.min(...stopLongFirst.slice(i - q + 1, i + 1).filter(x => !isNaN(x)));
  });
  return { stopShort, stopLong };
}

/** Hull RSI */
function _hullRsi(closes: number[], rsiPeriod = 14, hullPeriod = 14): number[] {
  return _hma(_rsi(closes, rsiPeriod).map(v => isNaN(v) ? 50 : v), hullPeriod);
}

/** Laguerre RSI (John Ehlers) */
function _laguerreRsi(closes: number[], gamma = 0.5): number[] {
  let l0 = 0, l1 = 0, l2 = 0, l3 = 0;
  return closes.map(c => {
    const p0 = (1 - gamma) * c + gamma * l0;
    const p1 = -gamma * p0 + l0 + gamma * l1;
    const p2 = -gamma * p1 + l1 + gamma * l2;
    const p3 = -gamma * p2 + l2 + gamma * l3;
    l0 = p0; l1 = p1; l2 = p2; l3 = p3;
    let cu = 0, cd = 0;
    if (p0 >= p1) cu += p0 - p1; else cd += p1 - p0;
    if (p1 >= p2) cu += p1 - p2; else cd += p2 - p1;
    if (p2 >= p3) cu += p2 - p3; else cd += p3 - p2;
    return cu + cd !== 0 ? cu / (cu + cd) * 100 : 50;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BILL WILLIAMS INDICATORS
// ─────────────────────────────────────────────────────────────────────────────

/** Alligator — three SMAs with offsets (jaw=13/8, teeth=8/5, lips=5/3) */
function _alligator(highs: number[], lows: number[], jawPeriod = 13, jawOffset = 8, teethPeriod = 8, teethOffset = 5, lipsPeriod = 5, lipsOffset = 3) {
  const median = highs.map((h, i) => (h + lows[i]) / 2);
  const jawRaw   = _smma(median, jawPeriod);
  const teethRaw = _smma(median, teethPeriod);
  const lipsRaw  = _smma(median, lipsPeriod);
  const shift = (arr: number[], offset: number) => {
    const r = new Array(offset).fill(NaN).concat(arr);
    return r.slice(0, arr.length);
  };
  return { jaw: shift(jawRaw, jawOffset), teeth: shift(teethRaw, teethOffset), lips: shift(lipsRaw, lipsOffset) };
}

/** Fractals (Bill Williams) — up and down fractal indices */
function _fractals(highs: number[], lows: number[], period = 2) {
  const upFractals: number[] = [], downFractals: number[] = [];
  for (let i = period; i < highs.length - period; i++) {
    const sl_h = highs.slice(i - period, i + period + 1);
    const sl_l = lows.slice(i - period, i + period + 1);
    if (highs[i] === Math.max(...sl_h)) upFractals.push(i);
    if (lows[i]  === Math.min(...sl_l)) downFractals.push(i);
  }
  return { upFractals, downFractals };
}

/** Awesome Oscillator (AO) — 5-period vs 34-period SMA of midpoints */
function _awesomeOscillator(highs: number[], lows: number[]): number[] {
  const median = highs.map((h, i) => (h + lows[i]) / 2);
  const sma5  = _sma(median, 5);
  const sma34 = _sma(median, 34);
  return sma5.map((v, i) => isNaN(v) || isNaN(sma34[i]) ? NaN : v - sma34[i]);
}

/** Accelerator Oscillator (AC) — AO minus 5-SMA of AO */
function _acceleratorOscillator(highs: number[], lows: number[]): number[] {
  const ao = _awesomeOscillator(highs, lows);
  const aoSma = _sma(ao.map(v => isNaN(v) ? 0 : v), 5);
  return ao.map((v, i) => isNaN(v) ? NaN : v - aoSma[i]);
}

/** Bill Williams Market Facilitation Index */
function _bwMfi(highs: number[], lows: number[], volumes: number[]): number[] {
  return highs.map((h, i) => volumes[i] > 0 ? (h - lows[i]) / volumes[i] : 0);
}

/** Gator Oscillator (above/below zero from Alligator diff) */
function _gator(highs: number[], lows: number[]) {
  const al = _alligator(highs, lows);
  const upper = al.jaw.map((j, i) => Math.abs(j - al.teeth[i]));
  const lower = al.teeth.map((t, i) => -Math.abs(t - al.lips[i]));
  return { upper, lower };
}

// ─────────────────────────────────────────────────────────────────────────────
// VOLUME ADVANCED
// ─────────────────────────────────────────────────────────────────────────────

/** Price Volume Trend (PVT) */
function _pvt(closes: number[], volumes: number[]): number[] {
  const result: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    result.push(result[i - 1] + (prev !== 0 ? ((closes[i] - prev) / prev) * volumes[i] : 0));
  }
  return result;
}

/** Ease of Movement (EMV) */
function _emv(highs: number[], lows: number[], volumes: number[], period = 14): number[] {
  const emv: number[] = [0];
  for (let i = 1; i < highs.length; i++) {
    const midMove = ((highs[i] + lows[i]) / 2) - ((highs[i-1] + lows[i-1]) / 2);
    const boxH    = volumes[i] / (highs[i] - lows[i] || 1);
    emv.push(midMove / boxH);
  }
  return _sma(emv, period);
}

/** Klinger Volume Oscillator (KVO) */
function _kvo(highs: number[], lows: number[], closes: number[], volumes: number[], fast = 34, slow = 55, sig = 13) {
  const trend = closes.map((c, i) => {
    if (i === 0) return 0;
    const hl = ((highs[i] + lows[i] + c) / 3) - ((highs[i-1] + lows[i-1] + closes[i-1]) / 3);
    return hl > 0 ? 1 : -1;
  });
  const vf = volumes.map((v, i) => v * trend[i]);
  const kvo = _ema(vf, fast).map((f, i) => f - _ema(vf, slow)[i]);
  return { kvo, signal: _ema(kvo, sig) };
}

/** Positive Volume Index (PVI) */
function _pvi(closes: number[], volumes: number[]): number[] {
  const result: number[] = [1000];
  for (let i = 1; i < closes.length; i++) {
    if (volumes[i] > volumes[i - 1]) {
      result.push(result[i-1] * (1 + (closes[i] - closes[i-1]) / (closes[i-1] || 1)));
    } else {
      result.push(result[i-1]);
    }
  }
  return result;
}

/** Negative Volume Index (NVI) */
function _nvi(closes: number[], volumes: number[]): number[] {
  const result: number[] = [1000];
  for (let i = 1; i < closes.length; i++) {
    if (volumes[i] < volumes[i - 1]) {
      result.push(result[i-1] * (1 + (closes[i] - closes[i-1]) / (closes[i-1] || 1)));
    } else {
      result.push(result[i-1]);
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONAL OSCILLATORS
// ─────────────────────────────────────────────────────────────────────────────

/** Balance of Power (BOP) */
function _bop(opens: number[], highs: number[], lows: number[], closes: number[], smooth = 14): number[] {
  const raw = closes.map((c, i) => {
    const hl = highs[i] - lows[i];
    return hl !== 0 ? (c - opens[i]) / hl : 0;
  });
  return _ema(raw, smooth);
}

/** Rex Oscillator */
function _rex(opens: number[], highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const tvs = closes.map((c, i) => 3 * c - (lows[i] + opens[i] + highs[i]));
  return _ema(tvs, period);
}

/** Linear Regression Channel */
function _linearRegChannel(closes: number[], period = 100, stdDevMult = 2) {
  const mid: number[] = [], upper: number[] = [], lower: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { mid.push(NaN); upper.push(NaN); lower.push(NaN); continue; }
    const y = closes.slice(i - period + 1, i + 1);
    const n = period;
    const x = Array.from({ length: n }, (_, j) => j);
    const sx = x.reduce((a, b) => a + b, 0);
    const sy = y.reduce((a, b) => a + b, 0);
    const sxy = x.reduce((a, b, j) => a + b * y[j], 0);
    const sx2 = x.reduce((a, b) => a + b * b, 0);
    const d = n * sx2 - sx * sx;
    const m2 = d !== 0 ? (n * sxy - sx * sy) / d : 0;
    const b2 = (sy - m2 * sx) / n;
    const regY = x.map(xi => m2 * xi + b2);
    const res = y.map((v, j) => v - regY[j]);
    const std = Math.sqrt(res.reduce((a, b) => a + b * b, 0) / n);
    const midVal = m2 * (n - 1) + b2;
    mid.push(midVal);
    upper.push(midVal + stdDevMult * std);
    lower.push(midVal - stdDevMult * std);
  }
  return { mid, upper, lower };
}

/** Heikin-Ashi transformation */
function _heikinAshi(opens: number[], highs: number[], lows: number[], closes: number[]) {
  const haO: number[] = [], haH: number[] = [], haL: number[] = [], haC: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const c = (opens[i] + highs[i] + lows[i] + closes[i]) / 4;
    const o = i === 0 ? (opens[i] + closes[i]) / 2 : (haO[i-1] + haC[i-1]) / 2;
    haC.push(c);
    haO.push(o);
    haH.push(Math.max(highs[i], o, c));
    haL.push(Math.min(lows[i], o, c));
  }
  return { open: haO, high: haH, low: haL, close: haC };
}

/** EMA Ribbon (multiple EMAs: 3,5,8,13,21,34,55,89) */
function _emaRibbon(closes: number[]) {
  const periods = [3, 5, 8, 13, 21, 34, 55, 89];
  const result: Record<string, number[]> = {};
  for (const p of periods) result[`ema${p}`] = _ema(closes, p);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function _generateSignal(closes: number[], highs: number[], lows: number[], volumes: number[]) {
  if (closes.length < 50) return { type: 'NEUTRAL' as const, confidence: 0 };
  const last   = closes.length - 1;
  const ema9   = _ema(closes, 9);
  const ema21  = _ema(closes, 21);
  const ema50  = _ema(closes, 50);
  const rsiV   = _rsi(closes, 14);
  const vwapV  = _vwap(highs, lows, closes, volumes);
  const macdV  = _macd(closes);
  const adxV   = _adx(highs, lows, closes, 14);
  const atrV   = _atr(highs, lows, closes, 14);
  const bbV    = _bollingerBands(closes, 20, 2);
  const stochV = _stochRsi(closes, 14, 14, 3, 3);

  const price  = closes[last];
  const e9 = ema9[last], e21 = ema21[last], e50 = ema50[last];
  const rsi = rsiV[last], vwap = vwapV[last];
  const macdH = macdV.histogram[last], macdPrev = macdV.histogram[last-1] || 0;
  const adx = adxV.adx[last];
  const atr  = atrV[last] || (price * 0.01);
  const stochK = stochV.k[last], stochD = stochV.d[last];

  let score = 50;
  // Trend
  if (e9 > e21 && e21 > e50) score += 18;
  else if (e9 < e21 && e21 < e50) score -= 18;
  else if (e9 > e21) score += 8;
  else if (e9 < e21) score -= 8;
  // RSI
  if (rsi < 30) score -= 12;
  else if (rsi > 70) score += 12;
  else if (rsi < 45) score -= 5;
  else if (rsi > 55) score += 5;
  // MACD
  if (macdH > 0 && macdH > macdPrev) score += 10;
  else if (macdH < 0 && macdH < macdPrev) score -= 10;
  // VWAP
  if (price > vwap) score += 8; else score -= 8;
  // Stoch RSI
  if (stochK > stochD && stochK < 80) score += 6;
  else if (stochK < stochD && stochK > 20) score -= 6;
  // BB Position
  if (bbV.percentB[last] > 80) score += 5;
  else if (bbV.percentB[last] < 20) score -= 5;
  // ADX strength
  const adxFactor = adx > 25 ? 1.3 : 0.8;
  score = 50 + (score - 50) * adxFactor;

  const type = score >= 62 ? 'BUY' : score <= 38 ? 'SELL' : 'NEUTRAL';
  const confidence = Math.min(95, Math.max(50, Math.abs(score - 50) * 2 + 45));
  const dir = type === 'BUY' ? 1 : -1;

  return {
    type,
    confidence: Math.round(confidence),
    strategy: 'Multi-Factor',
    entryPrice: price,
    tp1: price + dir * atr * 1.5,
    tp2: price + dir * atr * 2.5,
    tp3: price + dir * atr * 4.0,
    sl:  price - dir * atr * 1.0,
    rrRatio: 1.5,
    atrValue: atr,
    adx: Math.round(adx || 0),
    rsi: Math.round(rsi || 50),
    trend: e9 > e50 ? 'BULLISH' : 'BEARISH',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export function computeIndicators(
  _closes:  number[],
  _highs:   number[],
  _lows:    number[],
  _volumes: number[],
  _opens:   number[] = _closes.map((c, i) => i === 0 ? c : _closes[i - 1]),
) {
  return {
    // Moving Averages
    ema:   (period: number) => _ema(_closes, period),
    sma:   (period: number) => _sma(_closes, period),
    wma:   (period: number) => _wma(_closes, period),
    hma:   (period: number) => _hma(_closes, period),
    alma:  (period: number) => _alma(_closes, period),
    dema:  (period: number) => _dema(_closes, period),
    tema:  (period: number) => _tema(_closes, period),
    zlema: (period: number) => _zlema(_closes, period),
    vwma:  (period: number) => _vwma(_closes, _volumes, period),

    // Oscillators
    rsi:         (period: number) => _rsi(_closes, period),
    macd:        (fast = 12, slow = 26, sig = 9) => _macd(_closes, fast, slow, sig),
    ppo:         (fast = 12, slow = 26, sig = 9) => _ppo(_closes, fast, slow, sig),
    dpo:         (period = 20) => _dpo(_closes, period),
    cci:         (period = 20) => _cci(_highs, _lows, _closes, period),
    williamsR:   (period = 14) => _williamsR(_highs, _lows, _closes, period),
    stochastic:  (kP = 14, dP = 3, smooth = 3) => _stochastic(_highs, _lows, _closes, kP, dP, smooth),
    stochRsi:    (rsiP = 14, stochP = 14, kP = 3, dP = 3) => _stochRsi(_closes, rsiP, stochP, kP, dP),
    roc:         (period = 9) => _roc(_closes, period),
    momentum:    (period = 10) => _momentum(_closes, period),
    tsi:         (longP = 25, shortP = 13, sigP = 13) => _tsi(_closes, longP, shortP, sigP),
    cmo:         (period = 9) => _cmo(_closes, period),
    aroon:       (period = 25) => _aroon(_highs, _lows, period),
    vortex:      (period = 14) => _vortex(_highs, _lows, _closes, period),
    massIndex:   (emaPer = 9, sumPer = 25) => _massIndex(_highs, _lows, emaPer, sumPer),
    elderRay:    (period = 13) => _elderRay(_highs, _lows, _closes, period),
    forceIndex:  (period = 13) => _forceIndex(_closes, _volumes, period),
    ultimateOsc: (p1 = 7, p2 = 14, p3 = 28) => _ultimateOscillator(_highs, _lows, _closes, p1, p2, p3),
    coppock:     (wmaPer = 10, roc1 = 14, roc2 = 11) => _coppockCurve(_closes, wmaPer, roc1, roc2),
    trix:        (period = 15, sigPer = 9) => _trix(_closes, period, sigPer),
    fisher:      (period = 9) => _fisherTransform(_highs, _lows, period),

    // Trend/Volatility
    atr:             (period = 14) => _atr(_highs, _lows, _closes, period),
    bollingerBands:  (period = 20, mult = 2) => _bollingerBands(_closes, period, mult),
    keltner:         (emaPeriod = 20, atrPeriod = 10, mult = 1.5) => _keltner(_highs, _lows, _closes, emaPeriod, atrPeriod, mult),
    donchian:        (period = 20) => _donchian(_highs, _lows, period),
    chandelierExit:  (period = 22, mult = 3) => _chandelierExit(_highs, _lows, _closes, period, mult),
    parabolicSAR:    (step = 0.02, max = 0.2) => _parabolicSAR(_highs, _lows, step, max),
    supertrend:      (period = 10, mult = 3) => _supertrend(_highs, _lows, _closes, period, mult),
    ichimoku:        (t = 9, k = 26, sB = 52, d = 26) => _ichimoku(_highs, _lows, _closes, t, k, sB, d),
    adx:             (period = 14) => _adx(_highs, _lows, _closes, period),
    historicalVol:   (period = 20) => _historicalVolatility(_closes, period),
    zscore:          (period = 20) => _zscore(_closes, period),
    squeezeMomentum: (bbP = 20, bbM = 2, kcP = 20, kcM = 1.5) => _squeezeMomentum(_highs, _lows, _closes, _volumes, bbP, bbM, kcP, kcM),

    // Volume
    vwap:        () => _vwap(_highs, _lows, _closes, _volumes),
    vwapBands:   (mult = 1.5) => _vwapBands(_highs, _lows, _closes, _volumes, mult),
    mfi:         (period = 14) => _mfi(_highs, _lows, _closes, _volumes, period),
    obv:         () => _obv(_closes, _volumes),
    cmf:         (period = 20) => _cmf(_highs, _lows, _closes, _volumes, period),
    accumDist:   () => _accumDist(_highs, _lows, _closes, _volumes),
    pvo:         (fast = 12, slow = 26, sig = 9) => _pvo(_volumes, fast, slow, sig),

    // Support / Resistance
    supportResistance: (n?: number) => _supportResistance(_highs, _lows, _closes, n),
    pivotPoints:       () => _pivotPoints(_highs, _lows, _closes),

    // SMC
    detectSMC: () => _detectSMC(_closes, _highs, _lows),

    // Adaptive Moving Averages
    kama:      (period = 10) => _kama(_closes, period),
    mcginley:  (period = 14) => _mcginley(_closes, period),
    t3:        (period = 5)  => _t3(_closes, period),
    smma:      (period: number) => _smma(_closes, period),
    lsma:      (period = 25) => _lsma(_closes, period),
    vidya:     (period = 14) => _vidya(_closes, period),
    emaRibbon: () => _emaRibbon(_closes),

    // Advanced Oscillators
    waveTrend:   (n1 = 10, n2 = 21)     => _waveTrend(_highs, _lows, _closes, n1, n2),
    stc:         (p = 10, f = 23, s = 50) => _stc(_closes, p, f, s),
    connorsRsi:  (rsiP = 3, strP = 2, rocP = 100) => _connorsRsi(_closes, rsiP, strP, rocP),
    rvi:         (period = 10)           => _rvi(_opens, _highs, _lows, _closes, period),
    smi:         (period = 13)           => _smi(_highs, _lows, _closes, period),
    chandeKroll: (p = 10, q = 9)        => _chandeKrollStop(_highs, _lows, _closes, p, q),
    hullRsi:     (rsiP = 14, hmaP = 14) => _hullRsi(_closes, rsiP, hmaP),
    laguerreRsi: (gamma = 0.5)          => _laguerreRsi(_closes, gamma),

    // Bill Williams
    alligator:     () => _alligator(_highs, _lows),
    fractals:      () => _fractals(_highs, _lows),
    awesomeOsc:    () => _awesomeOscillator(_highs, _lows),
    acceleratorOsc:() => _acceleratorOscillator(_highs, _lows),
    bwMfi:         () => _bwMfi(_highs, _lows, _volumes),
    gator:         () => _gator(_highs, _lows),

    // Volume Advanced
    pvt:  () => _pvt(_closes, _volumes),
    emv:  (period = 14) => _emv(_highs, _lows, _volumes, period),
    kvo:  (fast = 34, slow = 55, sig = 13) => _kvo(_highs, _lows, _closes, _volumes, fast, slow, sig),
    pvi:  () => _pvi(_closes, _volumes),
    nvi:  () => _nvi(_closes, _volumes),

    // Bandarmologi — smart-money / big-player flow proxies (OHLCV-based)
    cvd:            () => _cvd(_opens, _highs, _lows, _closes, _volumes),
    bandarAD:       (period = 21) => _bandarAD(_highs, _lows, _closes, _volumes, period),
    bandarDetector: (look = 8)   => _bandarDetector(_opens, _highs, _lows, _closes, _volumes, look),
    volumeAnomaly:  (period = 20) => {
      const vsma = _sma(_volumes, period);
      return _volumes.map((v, i) => !isNaN(vsma[i]) && vsma[i] > 0 ? v / vsma[i] : 1);
    },

    // Additional
    bop:          (smooth = 14)  => _bop(_opens, _highs, _lows, _closes, smooth),
    rex:          (period = 14)  => _rex(_opens, _highs, _lows, _closes, period),
    linRegChannel:(period = 100) => _linearRegChannel(_closes, period),
    heikinAshi:   () => _heikinAshi(_opens, _highs, _lows, _closes),

    // Signal
    latestSignal: () => _generateSignal(_closes, _highs, _lows, _volumes),
  };
}

export type ComputedIndicators = ReturnType<typeof computeIndicators>;
