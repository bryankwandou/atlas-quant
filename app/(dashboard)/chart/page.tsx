'use client';
import { useChartStore } from '@/store/chartStore';
import ChartContainer from '@/components/chart/ChartContainer';
import ChartErrorBoundary from '@/components/chart/ChartErrorBoundary';

export default function ChartPage() {
  const { symbol, timeframe } = useChartStore();
  return (
    <div className="chart-page-wrap">
      {/* Boundary keyed by symbol+timeframe: a switch that would otherwise reuse a
          corrupted chart instead mounts a clean one → no carried-over white screen. */}
      <ChartErrorBoundary label="Chart" key={`${symbol}:${timeframe}`}>
        <ChartContainer symbol={symbol} timeframe={timeframe} />
      </ChartErrorBoundary>
    </div>
  );
}
