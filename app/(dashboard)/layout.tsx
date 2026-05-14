import TopBar from '@/components/layout/TopBar';
import Sidebar from '@/components/layout/Sidebar';
import StatusBar from '@/components/layout/StatusBar';
import RightPanel from '@/components/RightPanel';
import IndicatorModal from '@/components/IndicatorModal';
import IndicatorModalProvider from '@/components/IndicatorModalProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <IndicatorModalProvider>
      <div className="layout-root">
        <TopBar />
        <div className="layout-body" style={{ marginTop: 'var(--topbar-h)' }}>
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
          <RightPanel />
        </div>
        <StatusBar />
        <IndicatorModal />
      </div>
    </IndicatorModalProvider>
  );
}
