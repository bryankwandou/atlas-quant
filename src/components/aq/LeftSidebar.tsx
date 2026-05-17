'use client';
/**
 * Faithful port of LeftSidebar.jsx — navigation (chart/signals/journal/...)
 * + drawing tools list (43 tools split by separator).
 */
import Link from 'next/link';

const NAV_ITEMS = [
  { id: 'chart', icon: '📈', tip: 'Chart', href: '/dashboard' },
  { id: 'signals', icon: '⚡', tip: 'Signals', href: '/dashboard' },
  { id: 'journal', icon: '📓', tip: 'Journal', href: '/dashboard' },
  { id: 'backtest', icon: '🧪', tip: 'Backtest', href: '/dashboard' },
  { id: 'screener', icon: '🗂', tip: 'Screener', href: '/screener' },
  { id: 'watchlist', icon: '👁', tip: 'Watchlist', href: '/dashboard' },
  { id: 'risk', icon: '🛡', tip: 'Risk', href: '/dashboard' },
];

type Tool = { id: string; icon: string; tip: string } | null;
const DRAWING_TOOLS: Tool[] = [
  { id: 'cursor', icon: '↖', tip: 'Cursor' },
  { id: 'crosshair', icon: '✛', tip: 'Crosshair' },
  null,
  { id: 'trendline', icon: '╱', tip: 'Trend Line' },
  { id: 'ray', icon: '→', tip: 'Ray' },
  { id: 'extline', icon: '↔', tip: 'Extended Line' },
  { id: 'hline', icon: '─', tip: 'Horizontal Line' },
  { id: 'vline', icon: '│', tip: 'Vertical Line' },
  { id: 'channel', icon: '∥', tip: 'Parallel Channel' },
  null,
  { id: 'fib', icon: 'φ', tip: 'Fibonacci Retracement' },
  { id: 'fibext', icon: 'φ+', tip: 'Fibonacci Extension' },
  { id: 'pitchfork', icon: 'Ψ', tip: 'Pitchfork' },
  { id: 'gann', icon: '△', tip: 'Gann Fan' },
  null,
  { id: 'rectangle', icon: '▭', tip: 'Rectangle' },
  { id: 'triangle', icon: '△', tip: 'Triangle' },
  { id: 'ellipse', icon: '○', tip: 'Ellipse' },
  { id: 'arc', icon: '⌒', tip: 'Arc' },
  null,
  { id: 'long', icon: '▲', tip: 'Long Position' },
  { id: 'short', icon: '▼', tip: 'Short Position' },
  { id: 'rr', icon: 'RR', tip: 'Risk/Reward' },
  { id: 'forecast', icon: '⇢', tip: 'Forecast' },
  null,
  { id: 'text', icon: 'T', tip: 'Text' },
  { id: 'anchornote', icon: '📌', tip: 'Note' },
  { id: 'pricelabel', icon: '$', tip: 'Price Label' },
  null,
  { id: 'brush', icon: '✎', tip: 'Brush' },
  { id: 'highlighter', icon: '🖍', tip: 'Highlighter' },
  { id: 'eraser', icon: '⌫', tip: 'Eraser' },
  { id: 'magnet', icon: '⚇', tip: 'Magnet Snap' },
  null,
  { id: 'hns', icon: 'HS', tip: 'Head & Shoulders' },
  { id: 'abcd', icon: 'ABCD', tip: 'ABCD Pattern' },
  { id: 'elliott', icon: 'EW', tip: 'Elliott Wave' },
  { id: 'cycliclines', icon: '∿', tip: 'Cyclic Lines' },
  { id: 'pricerange', icon: '⇕', tip: 'Price Range' },
  { id: 'ruler', icon: '📏', tip: 'Measure' },
  { id: 'barspattern', icon: '◫', tip: 'Bars Pattern' },
];

interface LeftSidebarProps {
  activePage?: string;
  activeTool?: string;
  onPage?: (page: string) => void;
  onTool?: (tool: string) => void;
}

export default function LeftSidebar({ activePage, activeTool, onPage, onTool }: LeftSidebarProps) {
  return (
    <div className="left-sidebar">
      <div className="sb-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`sb-nav-btn ${activePage === item.id ? 'active' : ''}`}
            title={item.tip}
            onClick={() => onPage?.(item.id)}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
          </Link>
        ))}
      </div>
      <div className="sb-div" />
      <div className="sb-tools">
        {DRAWING_TOOLS.map((tool, i) => {
          if (!tool) return <div key={`sep-${i}`} className="sb-tool-sep" />;
          return (
            <button
              key={tool.id}
              className={`sb-tool-btn ${activeTool === tool.id ? 'active' : ''}`}
              title={tool.tip}
              onClick={() => onTool?.(tool.id)}
            >
              <span style={{ fontSize: 13 }}>{tool.icon}</span>
            </button>
          );
        })}
      </div>
      <div className="sb-bottom">
        <div className="sb-div" />
        <Link href="/admin" className="sb-nav-btn" title="Admin">⚙</Link>
        <button className="sb-nav-btn" title="AI Assistant">🤖</button>
      </div>
    </div>
  );
}
