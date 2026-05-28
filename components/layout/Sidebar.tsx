'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useChartStore } from '@/store/chartStore';
import { useLanguage } from '@/hooks/useLanguage';
import FibRRModal from '@/components/FibRRModal';
import {
  BarChart2, Zap, BookOpen, FlaskConical, Search, Settings,
  MousePointer, Crosshair, Minus, ArrowUpRight, MoveHorizontal, MoveVertical,
  GitFork, Triangle, Square, Circle, Pen, Highlighter, Eraser,
  TrendingUp, TrendingDown, Target, Type, FileText, Tag, Magnet,
  LayoutDashboard, ShieldAlert, Activity, Bot,
} from 'lucide-react';

// Drawing tool groups
const DRAW_GROUPS = [
  {
    tools: [
      { id: 'cursor',    icon: MousePointer, tip: 'Cursor (V)' },
      { id: 'crosshair', icon: Crosshair,    tip: 'Crosshair' },
    ]
  },
  {
    tools: [
      { id: 'trendline', icon: TrendingUp,     tip: 'Trend Line' },
      { id: 'ray',       icon: ArrowUpRight,   tip: 'Ray' },
      { id: 'hline',     icon: MoveHorizontal, tip: 'Horizontal Line' },
      { id: 'vline',     icon: MoveVertical,   tip: 'Vertical Line' },
      { id: 'channel',   icon: GitFork,        tip: 'Parallel Channel' },
    ]
  },
  {
    tools: [
      { id: 'fib',       icon: Activity,       tip: 'Fibonacci Retracement' },
      { id: 'pitchfork', icon: GitFork,        tip: 'Pitchfork' },
    ]
  },
  {
    tools: [
      { id: 'rectangle', icon: Square,         tip: 'Rectangle' },
      { id: 'triangle',  icon: Triangle,       tip: 'Triangle' },
      { id: 'ellipse',   icon: Circle,         tip: 'Ellipse' },
    ]
  },
  {
    tools: [
      { id: 'long',      icon: TrendingUp,     tip: 'Long Position' },
      { id: 'short',     icon: TrendingDown,   tip: 'Short Position' },
      { id: 'rr',        icon: Target,         tip: 'Risk/Reward' },
    ]
  },
  {
    tools: [
      { id: 'text',        icon: Type,          tip: 'Text' },
      { id: 'anchornote',  icon: FileText,      tip: 'Note' },
      { id: 'pricelabel',  icon: Tag,           tip: 'Price Label' },
    ]
  },
  {
    tools: [
      { id: 'brush',       icon: Pen,           tip: 'Brush' },
      { id: 'highlighter', icon: Highlighter,   tip: 'Highlighter' },
      { id: 'eraser',      icon: Eraser,        tip: 'Eraser' },
      { id: 'magnet',      icon: Magnet,        tip: 'Magnet Snap' },
    ]
  },
];

const NAV_ITEMS = [
  { href: '/chart',     icon: LayoutDashboard, key: 'dashboard' },
  { href: '/chart',     icon: BarChart2,       key: 'chart'     },
  { href: '/signals',   icon: Zap,             key: 'signals'   },
  { href: '/journal',   icon: BookOpen,        key: 'journal'   },
  { href: '/backtest',  icon: FlaskConical,    key: 'backtest'  },
  { href: '/screener',  icon: Search,          key: 'screener'  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { drawingTool, setDrawingTool } = useChartStore();
  const { lang } = useLanguage();
  const [fibOpen, setFibOpen] = useState(false);

  const navLabels: Record<string, string> = {
    dashboard: lang === 'id' ? 'Beranda'   : 'Dashboard',
    chart:     lang === 'id' ? 'Grafik'    : 'Chart',
    signals:   lang === 'id' ? 'Sinyal'    : 'Signals',
    journal:   lang === 'id' ? 'Jurnal'    : 'Journal',
    backtest:  lang === 'id' ? 'Backtest'  : 'Backtest',
    screener:  lang === 'id' ? 'Screener'  : 'Screener',
  };

  return (
    <nav className="left-sidebar">
      {/* ── Navigation ────────────────────────────────────── */}
      <div className="sb-nav">
        {NAV_ITEMS.map(({ href, icon: Icon, key }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`sb-nav-btn ${isActive ? 'active' : ''}`}
              title={navLabels[key]}
            >
              <Icon size={16} />
            </Link>
          );
        })}
      </div>

      <div className="sb-div" />

      {/* ── Drawing Tools ─────────────────────────────────── */}
      <div className="sb-tools">
        {DRAW_GROUPS.map((group, gi) => (
          <div key={`group-${gi}`} className="sb-tool-group">
            {gi > 0 && <div className="sb-tool-sep" />}
            {group.tools.map(({ id, icon: Icon, tip }) => (
              <button
                key={id}
                type="button"
                className={`sb-tool-btn ${drawingTool === id ? 'active' : ''}`}
                title={tip}
                onDoubleClick={() => { if (id === 'fib' || id === 'rr') setFibOpen(true); }}
                onClick={() => {
                  setDrawingTool(id);
                  if (id === 'fib' || id === 'rr') setFibOpen(true);
                }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Fib R:R configuration modal */}
      <FibRRModal open={fibOpen} onClose={() => setFibOpen(false)} />

      {/* ── Bottom Controls ───────────────────────────────── */}
      <div className="sb-div" />
      <div className="sb-bottom">
        <Link
          href="/settings"
          className="sb-nav-btn"
          title={lang === 'id' ? 'Pengaturan' : 'Settings'}
        >
          <Settings size={15} />
        </Link>
        <button
          type="button"
          className="sb-nav-btn"
          title="AI Assistant"
          onClick={() => {
            document.dispatchEvent(new CustomEvent('atlas:set-right-tab', { detail: 'ai' }));
          }}
        >
          <Bot size={15} />
        </button>
      </div>
    </nav>
  );
}
