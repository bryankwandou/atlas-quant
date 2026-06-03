'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/atlas-auth';
import TopBar from '@/components/layout/TopBar';
import Sidebar from '@/components/layout/Sidebar';
import StatusBar from '@/components/layout/StatusBar';
import RightPanel from '@/components/RightPanel';
import RightRail from '@/components/layout/RightRail';
import IndicatorModal from '@/components/IndicatorModal';
import IndicatorModalProvider from '@/components/IndicatorModalProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const appRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const leftHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const session = getSession();
      if (!session) { router.replace('/login'); return; }
      setReady(true);
    } catch { router.replace('/login'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore persisted panel widths (so they aren't "static" between sessions)
  useEffect(() => {
    if (!ready) return;
    const app = appRef.current;
    if (!app) return;
    try {
      const rw = localStorage.getItem('atlas:right-w');
      if (rw) app.style.setProperty('--right-w', `${rw}px`);
      const sw = localStorage.getItem('atlas:sidebar-w');
      if (sw) {
        app.style.setProperty('--sidebar-w', `${sw}px`);
        if (parseInt(sw) > 110) app.classList.add('sidebar-expanded');
      }
    } catch {}
  }, [ready]);

  // Drag-resize the LEFT sidebar (mirrors the right panel handle)
  const onDragStartLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const app = appRef.current;
    const handle = leftHandleRef.current;
    if (!app) return;
    const startW = parseInt(getComputedStyle(app).getPropertyValue('--sidebar-w') || '52') || 52;
    handle?.classList.add('dragging');
    let finalW = startW;
    const onMove = (ev: MouseEvent) => {
      finalW = Math.max(48, Math.min(280, startW + (ev.clientX - startX)));
      app.style.setProperty('--sidebar-w', `${finalW}px`);
      // Auto show/hide labels like TradingView when wide enough
      if (finalW > 110) app.classList.add('sidebar-expanded');
      else app.classList.remove('sidebar-expanded');
    };
    const onUp = () => {
      handle?.classList.remove('dragging');
      try { localStorage.setItem('atlas:sidebar-w', String(finalW)); } catch {}
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const app = appRef.current;
    const handle = handleRef.current;
    if (!app) return;
    const startW = parseInt(getComputedStyle(app).getPropertyValue('--right-w') || '280') || 280;
    handle?.classList.add('dragging');

    let finalW = startW;
    const onMove = (ev: MouseEvent) => {
      finalW = Math.max(160, Math.min(520, startW + (startX - ev.clientX)));
      app.style.setProperty('--right-w', `${finalW}px`);
    };
    const onUp = () => {
      handle?.classList.remove('dragging');
      try { localStorage.setItem('atlas:right-w', String(finalW)); } catch {}
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  if (!ready) {
    return (
      <div className="atlas-loading-screen">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M4 19L12 5L20 19H16L12 12L8 19H4Z" fill="#7b61ff"/>
          <circle cx="12" cy="19" r="1.5" fill="#7b61ff"/>
        </svg>
        <div className="atlas-loading-bar"><div className="atlas-loading-fill"/></div>
      </div>
    );
  }

  return (
    <IndicatorModalProvider>
      <div ref={appRef} className="atlas-app device-laptop">
        <TopBar />
        <Sidebar />
        <div ref={leftHandleRef} className="left-sidebar-handle" onMouseDown={onDragStartLeft} title="Drag to resize sidebar" />
        <main className="main-area">{children}</main>
        <div ref={handleRef} className="right-panel-handle" onMouseDown={onDragStart} title="Drag to resize" />
        <RightPanel />
        <RightRail />
        <StatusBar />
        <IndicatorModal />
      </div>
    </IndicatorModalProvider>
  );
}
