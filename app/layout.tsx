import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas-Quant — Quantitative Trading Platform",
  description: "Professional quantitative trading signals powered by AI and deterministic quant engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
