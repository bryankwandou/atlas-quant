'use client';
import { useChartStore } from '@/store/chartStore';
import ChartContainer from '@/components/chart/ChartContainer';

export default function ChartPage() {
  const { symbol, timeframe } = useChartStore();
  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <ChartContainer symbol={symbol} timeframe={timeframe} />
    </div>
  );
}
