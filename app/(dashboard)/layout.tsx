'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, auth, getUserRole, persistSession, getSession } from '@/lib/atlas-auth';
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

  useEffect(() => {
    // Auth guard: check localStorage session (atlas-auth, no Firebase)
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      // Refresh role from backend best-effort
      try { await getUserRole(user.id); } catch { /* non-fatal */ }
      setReady(true);
    });
    return () => unsub();
  }, [router]);

  if (!ready) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1218' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M4 19L12 5L20 19H16L12 12L8 19H4Z" fill="#7b61ff"/>
            <circle cx="12" cy="19" r="1.5" fill="#7b61ff"/>
          </svg>
          <div style={{ width: 32, height: 3, borderRadius: 2, background: '#222a36', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#7b61ff', animation: 'pulse 1.2s ease-in-out infinite', width: '60%' }}/>
          </div>
        </div>
      </div>
    );
  }

  return (
    <IndicatorModalProvider>
      <div className="atlas-app device-laptop">
        <TopBar />
        <Sidebar />
        <main className="main-area">
          {children}
        </main>
        <RightPanel />
        <RightRail />
        <StatusBar />
        <IndicatorModal />
      </div>
    </IndicatorModalProvider>
  );
}
