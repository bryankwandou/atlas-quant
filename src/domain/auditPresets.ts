/**
 * Preset & konstanta audit T1MO — dipakai bersama oleh konsol superadmin (/dashboard)
 * dan halaman audit. Satu sumber kebenaran supaya angka tidak pernah divergen.
 */
export const AUDIT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'] as const;
export const AUDIT_TFS = ['1h', '4h'] as const;
export const AUDIT_SPLIT = 0.7;

export type PresetKey = 'standard' | 'institusi';

export const AUDIT_PRESETS: Record<PresetKey, { label: string; qs: string; note: string }> = {
  standard: {
    label: 'Standar (RR 1.67)',
    qs: 'sl=1.5&tp=2.5&dir=both',
    note: 'Rencana ATR default Arbiter (SL 1.5×ATR / TP 2.5×ATR). Breakeven WR 37.5% — target menang jarang tapi besar.',
  },
  institusi: {
    label: 'Institusi (OOS-validated)',
    qs: 'trend=1&sl=2&tp=1&dir=both',
    note: 'Regime EMA50 + RR 2:1 (SL 2×ATR / TP 1×ATR). Breakeven WR 66.7%. Angka diverifikasi pada TEST set (out-of-sample), konsisten dengan train.',
  },
};

export const VERDICT_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  EDGE_HOLDS_OOS:    { bg: 'rgba(8,153,129,0.15)',  fg: '#089981', label: 'EDGE ✓ OOS' },
  OVERFIT:           { bg: 'rgba(242,54,69,0.15)',  fg: '#f23645', label: 'OVERFIT' },
  TEST_LUCK:         { bg: 'rgba(247,166,0,0.15)',  fg: '#f7a600', label: 'TEST HOKI' },
  NO_EDGE:           { bg: 'rgba(120,123,134,0.15)',fg: '#787b86', label: 'NO EDGE' },
  INSUFFICIENT_TEST: { bg: 'rgba(247,166,0,0.15)',  fg: '#f7a600', label: 'SAMPEL KECIL' },
  IN_SAMPLE_ONLY:    { bg: 'rgba(120,123,134,0.15)',fg: '#787b86', label: 'IN-SAMPLE' },
};

export type AuditMetrics = { totalTrades: number; wins: number; losses: number; winRatePct: number; profitFactor: number; netR: number; maxDrawdownR: number; expectancyR: number };
