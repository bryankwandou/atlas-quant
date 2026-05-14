import { ema } from './trend';

export function kama(values: number[], period = 10, fastPeriod = 2, slowPeriod = 30): number[] {
  const fastSC = 2 / (fastPeriod + 1);
  const slowSC = 2 / (slowPeriod + 1);
  const result: number[] = Array(period).fill(NaN);
  result[period - 1] = values[period - 1];

  for (let i = period; i < values.length; i++) {
    const direction = Math.abs(values[i] - values[i - period]);
    let volatility = 0;
    for (let j = i - period + 1; j <= i; j++) {
      volatility += Math.abs(values[j] - values[j - 1]);
    }
    const er = volatility > 0 ? direction / volatility : 0;
    const sc = (er * (fastSC - slowSC) + slowSC) ** 2;
    const prev = result[i - 1];
    result.push(prev + sc * (values[i] - prev));
  }
  return result;
}

export { ema as tema } from './trend';
