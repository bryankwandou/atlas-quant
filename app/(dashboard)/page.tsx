'use client';
import { useChartStore } from '@/store/chartStore';
import ChartContainer from '@/components/chart/ChartContainer';

export default function DashboardPage() {
  const { symbol, timeframe } = useChartStore();
  return (
    <div className="chart-area">
      <div className="chart-panels">
        <ChartContainer symbol={symbol} timeframe={timeframe} />
      </div>
    </div>
  );
}
