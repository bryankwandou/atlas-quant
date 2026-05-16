import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Atlas Quant — Quantitative Trading Intelligence',
  description:
    'Atlas Quant: Renaissance-inspired multi-factor signal engine for crypto, stocks, forex, and DEX. Dual-auth (wallet + email), 200+ parametrizable indicators, alt-data fusion, deterministic-first.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://atlas-quant.vercel.app'),
  openGraph: {
    title: 'Atlas Quant',
    description: 'Multi-asset quant signal & SMC analytics platform.',
    type: 'website',
  },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('atlas-theme') || 'dark';
                document.documentElement.setAttribute('data-theme', t);
              } catch {}
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
