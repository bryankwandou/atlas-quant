/**
 * Atlas Quant · External Factor Service Aggregator
 *
 * Pulls in many independent feeds Renaissance-style:
 *   • Sentiment       — Fear & Greed (crypto + equity)
 *   • Volatility      — VIX, MOVE
 *   • Rates           — DXY, US10Y, US2Y, yield curve
 *   • Macro           — Gold, Oil, NatGas
 *   • Microstructure  — Funding, OI, L/S ratio
 *   • News & Politics — GDELT events tone
 *   • Weather         — Open-Meteo aggregate over commodity regions
 *   • On-Chain        — DEX flow, exchange flow, stable supply, gas, hashrate
 *   • Web sentiment   — search-trend proxy
 *
 * All services degrade gracefully (return nulls / safe defaults).
 */

export * from './weather';
export * from './gdelt';
export * from './macro-feeds';
export * from './onchain';
export * from './sentiment-web';
