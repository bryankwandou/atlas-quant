'use client';
import { useChartStore } from '@/store/chartStore';
import ChartContainer from '@/components/chart/ChartContainer';

export default function DashboardPage() {
  const { symbol, timeframe } = useChartStore();

  return (
    <div className="dash-home" style={{ height: '100%', overflow: 'hidden' }}>
      <div className="dash-chart-wrap">
        <ChartContainer symbol={symbol} timeframe={timeframe} />
      </div>
    </div>
  );
}
