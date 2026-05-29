'use client';
// ── ATLAS-QUANT Right Icon Rail ───────────────────────────────────────────────
// Matches DARURAT HUKUM reference: RightRail.jsx + rail-config.js

import { useRouter, usePathname } from 'next/navigation';
import {
  List, TrendingUp, Shield, BookOpen, Activity,
  Info, Bell, Calendar, Newspaper,
} from 'lucide-react';

const IconScreener = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
    <path d="M7 8h2M11 8h2M15 8h2M7 12h2M11 12h2M15 12h2"/>
  </svg>
);
const IconDataWindow = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18M9 21V9"/>
  </svg>
);
const IconObjectTree = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/>
    <path d="M5 8v8M5 16h8"/><line x1="5" y1="6" x2="17" y2="6"/>
  </svg>
);
const IconPineScript = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IconTarget = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);
const IconKeyboardSvg = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="6" y1="9" x2="6.01" y2="9"/><line x1="10" y1="9" x2="10.01" y2="9"/>
    <line x1="14" y1="9" x2="14.01" y2="9"/><line x1="18" y1="9" x2="18.01" y2="9"/>
    <line x1="8" y1="13" x2="8.01" y2="13"/><line x1="12" y1="13" x2="16" y2="13"/>
    <line x1="6" y1="13" x2="6.01" y2="13"/>
  </svg>
);

export default function RightRail() {
  const router = useRouter();
  const pathname = usePathname();

  const nav = (href: string) => router.push(href);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href);

  const setRightTab = (tab: string) => {
    document.dispatchEvent(new CustomEvent('atlas:set-right-tab', { detail: tab }));
  };

  return (
    <div className="right-rail">

      {/* ── Market Panes ─────────────────── */}
      <button type="button" className={`rr-btn ${isActive('/chart') ? 'active' : ''}`} title="Watchlist" onClick={() => setRightTab('watchlist')}>
        <List size={16} />
      </button>
      <button type="button" className="rr-btn" title="Data Window" onClick={() => setRightTab('data')}>
        <IconDataWindow size={16} />
      </button>
      <button type="button" className={`rr-btn ${isActive('/screener') ? 'active' : ''}`} title="Market Screener" onClick={() => nav('/screener')}>
        <IconScreener size={16} />
      </button>

      <div className="rr-divider" />

      {/* ── Flow / Events ────────────────── */}
      <button type="button" className="rr-btn" title="Economic Calendar" onClick={() => setRightTab('calendar')}>
        <Calendar size={16} />
        <span className="rr-dot" />
      </button>
      <button type="button" className="rr-btn" title="News Flow" onClick={() => setRightTab('news')}>
        <Newspaper size={16} />
        <span className="rr-badge">4</span>
      </button>
      <button type="button" className="rr-btn" title="Alerts" onClick={() => setRightTab('alerts')}>
        <Bell size={16} />
        <span className="rr-badge">2</span>
      </button>

      <div className="rr-divider" />

      {/* ── Analysis ─────────────────────── */}
      <button type="button" className={`rr-btn ${isActive('/signals') ? 'active' : ''}`} title="Signal Panel" onClick={() => nav('/signals')}>
        <Activity size={16} />
      </button>
      <button type="button" className="rr-btn" title="Risk Panel" onClick={() => setRightTab('risk')}>
        <Shield size={16} />
      </button>
      <button type="button" className="rr-btn" title="Trading Plan" onClick={() => setRightTab('plan')}>
        <IconTarget size={16} />
      </button>

      <div className="rr-divider" />

      {/* ── Workspace ────────────────────── */}
      <button type="button" className="rr-btn" title="Object Tree" onClick={() => setRightTab('objects')}>
        <IconObjectTree size={16} />
      </button>
      <button type="button" className={`rr-btn ${isActive('/journal') ? 'active' : ''}`} title="Trading Journal" onClick={() => nav('/journal')}>
        <BookOpen size={16} />
      </button>
      <button type="button" className={`rr-btn ${isActive('/backtest') ? 'active' : ''}`} title="Strategy Backtest" onClick={() => nav('/backtest')}>
        <TrendingUp size={16} />
      </button>
      <button type="button" className="rr-btn" title="Script Editor" onClick={() => setRightTab('pine')}>
        <IconPineScript size={16} />
      </button>

      <div className="rr-spacer" />

      {/* ── Bottom Utility ───────────────── */}
      <button type="button" className="rr-btn" title="Keyboard Shortcuts" onClick={() => setRightTab('keyboard')}>
        <IconKeyboardSvg size={15} />
      </button>
      <button type="button" className="rr-btn" title="Help & Documentation" onClick={() => setRightTab('help')}>
        <Info size={16} />
      </button>
    </div>
  );
}
