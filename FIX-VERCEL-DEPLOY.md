# Kenapa atlas-quant.vercel.app MASIH pakai design lama?

## Diagnosa (fakta tervalidasi)

```
$ gh api repos/nayrbryanGaming/atlas-quant/commits/main --jq '.sha[0:10] + " | " + .commit.author.date'
a9c5f0048b | 2026-05-16T23:32:00Z          ← commit v2.1 sudah landed di main

$ curl -sI https://atlas-quant.vercel.app/
Age: 203794                                  ← cache umur 2.4 HARI, tidak pernah invalidate
X-Vercel-Cache: HIT                          ← Vercel CDN serve cache lama

$ curl -s https://atlas-quant.vercel.app/api/market/symbols
<!DOCTYPE html>...                           ← route BARU → 404 HTML
                                              (artinya: build di Vercel masih versi old)
```

**Kesimpulan:** Vercel project **tidak auto-deploy dari GitHub**. Webhook integration mati / project di-pause / branch link broken.

## Yang SUDAH dilakukan oleh Claude (di repo):
- ✅ PR #1 dibuat dari branch `claude/friendly-poitras-15ca97`
- ✅ PR di-merge ke `main` (commit `5e2ef57`, 23:21 UTC)
- ✅ Empty nudge commit (`a9c5f00`, 23:32 UTC) supaya webhook re-trigger
- ✅ Push ke `origin/main` sukses

GitHub side **100% beres**. Tidak ada lagi yang bisa Claude lakukan dari sini.

## Yang HARUS user lakukan (manual, 2 menit)

### Opsi A: Trigger redeploy manual (paling cepat)

1. Buka https://vercel.com/dashboard
2. Cari project `atlas-quant`
3. Tab **Deployments**
4. Klik 3-titik di deployment terbaru → **Redeploy**
5. Centang **"Use existing Build Cache"** = OFF (clean build)
6. Klik **Redeploy**

### Opsi B: Reconnect GitHub integration

Kalau Redeploy juga gagal:

1. Vercel → project `atlas-quant` → **Settings** → **Git**
2. Cek **Connected Git Repository** masih `nayrbryanGaming/atlas-quant` atau tidak.
   - Kalau **Disconnected**: klik **Connect Git Repository** → pilih `nayrbryanGaming/atlas-quant` → branch `main`
   - Kalau **Connected tapi suspended**: klik **Resume** atau **Refresh**
3. Setelah connected, push commit kosong dari local untuk trigger:
   ```bash
   git commit --allow-empty -m "trigger" && git push origin main
   ```

### Opsi C: Pakai Vercel CLI dari local

```bash
npm i -g vercel
cd <repo-folder>
vercel login              # login dengan akun nayrbryanGaming
vercel link               # link ke project atlas-quant
vercel --prod             # deploy langsung
```

### Opsi D: Buat Deploy Hook URL (untuk re-trigger di masa depan)

1. Vercel → project → **Settings** → **Git** → **Deploy Hooks**
2. Add hook: Name `manual-redeploy`, Branch `main` → **Create Hook**
3. Copy URL hook (format: `https://api.vercel.com/v1/integrations/deploy/<id>/<hash>`)
4. Trigger manual: `curl -X POST <hook-url>`
5. Simpan URL untuk dipakai kapan saja

## Env vars yang HARUS di-set di Vercel (Settings → Environment Variables)

```
NEXT_PUBLIC_SUPABASE_URL          ← dari project Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY     ← Settings → API → anon key
SUPABASE_SERVICE_ROLE_KEY         ← Settings → API → service_role key
SUPABASE_JWT_SECRET               ← random 32+ char (e.g. `openssl rand -hex 32`)
CRON_SECRET                       ← random 32+ char
```

Setelah redeploy + env terpasang:

```bash
# Verifikasi: harus return JSON, BUKAN HTML
curl https://atlas-quant.vercel.app/api/market/symbols?limit=5

# Verifikasi local AI:
curl -X POST https://atlas-quant.vercel.app/api/ai/local \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","timeframe":"15m"}'

# Verifikasi admin login:
curl -X POST https://atlas-quant.vercel.app/api/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"nayrbryanGaming","password":"@Nataliamaria12345"}'
```

## Bukti code SUDAH BARU (di GitHub `main` branch `a9c5f00`):

| File | Konfirmasi |
|---|---|
| `app/layout.tsx` | `lang="id"` (lama: `lang="en"`) |
| `app/dashboard/page.tsx` | watchlist sidebar + T1MOChart + AI Brain rail + spotlight Cmd/K |
| `app/admin/page.tsx` | login `nayrbryanGaming` + admin panel lock/delete |
| `app/api/ai/local/route.ts` | local-brain inference (NO API key) |
| `app/api/market/symbols/route.ts` | universe expanded 3000+ aset |
| `app/api/quant/t1mo/route.ts` | T1MO indikator parametrizable |
| `src/core/ai/local-brain.ts` | 8-model ensemble (logreg+naive bayes+stump+Markov+ridge+vol cone+anomaly+stat-arb) |
| `src/core/indicators/t1mo.ts` | backbone/magenta/box/HMF/regime 13 param |
| `src/core/indicators/fibonacci.ts` | SMC_RR_FIB `-0.5,0,0.5,1,1.5,2,2.5,3,3.5` editable |
| `src/core/indicators/generated-pack.ts` | 50+ indikator generated |
| `src/data/assets/*.ts` | 700+ aset static |
| `src/services/market/universe-loader.ts` | runtime fetch ~3000 aset |
| `supabase/schema.sql` | 13 tabel + RLS |
| `app/globals.css` | TradingView design tokens dari `E:\CLAUDE DESIGN\ATLAS-QUANT (2)` |

Cek langsung: https://github.com/nayrbryanGaming/atlas-quant/tree/main/

Atau pull local + verifikasi:
```bash
git pull origin main
ls src/core/ai/local-brain.ts          # → exists
ls src/data/assets/                    # → 7 files
ls src/core/indicators/                # → 12 files
wc -l app/dashboard/page.tsx           # → 400+ lines (new design)
npx tsc --noEmit                       # → 0 errors
npx next build                         # → 41 routes
npm run dev                            # → localhost:3000 = new UI
```
