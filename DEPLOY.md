# Atlas Quant v2.0 — Deploy Guide

## Local sanity check

```bash
npm install
cp .env.example .env.local        # isi SUPABASE & secret minimum
npx tsc --noEmit                  # TypeScript clean
npx next build                    # Next.js build clean
npm run dev                       # http://localhost:3000
```

Yang sudah PASSED di repo ini:
- `tsc --noEmit` → 0 errors
- `next build`   → 41 routes built (lihat ringkasan di bawah)

## Supabase setup

1. Buat project Supabase baru (free tier oke).
2. Buka SQL Editor → paste seluruh isi `supabase/schema.sql` → Run.
3. Salin `Project URL`, `anon key`, `service role key` ke `.env.local`.
4. (Opsional) tabel admin settings: jalankan SQL berikut bila ingin persist:
   ```sql
   create table if not exists app_admin_settings (
     id text primary key default 'global',
     registration_mode text,
     wallet_auto_approve boolean,
     email_auto_approve boolean,
     maintenance_mode boolean,
     announcement text,
     updated_at timestamptz default now()
   );
   ```

## Env vars wajib (Vercel project settings)

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=ganti-min-32-char-random
CRON_SECRET=ganti-min-32-char-random

# Opsional rotasi admin password (selain default @Nataliamaria12345)
ADMIN_MASTER_PASSWORD=ganti-password-baru
# atau pakai hash bcrypt:
# ADMIN_MASTER_PASSWORD_HASH=$2a$10$....

# Opsional — pasang minimal 1 supaya AI komentar pakai cloud
# (kalau semua kosong, sistem otomatis fallback ke local-brain offline)
DEEPSEEK_API_KEY=...
GROQ_API_KEY=...
TOGETHER_AI_KEY=...
OPENROUTER_API_KEY=...
```

## GitHub push

```bash
git add .
git commit -m "feat(v2.0): T1MO + Fib RR + local AI + admin + dual auth + 700+ assets"
git push origin <branch>
# atau buka PR ke main
gh pr create --title "Atlas Quant v2.0" --body "Lihat DEPLOY.md"
```

## Vercel deploy

1. Project → Settings → Environment Variables → tambah semua key di atas.
2. Trigger redeploy (push ke main / manual).
3. Verifikasi cron jalan: Vercel Dashboard → Crons → 2 entry aktif.
4. Verifikasi route:
   - `https://<your>.vercel.app/`           → landing (statistik aset+indikator)
   - `https://<your>.vercel.app/login`      → dual login
   - `https://<your>.vercel.app/register`   → dual register
   - `https://<your>.vercel.app/dashboard`  → UI baru T1MO + Fib RR + AI brain
   - `https://<your>.vercel.app/screener`   → screener universe
   - `https://<your>.vercel.app/admin`      → admin master (nayrbryanGaming / @Nataliamaria12345)

## Yang baru di v2.0

### Auth (separated dual-mode, no hardcoded hacked wallet)
- `/login` & `/register` punya tab Email+Password dan Wallet Web3.
- Wallet path pakai Phantom/Solflare `connect()` + `signMessage()` (offline, gas-free).
- Hardcoded master pubkey hack lama dihapus, route lama `/api/auth/login` jadi 410 → forward ke email path.

### Local AI Brain (no API required)
- `src/core/ai/local-brain.ts` — 8-model ensemble (logreg, naive bayes, decision stumps, Markov, ridge, vol cone, anomaly z, stat-arb residual).
- Mengembalikan: regime + confidence + bias + signal score + forecast return + commentary (id/en) + risks + rationale.
- POST `/api/ai/local` dengan candles atau symbol+timeframe.
- Tidak butuh API key apapun. Multi-provider cloud (`multi-provider.ts`) tetap tersedia sebagai opsional.

### T1MO indicator (parameterizable)
- `src/core/indicators/t1mo.ts` — Backbone (EMA50) / Magenta (EMA10) / Top-Btm Box / HMF momentum / Regime Strength histogram color-coded.
- Semua parameter editable via UI panel (`Dashboard → T1MO Params`).
- GET `/api/quant/t1mo?symbol=BTCUSDT&tf=15m&backbone=50&magenta=10` → series + AI inference.

### SMC Risk-Reward Fibonacci (custom, persis screenshot user)
- `src/core/indicators/fibonacci.ts` → `SMC_RR_FIB`.
- Default level: `-0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5` (persis screenshot).
- Edit semua level (lookback, direction, entry level, SL level, TP levels) via panel `Dashboard → Fib RR Params`.
- Output: RR otomatis per TP.
- POST `/api/quant/compute` dengan `{ code: 'SMC_RR_FIB', candles, params }`.

### Asset registry (700+ symbols, multi-asset)
- `src/data/assets/` — crypto-spot (180+), crypto-dex (50+), stocks US (130+), stocks global (60+, IDX/LSE/JP/HK/IN/DE), forex (35+), commodities (25+), indices (30+), ETF (50+), bonds.
- Smart fuzzy search: `src/services/search/smart-search.ts` (Fuse + custom scoring).
- API: GET `/api/market/symbols?q=btc&class=crypto&limit=100`.
- Spotlight palette di Dashboard (Cmd/Ctrl+K).

### Indicator framework (≥30 indikator parameterizable, mudah extend ke 200+)
- `src/domain/indicator.ts` — schema indikator (inputs typed: int/float/bool/enum/color/source/levels).
- `src/core/indicators/registry.ts` — central registry, lookup by code, executor.
- Families: trend, momentum, volatility, volume, mean-reversion (Z-score/Hurst/half-life), SMC (OB/FVG/BOS), fibonacci, T1MO, renaissance (cone, anomaly).
- Tiap indikator render form UI otomatis lewat `IndicatorParamPanel`.

### Admin Console
- `/admin` — login hardcoded `nayrbryanGaming / @Nataliamaria12345` (rotatable).
- Wewenang: lihat user, lock/unlock, hapus, set registration mode (free / pending-approval / closed).
- DILARANG: ganti password user, login-as-user, jadi admin baru (anti-hijack).
- API: `/api/admin/login`, `/api/admin/users`, `/api/admin/users/[id]` (PATCH lock/unlock, DELETE), `/api/admin/settings`, `/api/admin/stats`.

### New Dashboard `/dashboard`
- Watchlist kiri (dropdown class: crypto / stock / forex / dex / index / commodity).
- Center chart pakai `T1MOChart` (backbone, magenta, box, HMF, regime histogram, fib lines).
- Right rail: Local Brain panel (regime, confidence, signal score, commentary, risks) + SMC Fib RR + Key Levels.
- TIDAK ada lagi "T1MO_SCIENTIFIC_V1.0.15", "GEOMETRY_LABS", AKELATRADER watermark, NaN values, atau synthetic Aegis fallback hardcoded.

## Routes terverifikasi (build output)

```
○ /                     ✓ static
○ /admin                ✓ static
○ /chart                ✓ static (redirects to /dashboard)
○ /dashboard            ✓ static
○ /login                ✓ static
○ /register             ✓ static
○ /screener             ✓ static
○ /pending-approval     ✓ static

ƒ /api/admin/login      ƒ /api/admin/settings   ƒ /api/admin/stats
ƒ /api/admin/users      ƒ /api/admin/users/[id]
ƒ /api/ai/local
ƒ /api/altdata
ƒ /api/auth/email/login ƒ /api/auth/email/register
ƒ /api/auth/wallet/challenge ƒ /api/auth/wallet/verify
ƒ /api/auth/me
ƒ /api/cron/market-refresh ƒ /api/cron/market-scan
ƒ /api/market/asset/[symbol] ƒ /api/market/ohlcv ƒ /api/market/search ƒ /api/market/summary
ƒ /api/market/symbols
ƒ /api/quant/compute ƒ /api/quant/indicators ƒ /api/quant/signals ƒ /api/quant/t1mo
ƒ /api/pilot/*  (legacy)
```

## Test cepat admin
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"nayrbryanGaming","password":"@Nataliamaria12345"}'
```

## Test local AI
```bash
curl -X POST http://localhost:3000/api/ai/local \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","timeframe":"15m"}'
```

## Test T1MO
```bash
curl 'http://localhost:3000/api/quant/t1mo?symbol=BTCUSDT&tf=15m&backbone=50&magenta=10'
```

## Test asset universe
```bash
curl 'http://localhost:3000/api/market/symbols?q=btc&class=crypto&limit=20'
```
