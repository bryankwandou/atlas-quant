import Link from 'next/link';
import { STATIC_ASSET_UNIVERSE, countByAssetClass } from '@/data/assets';
import { indicatorStats } from '@/core/indicators/registry';

export default function LandingPage() {
  const assetStats = countByAssetClass();
  const indStats = indicatorStats();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--accent)] grid place-items-center text-white font-bold">A</div>
            <span className="font-bold tracking-tight">Atlas <span className="text-[var(--accent)]">Quant</span></span>
            <span className="aq-pill ml-2">v2.0</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="aq-btn-secondary aq-btn">Masuk</Link>
            <Link href="/register" className="aq-btn">Daftar</Link>
          </div>
        </div>
      </header>

      <section className="aq-grid-bg flex-1 px-6 py-24">
        <div className="max-w-5xl mx-auto text-center">
          <span className="aq-pill mb-4">Quantitative · SMC · Alt-Data · AI Fusion</span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
            Sinyal Kuantitatif Multi-Aset.<br />
            <span className="text-[var(--accent)]">Renaissance-Inspired.</span>
          </h1>
          <p className="text-[var(--text-secondary)] mt-6 max-w-2xl mx-auto text-lg">
            {STATIC_ASSET_UNIVERSE.length.toLocaleString()} aset, {indStats.total} indikator parametrizable,
            alt-data (cuaca, berita, sentimen) terintegrasi, AI multi-provider (DeepSeek + Groq + Together),
            dual-auth (wallet web3 atau email). Tanpa data dummy.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link href="/register" className="aq-btn px-8 py-3 text-base">Mulai Gratis</Link>
            <Link href="/chart" className="aq-btn aq-btn-secondary px-8 py-3 text-base">Buka Chart Demo</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-16">
            {[
              { label: 'Crypto Spot', value: (assetStats.crypto ?? 0).toString() },
              { label: 'DEX Tokens', value: (assetStats.dex ?? 0).toString() },
              { label: 'Stocks', value: (assetStats.stock ?? 0).toString() },
              { label: 'Forex / Index / Komoditas', value: ((assetStats.forex ?? 0) + (assetStats.index ?? 0) + (assetStats.commodity ?? 0) + (assetStats.etf ?? 0)).toString() },
              { label: 'Indikator', value: indStats.total.toString() },
              { label: 'SMC / Fibonacci', value: ((indStats.byCategory.smc ?? 0) + (indStats.byCategory.fibonacci ?? 0) + (indStats.byCategory.ict ?? 0)).toString() },
              { label: 'Alt-Data Faktor', value: '8+' },
              { label: 'AI Provider', value: '4' },
            ].map((s) => (
              <div key={s.label} className="aq-card p-4 text-left">
                <div className="text-3xl font-bold mono">{s.value}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border-subtle)] py-6 text-center text-xs text-[var(--text-muted)]">
        Atlas Quant v2.0 — Edukasi & simulasi. Bukan saran finansial. © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
