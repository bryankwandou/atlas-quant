'use client';
// ── ATLAS-QUANT Right Icon Rail ───────────────────────────────────────────────
// Matches DARURAT HUKUM reference: RightRail.jsx + rail-config.js

import {
  List, BarChart2, TrendingUp, Shield, BookOpen, Activity,
  Code2, Info, Keyboard, Bell, Calendar, Newspaper,
} from 'lucide-react';

// Inline SVG icons for exact DARURAT HUKUM match
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
  return (
    <div className="right-rail">

      {/* ── Market Panes ─────────────────── */}
      <button className="rr-btn" title="Watchlist">
        <List size={16} />
      </button>
      <button className="rr-btn" title="Data Window">
        <IconDataWindow size={16} />
      </button>
      <button className="rr-btn" title="Stock Screener">
        <IconScreener size={16} />
      </button>

      <div className="rr-divider" />

      {/* ── Flow / Events ────────────────── */}
      <button className="rr-btn" title="Economic Calendar" style={{ position: 'relative' }}>
        <Calendar size={16} />
        <span className="rr-dot" />
      </button>
      <button className="rr-btn" title="News Flow" style={{ position: 'relative' }}>
        <Newspaper size={16} />
        <span className="rr-badge">4</span>
      </button>
      <button className="rr-btn" title="Alerts" style={{ position: 'relative' }}>
        <Bell size={16} />
        <span className="rr-badge">2</span>
      </button>

      <div className="rr-divider" />

      {/* ── Analysis ─────────────────────── */}
      <button className="rr-btn" title="Signal Panel">
        <Activity size={16} />
      </button>
      <button className="rr-btn" title="Risk Panel">
        <Shield size={16} />
      </button>
      <button className="rr-btn" title="Trading Plan">
        <IconTarget size={16} />
      </button>

      <div className="rr-divider" />

      {/* ── Workspace ────────────────────── */}
      <button className="rr-btn" title="Object Tree">
        <IconObjectTree size={16} />
      </button>
      <button className="rr-btn" title="Trading Journal">
        <BookOpen size={16} />
      </button>
      <button className="rr-btn" title="Strategy Backtest">
        <TrendingUp size={16} />
      </button>
      <button className="rr-btn" title="Script Editor">
        <IconPineScript size={16} />
      </button>

      {/* ── Spacer ───────────────────────── */}
      <div className="rr-spacer" />

      {/* ── Bottom Utility ───────────────── */}
      <button className="rr-btn" title="Keyboard Shortcuts">
        <IconKeyboardSvg size={15} />
      </button>
      <button className="rr-btn" title="Help & Documentation">
        <Info size={16} />
      </button>
    </div>
  );
}
