'use client';
import { useChartStore } from '@/store/chartStore';
import ChartContainer from '@/components/chart/ChartContainer';

export default function DashboardPage() {
  const { symbol, timeframe } = useChartStore();
  return <ChartContainer symbol={symbol} timeframe={timeframe} />;
}
