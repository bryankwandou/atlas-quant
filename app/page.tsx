import TopBar from '@/components/layout/TopBar';
import Sidebar from '@/components/layout/Sidebar';
import StatusBar from '@/components/layout/StatusBar';
import DashboardHome from './(dashboard)/page';

export default function RootPage() {
  return (
    <div className="layout-root">
      <TopBar />
      <div className="layout-body">
        <Sidebar />
        <main className="main-content">
          <DashboardHome />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
