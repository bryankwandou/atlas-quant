import type { Metadata } from "next";
import "./globals.css";
import ThemeInitializer from "@/components/ThemeInitializer";

export const metadata: Metadata = {
  title: "Atlas-Quant — Quantitative Trading Platform",
  description: "Professional quantitative trading signals powered by AI and deterministic quant engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
