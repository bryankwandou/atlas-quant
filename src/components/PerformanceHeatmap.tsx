'use client';

import React from 'react';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

interface HeatmapRow {
  year: number;
  months: Array<number | null>;
  total: number;
}

export default function PerformanceHeatmap({ data }: { data: HeatmapRow[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-white border border-[#e0e3eb] rounded p-6 text-center text-xs text-gray-500">
        No historical performance available yet for this symbol.
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-[#e0e3eb] rounded p-1 overflow-x-auto">
      <table className="w-full text-[10px] font-mono border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="p-2 text-left border-r border-gray-200">YEAR</th>
            {MONTHS.map((m) => (
              <th key={m} className="p-2 text-center border-r border-gray-200">
                {m}
              </th>
            ))}
            <th className="p-2 text-center font-black">YEAR%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.year} className="border-b border-gray-100 last:border-0">
              <td className="p-2 font-black border-r border-gray-200 bg-gray-50/50">{row.year}</td>
              {row.months.map((val, idx) => {
                if (val === null || val === undefined) {
                  return (
                    <td key={idx} className="p-2 text-center border-r border-gray-200 text-gray-300">
                      —
                    </td>
                  );
                }
                const color = val >= 0 ? 'bg-green-600/15 text-green-700' : 'bg-red-600/15 text-red-700';
                return (
                  <td key={idx} className={`p-2 text-center border-r border-gray-200 ${color} font-bold`}>
                    {val.toFixed(2)}%
                  </td>
                );
              })}
              <td className={`p-2 text-center font-black ${row.total >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {row.total.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
