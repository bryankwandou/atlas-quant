import type { Metadata } from "next";
import "./globals.css";
import "./page-styles.css";
import ThemeInitializer from "@/components/ThemeInitializer";

export const metadata: Metadata = {
  title: "ATLAS·QUANT — Quantitative Trading Platform",
  description: "Professional quantitative trading signals powered by AI and deterministic quant engine. Real-time charts, signal alerts, and multi-timeframe analysis.",
  openGraph: {
    title: "ATLAS·QUANT — Quantitative Trading Platform",
    description: "Professional quantitative trading signals. Real-time charts, AI signals, multi-timeframe analysis.",
    siteName: "ATLAS·QUANT",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* Apply theme IMMEDIATELY before React hydrates — no flash of light */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('atlas-theme-v3')||'{}');var t=s.state&&s.state.theme;document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
      </head>
      <body>
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
