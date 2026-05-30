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

  useEffect(() => {
    try {
      const session = getSession();
      if (!session) { router.replace('/login'); return; }
      setReady(true);
    } catch { router.replace('/login'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const app = appRef.current;
    const handle = handleRef.current;
    if (!app) return;
    const startW = parseInt(getComputedStyle(app).getPropertyValue('--right-w') || '280') || 280;
    handle?.classList.add('dragging');

    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(160, Math.min(520, startW + (startX - ev.clientX)));
      app.style.setProperty('--right-w', `${newW}px`);
    };
    const onUp = () => {
      handle?.classList.remove('dragging');
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
