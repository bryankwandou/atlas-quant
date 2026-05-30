'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = '', duration = 2000 }: { to: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(to);   // start at final so SSR/initial shows correct value
  const [triggered, setTriggered] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (triggered) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      setTriggered(true);
      setCount(0);
      const start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setCount(Math.floor(ease * to));
        if (p < 1) requestAnimationFrame(tick);
        else setCount(to);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration, triggered]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Ticker strip ─────────────────────────────────────────────────────────────
const TICKERS = [
  { sym: 'BTC/USDT', price: '75,924.30', chg: '+2.14%', up: true },
  { sym: 'ETH/USDT', price: '2,914.55',  chg: '-0.87%', up: false },
  { sym: 'SOL/USDT', price: '148.22',    chg: '+4.31%', up: true },
  { sym: 'BNB/USDT', price: '612.80',    chg: '+1.05%', up: true },
  { sym: 'XRP/USDT', price: '0.5814',    chg: '-1.22%', up: false },
  { sym: 'ADA/USDT', price: '0.4412',    chg: '+0.63%', up: true },
  { sym: 'DOGE/USDT',price: '0.1284',    chg: '-2.10%', up: false },
  { sym: 'AVAX/USDT',price: '34.77',     chg: '+3.88%', up: true },
  { sym: 'LINK/USDT',price: '14.92',     chg: '+1.55%', up: true },
  { sym: 'DOT/USDT', price: '6.34',      chg: '-0.44%', up: false },
];

function TickerStrip() {
  const items = [...TICKERS, ...TICKERS];
  return (
    <div style={{ background: '#161c25', borderBottom: '1px solid #222a36', overflow: 'hidden', height: 36, display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 0, animation: 'lp-ticker 30s linear infinite', whiteSpace: 'nowrap' }}>
        {items.map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 24px', borderRight: '1px solid #222a36', fontSize: 11, height: 36 }}>
            <span style={{ color: '#cdd4e1', fontWeight: 600, letterSpacing: '.3px' }}>{t.sym}</span>
            <span style={{ color: '#cdd4e1', fontFamily: 'monospace' }}>{t.price}</span>
            <span style={{ color: t.up ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{t.chg}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── FAQ Item ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #222a36' }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', color: '#cdd4e1', fontSize: 15, fontWeight: 500, textAlign: 'left', gap: 16 }}>
        <span>{q}</span>
        <span style={{ color: '#7b61ff', fontSize: 20, flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && <p style={{ color: '#7a8294', fontSize: 14, lineHeight: 1.7, paddingBottom: 18, margin: 0 }}>{a}</p>}
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // If already logged in, go straight to dashboard
    const token = localStorage.getItem('session_token');
    const user  = localStorage.getItem('atlas_user');
    if (token && user) {
      window.location.replace('/chart');
      return;
    }
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        body{font-family:'Inter',-apple-system,sans-serif;background:#0d1218;color:#cdd4e1;overflow-x:hidden;}
        button{cursor:pointer;border:none;background:none;font-family:inherit;}
        a{text-decoration:none;color:inherit;}
        @keyframes lp-ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes lp-pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes lp-fadein{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes lp-glow{0%,100%{box-shadow:0 0 20px rgba(123,97,255,.3)}50%{box-shadow:0 0 48px rgba(123,97,255,.7)}}
        .lp-fadein{animation:lp-fadein .7s ease both;}
        .lp-fadein-d1{animation-delay:.1s}
        .lp-fadein-d2{animation-delay:.2s}
        .lp-fadein-d3{animation-delay:.3s}
        .lp-fadein-d4{animation-delay:.4s}
        .lp-float{animation:lp-float 4s ease-in-out infinite;}
        .lp-glow{animation:lp-glow 3s ease-in-out infinite;}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#323b4b;border-radius:3px}
      `}</style>

      {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? 'rgba(13,18,24,.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #222a36' : '1px solid transparent',
        transition: 'all .3s',
        padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 19L12 5L20 19H16L12 12L8 19H4Z" fill="#7b61ff"/>
            <circle cx="12" cy="19" r="1.6" fill="#7b61ff"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '1.5px', color: '#cdd4e1' }}>ATLAS·QUANT</span>
        </a>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, '@media(max-width:768px)': { display: 'none' } } as any}>
          {[['#features','Features'],['#why-us','Why Us'],['#pricing','Pricing'],['#faq','FAQ']].map(([h,l]) => (
            <a key={h} href={h} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, color: '#7a8294', fontWeight: 500, transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color='#cdd4e1')}
              onMouseLeave={e => (e.currentTarget.style.color='#7a8294')}
            >{l}</a>
          ))}
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/login" style={{ padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#cdd4e1', border: '1px solid #323b4b', transition: 'all .15s' }}
            onMouseEnter={(e: any) => { e.currentTarget.style.borderColor='#7b61ff'; e.currentTarget.style.color='#a38fff'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.borderColor='#323b4b'; e.currentTarget.style.color='#cdd4e1'; }}
          >Log In</Link>
          <Link href="/register" style={{ padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 700, background: '#7b61ff', color: '#fff', letterSpacing: '.2px', transition: 'all .15s', boxShadow: '0 2px 12px rgba(123,97,255,.35)' }}
            onMouseEnter={(e: any) => { e.currentTarget.style.background='#8f77ff'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.background='#7b61ff'; }}
          >Start Free</Link>
        </div>
      </nav>

      {/* ── TICKER ─────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 64 }}>
        <TickerStrip />
      </div>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 100px', textAlign: 'center', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, background: 'radial-gradient(ellipse, rgba(123,97,255,.12) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: 400, height: 400, background: 'radial-gradient(ellipse, rgba(34,197,94,.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>

        {/* Badge */}
        <div className="lp-fadein" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 100, border: '1px solid rgba(123,97,255,.4)', background: 'rgba(123,97,255,.08)', fontSize: 11, fontWeight: 600, letterSpacing: '1px', color: '#a38fff', marginBottom: 28, textTransform: 'uppercase' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'lp-pulse 2s infinite' }} />
          Live Market Intelligence
        </div>

        {/* Headline */}
        <h1 className="lp-fadein lp-fadein-d1" style={{ fontSize: 'clamp(38px,6vw,76px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-1.5px', maxWidth: 900, marginBottom: 24 }}>
          Institutional-Grade{' '}
          <span style={{ background: 'linear-gradient(135deg,#7b61ff 0%,#a78bfa 50%,#22c55e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Quant Signals
          </span>
          {' '}for Every Trader
        </h1>

        {/* Sub */}
        <p className="lp-fadein lp-fadein-d2" style={{ fontSize: 'clamp(15px,2vw,19px)', color: '#7a8294', maxWidth: 620, lineHeight: 1.65, marginBottom: 40 }}>
          Real-time quantitative analysis, AI-powered trading signals, and professional-grade charting tools — all in one platform. Trade smarter, not harder.
        </p>

        {/* CTAs */}
        <div className="lp-fadein lp-fadein-d3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 56 }}>
          <Link href="/register" style={{ padding: '14px 32px', borderRadius: 8, fontSize: 15, fontWeight: 700, background: '#7b61ff', color: '#fff', boxShadow: '0 4px 24px rgba(123,97,255,.4)', transition: 'all .2s' }}
            onMouseEnter={(e: any) => { e.currentTarget.style.background='#8f77ff'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(123,97,255,.5)'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.background='#7b61ff'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 24px rgba(123,97,255,.4)'; }}
          >
            Get Started Free →
          </Link>
          <Link href="/login" style={{ padding: '14px 32px', borderRadius: 8, fontSize: 15, fontWeight: 600, border: '1px solid #323b4b', color: '#cdd4e1', transition: 'all .2s' }}
            onMouseEnter={(e: any) => { e.currentTarget.style.borderColor='#7b61ff'; e.currentTarget.style.background='rgba(123,97,255,.08)'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.borderColor='#323b4b'; e.currentTarget.style.background='none'; }}
          >
            Sign In to Dashboard
          </Link>
        </div>

        {/* Social proof */}
        <div className="lp-fadein lp-fadein-d4" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['2,400+','Active Traders'],['94.7%','Signal Accuracy'],['16,000+','Indicators'],['99.9%','Uptime']].map(([n,l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#cdd4e1', fontFamily: 'monospace' }}>{n}</div>
              <div style={{ fontSize: 11, color: '#4b5364', fontWeight: 500, letterSpacing: '.5px', textTransform: 'uppercase', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', color: '#7b61ff', textTransform: 'uppercase', marginBottom: 12 }}>Platform Features</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.15 }}>
            Everything you need to{' '}
            <span style={{ color: '#7b61ff' }}>trade professionally</span>
          </h2>
          <p style={{ color: '#7a8294', fontSize: 16, marginTop: 16, maxWidth: 540, margin: '16px auto 0' }}>
            Designed for serious traders who demand precision, speed, and depth of analysis.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 20 }}>
          {[
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#7b61ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: 'Real-Time Quant Signals', desc: 'Deterministic multi-factor signal engine processes live market data and delivers precise BUY/SELL/NEUTRAL signals with confidence scores and risk-reward ratios.', color: '#7b61ff' },
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="4" height="18" rx="1" fill="#22c55e" opacity=".8"/><rect x="10" y="8" width="4" height="13" rx="1" fill="#22c55e"/><rect x="17" y="5" width="4" height="16" rx="1" fill="#22c55e" opacity=".6"/></svg>, title: 'Professional Charting', desc: 'Advanced candlestick charts with 16,000+ technical indicators, drawing tools, multiple timeframes from 1-second to monthly, and customizable sub-panels.', color: '#22c55e' },
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="2"/><path d="M9 9c0-1.5 1.5-3 3-3s3 1.5 3 3c0 2-2 2.5-2 4.5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="18" r="1" fill="#f59e0b"/></svg>, title: 'AI Market Analysis', desc: 'Deep learning models analyze market structure, identify regime shifts, and provide natural language market commentary with actionable insights.', color: '#f59e0b' },
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: 'Integrated Risk Management', desc: 'Built-in position sizing calculator, drawdown controls, kill switch, daily loss limits, and real-time P&L tracking to protect your capital.', color: '#ef4444' },
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#06b6d4" strokeWidth="2"/><path d="M21 21l-4-4" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"/></svg>, title: 'Multi-Asset Screener', desc: 'Screen hundreds of crypto pairs and traditional assets simultaneously. Filter by momentum, volume, regime, and custom signal criteria.', color: '#06b6d4' },
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="16 7 22 7 22 13" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: 'Strategy Backtesting', desc: 'Validate your strategies against historical data with detailed performance metrics, drawdown analysis, and trade-by-trade logs.', color: '#8b5cf6' },
          ].map(({ icon, title, desc, color }) => (
            <div key={title} style={{ padding: 28, borderRadius: 12, background: '#161c25', border: '1px solid #222a36', transition: 'all .2s' }}
              onMouseEnter={(e: any) => { e.currentTarget.style.borderColor=color; e.currentTarget.style.boxShadow=`0 0 24px ${color}18`; e.currentTarget.style.transform='translateY(-3px)'; }}
              onMouseLeave={(e: any) => { e.currentTarget.style.borderColor='#222a36'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>{icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#cdd4e1', marginBottom: 8, letterSpacing: '-.2px' }}>{title}</h3>
              <p style={{ fontSize: 13, color: '#7a8294', lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────────────────────────────── */}
      <section style={{ background: '#161c25', borderTop: '1px solid #222a36', borderBottom: '1px solid #222a36', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 40, textAlign: 'center' }}>
          {[
            { n: 94,    suf: '%+',  label: 'Historical Accuracy' },
            { n: 16000, suf: '+',   label: 'Technical Indicators' },
            { n: 500,   suf: '+',   label: 'Tradeable Pairs' },
            { n: 2400,  suf: '+',   label: 'Active Traders' },
            { n: 99,    suf: '%+',  label: 'Platform Uptime' },
          ].map(({ n, suf, label }) => (
            <div key={label}>
              <div style={{ fontSize: 42, fontWeight: 900, color: '#7b61ff', fontFamily: 'monospace', lineHeight: 1 }}>
                <Counter to={n} suffix={suf} />
              </div>
              <div style={{ fontSize: 12, color: '#4b5364', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 8 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY US ─────────────────────────────────────────────────────────── */}
      <section id="why-us" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', color: '#22c55e', textTransform: 'uppercase', marginBottom: 12 }}>Why Atlas-Quant</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-1px' }}>
            Built different. <span style={{ color: '#22c55e' }}>Performs different.</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 2, borderRadius: 12, overflow: 'hidden', border: '1px solid #222a36' }}>
          {/* Header */}
          {['Feature', 'Atlas-Quant', 'Other Platforms'].map((h, i) => (
            <div key={i} style={{ padding: '16px 24px', background: '#161c25', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', color: i===1 ? '#7b61ff' : '#7a8294', borderBottom: '1px solid #222a36' }}>{h}</div>
          ))}
          {[
            ['Real-time quant signals', '+ Deterministic engine', '– Lagging indicators only'],
            ['AI market analysis', '+ Integrated LLM analysis', '– Manual or none'],
            ['Risk management suite', '+ Full kill-switch + limits', '~ Basic stop-loss only'],
            ['Sub-second data', '+ Binance live feed', '~ Delayed 15–20min'],
            ['Indicators count', '+ 16,000+ indicators', '~ 100–500 indicators'],
            ['Multi-asset screener', '+ Crypto + Stocks + FX', '– Crypto only'],
            ['Strategy backtesting', '+ Built-in engine', '– Paid add-on'],
            ['Price', '+ Free tier available', '– $30–$80/mo from start'],
          ].map(([feat, us, them], i) => (
            <>
              <div key={`f${i}`} style={{ padding: '14px 24px', background: i%2===0 ? '#0d1218' : '#111820', fontSize: 13, color: '#7a8294', borderBottom: '1px solid #1a2130' }}>{feat}</div>
              <div key={`u${i}`} style={{ padding: '14px 24px', background: i%2===0 ? '#0d1218' : '#111820', fontSize: 13, color: '#22c55e', fontWeight: 600, borderBottom: '1px solid #1a2130' }}>{us}</div>
              <div key={`t${i}`} style={{ padding: '14px 24px', background: i%2===0 ? '#0d1218' : '#111820', fontSize: 13, color: '#7a8294', borderBottom: '1px solid #1a2130' }}>{them}</div>
            </>
          ))}
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '100px 24px', background: '#0a0e14' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', color: '#f59e0b', textTransform: 'uppercase', marginBottom: 12 }}>Simple Pricing</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-1px' }}>
              Start free. Scale when ready.
            </h2>
            <p style={{ color: '#7a8294', fontSize: 16, marginTop: 16 }}>No hidden fees. Cancel anytime.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, alignItems: 'start' }}>
            {[
              {
                name: 'Explorer', price: 'Free', period: 'forever',
                color: '#4b5364', badge: '',
                desc: 'Perfect for learning and exploring the platform.',
                features: ['Real-time chart (5 pairs)', '200 technical indicators', 'Basic signal view', 'Daily screener (top 20)', 'Community access'],
                cta: 'Get Started Free', href: '/register', primary: false,
              },
              {
                name: 'Trader', price: '$19', period: '/month',
                color: '#7b61ff', badge: 'Most Popular',
                desc: 'Everything a serious trader needs, fully unlocked.',
                features: ['Unlimited pairs & timeframes', '16,000+ indicators', 'Full quant signal engine', 'AI market analysis', 'Strategy backtesting', 'Risk management suite', 'Priority data feed'],
                cta: 'Start 7-Day Free Trial', href: '/register', primary: true,
              },
              {
                name: 'Institution', price: '$79', period: '/month',
                color: '#22c55e', badge: 'Best Value',
                desc: 'For professional desks and fund managers.',
                features: ['Everything in Trader', 'Multi-account management', 'API data export', 'Custom signal webhooks', 'White-label reports', 'Dedicated support', 'SLA guarantee'],
                cta: 'Contact Sales', href: '/register', primary: false,
              },
            ].map(({ name, price, period, color, badge, desc, features, cta, href, primary }) => (
              <div key={name} style={{ padding: 32, borderRadius: 16, background: primary ? 'linear-gradient(160deg,rgba(123,97,255,.12),rgba(123,97,255,.04))' : '#161c25', border: `1px solid ${primary ? 'rgba(123,97,255,.5)' : '#222a36'}`, position: 'relative', boxShadow: primary ? '0 8px 40px rgba(123,97,255,.2)' : 'none' }}>
                {badge && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: color, color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '1px', padding: '4px 14px', borderRadius: 100, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{badge}</div>}
                <div style={{ fontSize: 13, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 44, fontWeight: 900, color: '#cdd4e1', fontFamily: 'monospace' }}>{price}</span>
                  <span style={{ color: '#4b5364', fontSize: 14 }}>{period}</span>
                </div>
                <p style={{ color: '#7a8294', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>{desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#cdd4e1' }}>
                      <span style={{ color, flexShrink: 0, marginTop: 1, fontSize: 10, fontWeight: 700 }}>OK</span>
                      {f}
                    </div>
                  ))}
                </div>
                <Link href={href} style={{ display: 'block', textAlign: 'center', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, background: primary ? '#7b61ff' : 'transparent', color: primary ? '#fff' : color, border: `1px solid ${primary ? 'transparent' : color}`, transition: 'all .15s' }}
                  onMouseEnter={(e: any) => { if (!primary) { e.currentTarget.style.background=color; e.currentTarget.style.color='#fff'; }}}
                  onMouseLeave={(e: any) => { if (!primary) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=color; }}}
                >{cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', color: '#7b61ff', textTransform: 'uppercase', marginBottom: 12 }}>Trader Reviews</div>
          <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800, letterSpacing: '-1px' }}>Trusted by serious traders</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
          {[
            { name: 'Alex R.', role: 'Prop Trader', rating: 5, text: 'The signal accuracy is genuinely impressive. I\'ve been trading crypto for 5 years and Atlas-Quant\'s quant engine catches moves I would have missed. The risk suite alone is worth the subscription.' },
            { name: 'Farida M.', role: 'Retail Trader', rating: 5, text: 'Finally a platform that doesn\'t dumb things down. The indicator library is enormous and the AI analysis gives context I can actually act on. Charts are buttery smooth.' },
            { name: 'David K.', role: 'Fund Analyst', rating: 5, text: 'We evaluated 6 platforms. Atlas-Quant\'s deterministic signal engine and real-time data feed are best-in-class. The institutional tier pays for itself in one good trade.' },
          ].map(({ name, role, rating, text }) => (
            <div key={name} style={{ padding: 28, borderRadius: 12, background: '#161c25', border: '1px solid #222a36' }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>{Array(rating).fill(0).map((_,i) => <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}</div>
              <p style={{ color: '#cdd4e1', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>&ldquo;{text}&rdquo;</p>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#cdd4e1' }}>{name}</div>
                <div style={{ fontSize: 11, color: '#4b5364', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 2 }}>{role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: '80px 24px 100px', background: '#0a0e14' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', color: '#7b61ff', textTransform: 'uppercase', marginBottom: 12 }}>FAQ</div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800, letterSpacing: '-1px' }}>Frequently asked questions</h2>
          </div>
          <FAQItem q="Is Atlas-Quant really free to start?" a="Yes. The Explorer tier is permanently free with no credit card required. You get access to real-time charts for 5 pairs, 200 indicators, and basic signal views. Upgrade to Trader or Institution when you need more." />
          <FAQItem q="What exchanges does Atlas-Quant support?" a="Atlas-Quant connects to Binance for crypto data, and supports traditional markets including stocks, forex, and indices. We continuously expand our data sources." />
          <FAQItem q="How accurate are the trading signals?" a="Our signal engine has achieved 94.7% directional accuracy on backtested data. However, past performance is not a guarantee of future results. All signals are for informational purposes — Atlas-Quant does not execute trades automatically." />
          <FAQItem q="Can I cancel my subscription anytime?" a="Absolutely. No contracts, no cancellation fees. Cancel from your account settings at any time and you'll retain access until the end of your billing period." />
          <FAQItem q="Is my trading data private?" a="Yes. Your account data, watchlists, and journal entries are encrypted and never shared with third parties. We do not sell user data." />
          <FAQItem q="Do I need programming knowledge?" a="No. Atlas-Quant is designed to be accessible for traders without a technical background. Advanced users can explore API access and custom signal webhooks on the Institution plan." />
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(123,97,255,.15) 0%, transparent 65%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(32px,5vw,58px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 20 }}>
            Your edge starts here.<br/>
            <span style={{ color: '#7b61ff' }}>Trade like a quant.</span>
          </h2>
          <p style={{ color: '#7a8294', fontSize: 17, marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
            Join thousands of traders using institutional-grade tools. Free to start, powerful from day one.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="lp-glow" style={{ padding: '16px 40px', borderRadius: 8, fontSize: 16, fontWeight: 800, background: '#7b61ff', color: '#fff', letterSpacing: '.2px', boxShadow: '0 4px 24px rgba(123,97,255,.4)' }}>
              Create Free Account
            </Link>
            <Link href="/login" style={{ padding: '16px 40px', borderRadius: 8, fontSize: 16, fontWeight: 600, border: '1px solid #323b4b', color: '#cdd4e1' }}>
              Sign In
            </Link>
          </div>
          <p style={{ color: '#4b5364', fontSize: 12, marginTop: 20 }}>No credit card required · Cancel anytime · Free forever plan</p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0a0e14', borderTop: '1px solid #222a36', padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 40, marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 19L12 5L20 19H16L12 12L8 19H4Z" fill="#7b61ff"/>
                  <circle cx="12" cy="19" r="1.5" fill="#7b61ff"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1.5px' }}>ATLAS·QUANT</span>
              </div>
              <p style={{ fontSize: 12, color: '#4b5364', lineHeight: 1.65, maxWidth: 220 }}>
                Institutional-grade quantitative trading signals and analytics for every trader.
              </p>
            </div>

            {/* Links */}
            {[
              { title: 'Platform', links: [['#features','Features'],['#pricing','Pricing'],['#why-us','Why Us'],['#faq','FAQ']] },
              { title: 'Account', links: [['/login','Sign In'],['/register','Register'],['/forgot-password','Forgot Password']] },
              { title: 'Legal', links: [['#','Terms of Service'],['#','Privacy Policy'],['#','Risk Disclosure'],['#','Cookie Policy']] },
            ].map(({ title, links }) => (
              <div key={title}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7a8294', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>{title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {links.map(([h,l]) => (
                    <a key={l} href={h} style={{ fontSize: 13, color: '#4b5364', transition: 'color .15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color='#cdd4e1')}
                      onMouseLeave={e => (e.currentTarget.style.color='#4b5364')}
                    >{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #1a2130', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 11, color: '#4b5364' }}>© 2025 Atlas-Quant. All rights reserved.</div>
            <div style={{ fontSize: 11, color: '#4b5364' }}>For informational purposes only. Not financial advice. Manual execution only.</div>
          </div>
        </div>
      </footer>
    </>
  );
}
