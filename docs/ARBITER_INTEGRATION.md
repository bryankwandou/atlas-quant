# ARBITER BOT ⇄ ATLAS-QUANT — Integrasi Auto-Trading

## Arsitektur

```
ATLAS-QUANT (Vercel)                          ARBITER BOT (server/VPS Anda)
┌──────────────────────────┐   JSON signal   ┌───────────────────────────┐
│ /api/arbiter/signal      │ ──────────────▶ │ 1. terima sinyal          │
│  T1MO engine + ATR plan  │  (poll/webhook) │ 2. risk check (max pos,   │
│  BUY/SELL/HOLD + SL/TP   │                 │    dd limit, cooldown)    │
└──────────────────────────┘                 │ 3. eksekusi via ccxt      │
                                             │    (API key exchange)     │
                                             └───────────────────────────┘
```

ATLAS = otak sinyal. Arbiter = tangan eksekusi. Kunci API exchange TIDAK PERNAH
disimpan di ATLAS/Vercel — hanya di bot Anda. Ini pemisahan keamanan yang benar.

## Endpoint

```
GET https://atlas-quant.vercel.app/api/arbiter/signal?symbol=BNBUSDT&tf=1h
GET .../api/arbiter/signal?symbols=BTCUSDT,ETHUSDT,SOLUSDT&tf=15m     ← batch scan
GET .../api/arbiter/signal?symbol=BTCUSDT&tf=1h&push=1                ← push ke webhook bot
```

Contoh respons:
```json
{
  "source": "ATLAS-QUANT/arbiter-bridge",
  "signals": [{
    "symbol": "BNBUSDT", "timeframe": "1h", "price": 586.22,
    "bullProb": 63.4, "action": "BUY", "badge": "Green Bull", "confidence": 0.63,
    "plan": { "entry": 586.22, "stopLoss": 574.1, "takeProfit": 606.4, "riskReward": 1.67, "atr14": 8.08 }
  }]
}
```

## Keamanan
- Set env `ARBITER_API_KEY` di Vercel → endpoint menolak request tanpa header
  `x-arbiter-key: <key>`.
- Set env `ARBITER_WEBHOOK_URL` = URL webhook bot Anda → mode push aktif
  (`push=1`). Panggil dari Vercel Cron tiap N menit untuk mode full-auto.

## Loop auto-trading minimal di sisi bot (Node + ccxt, GRATIS)

```js
import ccxt from 'ccxt';
const ex = new ccxt.binance({ apiKey: process.env.BINANCE_KEY, secret: process.env.BINANCE_SECRET });
// ex.setSandboxMode(true);  // ← Binance TESTNET dulu! uang mainan, API sama persis

setInterval(async () => {
  const r = await fetch('https://atlas-quant.vercel.app/api/arbiter/signal?symbol=BNBUSDT&tf=1h',
    { headers: { 'x-arbiter-key': process.env.ARBITER_KEY } });
  const { signals: [s] } = await r.json();
  if (s.action === 'BUY' && s.confidence >= 0.6) {
    await ex.createOrder(s.symbol.replace('USDT','/USDT'), 'market', 'buy', qty);
    await ex.createOrder(..., 'stop_loss_limit', 'sell', qty, s.plan.stopLoss);   // SL
    await ex.createOrder(..., 'take_profit_limit', 'sell', qty, s.plan.takeProfit); // TP
  }
}, 60_000);
```

## Soal "connect broker seperti TradingView" — bayar atau gratis?

**Fakta TradingView:** fitur *broker connect* (panel Trading) TIDAK berbayar dari
sisi TradingView — gratis di plan Basic sekalipun. Yang dibutuhkan hanyalah akun
broker yang didukung. Yang BERBAYAR di TradingView adalah **webhook alerts**
(minimal plan Essential ~$14/bln) — itulah jalur yang biasa dipakai orang untuk
auto-trading dari sinyal.

**Alternatif 100% gratis (yang barusan dibangun di proyek ini):**
1. **ccxt + API key exchange** — Binance/OKX/Bybit dll memberi API trading GRATIS.
   ATLAS endpoint + ccxt di bot = setara "broker connect" tanpa biaya apa pun.
2. **Binance Testnet / Bybit Demo** — latihan full-auto tanpa risiko uang nyata.
3. **Webhook push gratis** — TradingView memungut bayaran untuk webhook; ATLAS
   memberikannya gratis lewat `push=1` + Vercel Cron.

Rekomendasi urutan: testnet → uang kecil → produksi, selalu dengan risk limit di
sisi bot (max % equity per posisi, daily drawdown stop, cooldown antar-order).
