/**
 * Atlas Quant · Logistic-ensemble trainer (SGD)
 * --------------------------------------------------------------------
 * Given historical OHLCV across many symbols, builds (features, label)
 * pairs where label = 1 if the price moves up ≥ 0.5×ATR over the next
 * N bars else 0. Then runs mini-batch SGD on a logistic model and
 * reports the new weights + training accuracy. Persisted to Supabase
 * `ml_model_weights` if the schema was migrated.
 */

import { extractFeatures, FEATURE_KEYS, type OHLCVBar } from '@/src/ai/featureExtractor';

export interface TrainOptions {
  symbols?: string[];
  timeframe?: string;
  horizon?: number;        // bars forward
  threshold?: number;      // ATR multiplier (label = 1 if return ≥ threshold×ATR)
  epochs?: number;
  learningRate?: number;
}

export interface TrainResult {
  modelName: string;
  version: number;
  trainedOn: number;       // samples
  accuracy: number;        // 0..1
  weights: Record<string, number>;
  bias: number;
  notes: string;
  durationMs: number;
}

function sigmoid(x: number): number { return 1 / (1 + Math.exp(-x)); }

export async function trainLogistic(opts: TrainOptions = {}): Promise<TrainResult> {
  const t0 = Date.now();
  const symbols   = opts.symbols ?? ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','AAPL','TSLA','SPY','QQQ','MSFT','NVDA','META'];
  const timeframe = opts.timeframe ?? '1h';
  const horizon   = opts.horizon   ?? 5;
  const thr       = opts.threshold ?? 0.5;
  const epochs    = opts.epochs    ?? 6;
  const lr        = opts.learningRate ?? 0.03;

  const { getMultiSource } = await import('@/src/services/market/multiSource');

  // 1. Collect (feature, label) pairs
  type Sample = { x: number[]; y: number };
  const samples: Sample[] = [];

  for (const sym of symbols) {
    let multi;
    try { multi = await getMultiSource(sym, timeframe, 500); }
    catch { continue; }
    const candles = multi.candles as OHLCVBar[];
    if (candles.length < 100) continue;
    for (let i = 60; i < candles.length - horizon - 1; i++) {
      const slice = candles.slice(0, i + 1);
      const f = extractFeatures(slice);
      if (!f) continue;
      // ATR approximation: average range over last 14 bars
      let atr = 0;
      for (let j = i - 13; j <= i; j++) atr += candles[j].high - candles[j].low;
      atr /= 14;
      const future = candles[i + horizon].close;
      const now = candles[i].close;
      const ret = (future - now);
      const label = ret >= thr * atr ? 1 : 0;
      const x = FEATURE_KEYS.map((k) => f[k]);
      samples.push({ x, y: label });
    }
  }

  if (samples.length < 50) {
    return {
      modelName: 'atlas-logistic',
      version: 1,
      trainedOn: samples.length,
      accuracy: 0,
      weights: Object.fromEntries(FEATURE_KEYS.map((k) => [k, 0])),
      bias: 0,
      notes: `Insufficient training samples (${samples.length}). Need at least 50.`,
      durationMs: Date.now() - t0,
    };
  }

  // 2. Shuffle deterministically
  for (let i = samples.length - 1; i > 0; i--) {
    const j = (i * 2654435761) % (i + 1);
    [samples[i], samples[j]] = [samples[j], samples[i]];
  }

  // 3. Train via SGD
  const dim = FEATURE_KEYS.length;
  const w = new Array(dim).fill(0);
  let b = 0;
  for (let ep = 0; ep < epochs; ep++) {
    for (const s of samples) {
      let z = b;
      for (let k = 0; k < dim; k++) z += w[k] * s.x[k];
      const p = sigmoid(z);
      const grad = p - s.y;
      for (let k = 0; k < dim; k++) w[k] -= lr * grad * s.x[k];
      b -= lr * grad;
    }
  }

  // 4. Score
  let correct = 0;
  for (const s of samples) {
    let z = b;
    for (let k = 0; k < dim; k++) z += w[k] * s.x[k];
    const p = sigmoid(z);
    const pred = p >= 0.5 ? 1 : 0;
    if (pred === s.y) correct++;
  }
  const accuracy = correct / samples.length;

  const weights: Record<string, number> = {};
  FEATURE_KEYS.forEach((k, idx) => { weights[k] = parseFloat(w[idx].toFixed(4)); });

  // 5. Persist to Supabase if available
  let persistNote = 'In-memory only — set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to persist.';
  try {
    const { supabaseAuthAdmin } = await import('@/src/services/supabase-auth');
    const insert = await supabaseAuthAdmin.from('ml_model_weights').insert({
      model_name: 'atlas-logistic',
      version: Math.floor(Date.now() / 1000),
      weights,
      bias: parseFloat(b.toFixed(4)),
      trained_on: samples.length,
      accuracy: parseFloat(accuracy.toFixed(4)),
      notes: `epochs=${epochs} lr=${lr} horizon=${horizon} thr=${thr}`,
    });
    if (!insert.error) persistNote = 'Persisted to ml_model_weights.';
    else persistNote = `Persistence skipped: ${insert.error.message}`;
  } catch (e: any) {
    persistNote = `Persistence skipped: ${e?.message ?? 'unknown'}`;
  }

  return {
    modelName: 'atlas-logistic',
    version: Math.floor(Date.now() / 1000),
    trainedOn: samples.length,
    accuracy: parseFloat(accuracy.toFixed(4)),
    weights,
    bias: parseFloat(b.toFixed(4)),
    notes: `${persistNote}  epochs=${epochs}  lr=${lr}  horizon=${horizon}  threshold=${thr}×ATR`,
    durationMs: Date.now() - t0,
  };
}
