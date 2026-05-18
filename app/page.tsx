import TopBar from '@/components/layout/TopBar';
import Sidebar from '@/components/layout/Sidebar';
import StatusBar from '@/components/layout/StatusBar';
import DashboardHome from './(dashboard)/page';

export default function RootPage() {
  return (
    <div className="atlas-app device-laptop">
      <TopBar />
      <Sidebar />
      <main className="main-area">
        <DashboardHome />
      </main>
      <StatusBar />
    </div>
  );
}
