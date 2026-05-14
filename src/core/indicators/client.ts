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

function _detectSMC(closes: number[], highs: number[], lows: number[]) {
  const orderBlocks: Array<{ type: 'bullish' | 'bearish'; high: number; low: number; idx: number }> = [];
  const fvg: Array<{ type: 'bullish' | 'bearish'; top: number; bottom: number; idx: number }> = [];
  const bos: Array<{ type: 'bullish' | 'bearish'; level: number; idx: number }> = [];

  for (let i = 3; i < closes.length - 1; i++) {
    const isBull = closes[i] > closes[i-1] && closes[i-1] < closes[i-2] && closes[i+1] > closes[i];
    const isBear = closes[i] < closes[i-1] && closes[i-1] > closes[i-2] && closes[i+1] < closes[i];
    if (isBull) orderBlocks.push({ type: 'bullish', high: highs[i-1], low: lows[i-1], idx: i-1 });
    if (isBear) orderBlocks.push({ type: 'bearish', high: highs[i-1], low: lows[i-1], idx: i-1 });
    // Fair Value Gaps
    if (i >= 2) {
      if (lows[i] > highs[i-2])  fvg.push({ type: 'bullish', top: lows[i], bottom: highs[i-2], idx: i });
      if (highs[i] < lows[i-2])  fvg.push({ type: 'bearish', top: lows[i-2], bottom: highs[i], idx: i });
    }
  }
  // Break of Structure
  for (let i = 5; i < closes.length; i++) {
    const prevHigh = Math.max(...highs.slice(i-5, i));
    const prevLow  = Math.min(...lows.slice(i-5, i));
    if (highs[i] > prevHigh) bos.push({ type: 'bullish', level: prevHigh, idx: i });
    if (lows[i]  < prevLow)  bos.push({ type: 'bearish', level: prevLow,  idx: i });
  }
  return { orderBlocks: orderBlocks.slice(-10), fvg: fvg.slice(-8), bos: bos.slice(-6) };
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

    // Signal
    latestSignal: () => _generateSignal(_closes, _highs, _lows, _volumes),
  };
}

export type ComputedIndicators = ReturnType<typeof computeIndicators>;
