export interface RiskConfig {
  maxDailyLossPct: number;   // default 5%
  maxTradesPerDay: number;   // default 10
  cooldownAfterLoss: number; // minutes, default 30
  maxConsecutiveLosses: number; // default 3
  killSwitchDrawdown: number; // portfolio %, default 10%
  riskPerTrade: number;      // % of capital, default 1%
}

export interface RiskState {
  dailyPnl: number;
  tradesCount: number;
  consecutiveLosses: number;
  lastLossTime: number | null;
  isKillSwitchActive: boolean;
}

export interface RiskDecision {
  allowed: boolean;
  reason: string;
  reasonId: string;
}

export function checkRisk(state: RiskState, config: RiskConfig, capitalBase: number): RiskDecision {
  if (state.isKillSwitchActive) {
    return { allowed: false, reason: 'Kill switch active', reasonId: 'Kill Switch Aktif' };
  }

  const dailyLossPct = (state.dailyPnl / capitalBase) * 100;
  if (dailyLossPct <= -config.maxDailyLossPct) {
    return { allowed: false, reason: `Daily loss limit hit (${dailyLossPct.toFixed(2)}%)`, reasonId: `Batas Rugi Harian Tercapai` };
  }

  if (state.tradesCount >= config.maxTradesPerDay) {
    return { allowed: false, reason: 'Max daily trades reached', reasonId: 'Maks Trade Harian Tercapai' };
  }

  if (state.consecutiveLosses >= config.maxConsecutiveLosses && state.lastLossTime) {
    const cooldownMs = config.cooldownAfterLoss * 60 * 1000;
    const elapsed = Date.now() - state.lastLossTime;
    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 60000);
      return { allowed: false, reason: `Cooldown active (${remaining}m left)`, reasonId: `Cooldown Aktif (${remaining}m)` };
    }
  }

  return { allowed: true, reason: 'Trade allowed', reasonId: 'Trade Diizinkan' };
}

export function calculatePositionSize(
  entryPrice: number, slPrice: number,
  capitalBase: number, riskPct: number
): number {
  const riskAmount = capitalBase * (riskPct / 100);
  const slDistance = Math.abs(entryPrice - slPrice);
  if (slDistance === 0) return 0;
  return riskAmount / slDistance;
}

export function kellyFraction(winRate: number, avgWin: number, avgLoss: number): number {
  if (avgLoss === 0) return 0;
  const b = avgWin / avgLoss;
  const p = winRate / 100;
  const q = 1 - p;
  const kelly = (b * p - q) / b;
  return Math.max(0, Math.min(kelly * 0.5, 0.1));
}
