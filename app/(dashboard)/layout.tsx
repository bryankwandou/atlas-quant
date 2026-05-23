import TopBar from '@/components/layout/TopBar';
import Sidebar from '@/components/layout/Sidebar';
import StatusBar from '@/components/layout/StatusBar';
import RightPanel from '@/components/RightPanel';
import IndicatorModal from '@/components/IndicatorModal';
import IndicatorModalProvider from '@/components/IndicatorModalProvider';

/**
 * Atlas Quant · Dashboard layout
 *
 * Now uses the design system's .atlas-app CSS grid (ported verbatim
 * from E:\CLAUDE DESIGN\ATLAS-QUANT (2)\AtlasQuant Dashboard.html):
 *
 *   grid-template-areas:
 *     "topbar  topbar  topbar"
 *     "sidebar main    right"
 *     "sidebar statusbar statusbar"
 *
 * The previous flow-based layout (layout-root / layout-body / main-content)
 * has been replaced by the design-spec grid so the imported CSS actually
 * takes effect on the live route.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <IndicatorModalProvider>
      <div className="atlas-app device-laptop">
        <TopBar />
        <Sidebar />
        <main className="main-area">
          {children}
        </main>
        <RightPanel />
        <StatusBar />
        <IndicatorModal />
      </div>
    </IndicatorModalProvider>
  );
}
