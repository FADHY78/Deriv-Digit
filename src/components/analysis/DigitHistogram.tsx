import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, Info } from 'lucide-react';
import type { FrequencyData } from '../../types/deriv';

interface DigitHistogramProps {
  frequencyTable: FrequencyData[];
  windowSize: 100 | 300 | 500;
  onWindowSizeChange: (size: 100 | 300 | 500) => void;
  deviationThreshold: number;
}

export const DigitHistogram: React.FC<DigitHistogramProps> = ({
  frequencyTable,
  windowSize,
  onWindowSizeChange,
  deviationThreshold,
}) => {
  const chartData = frequencyTable.map((item) => ({
    digit: `Digit ${item.digit}`,
    digitNum: item.digit,
    percentage: item.percentage,
    count: item.count,
    deviation: item.deviation,
  }));

  const getBarColor = (deviation: number) => {
    if (deviation >= deviationThreshold) return '#f43f5e'; // Hot / Overrepresented (Rose/Red)
    if (deviation <= -deviationThreshold) return '#00f0ff'; // Cold / Underrepresented (Electric Cyan)
    return '#3b82f6'; // Neutral (Electric Blue)
  };

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800/80 space-y-5 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Window Size Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">Digit Frequency Distribution</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical probability vs. theoretical <span className="font-mono text-amber-400 font-bold">10.0%</span> baseline
          </p>
        </div>

        {/* Window Selector Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-1 shadow-inner">
          <span className="text-[11px] font-mono text-slate-400 px-2.5 font-semibold">WINDOW:</span>
          {([100, 300, 500] as const).map((size) => (
            <button
              key={size}
              onClick={() => onWindowSizeChange(size)}
              className={`px-3.5 py-1.5 text-xs font-mono font-bold rounded-xl transition-all ${
                windowSize === size
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/50 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {size} Ticks
            </button>
          ))}
        </div>
      </div>

      {/* Histogram Chart */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="digitNum"
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: '700', fontFamily: 'JetBrains Mono' }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              domain={[0, 25]}
              unit="%"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded-2xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white font-mono text-sm">Digit {data.digitNum}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {data.count} / {windowSize} ticks
                        </span>
                      </div>
                      <div className="text-slate-300 flex justify-between gap-3">
                        <span>Observed Rate:</span>
                        <span className="font-bold text-cyan-400 font-mono text-sm">{data.percentage}%</span>
                      </div>
                      <div className="text-slate-400 flex justify-between gap-3">
                        <span>Baseline Variance:</span>
                        <span
                          className={`font-mono font-bold ${
                            data.deviation >= 0 ? 'text-rose-400' : 'text-cyan-400'
                          }`}
                        >
                          {data.deviation >= 0 ? `+${data.deviation}%` : `${data.deviation}%`}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine
              y={10}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '10.0% Expected Baseline',
                fill: '#f59e0b',
                fontSize: 11,
                fontFamily: 'JetBrains Mono',
                fontWeight: 'bold',
                position: 'top',
              }}
            />
            <Bar dataKey="percentage" radius={[8, 8, 2, 2]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.deviation)}
                  stroke={entry.deviation >= deviationThreshold ? '#f43f5e' : entry.deviation <= -deviationThreshold ? '#00f0ff' : '#60a5fa'}
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Summary Badges */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-3 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-rose-950/40 border border-rose-500/30 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
            <span className="text-rose-300 font-semibold">Hot (&ge; +{deviationThreshold}%)</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-cyan-950/40 border border-cyan-500/30 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
            <span className="text-cyan-300 font-semibold">Cold (&le; -{deviationThreshold}%)</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span className="text-slate-400">Baseline Range</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400" />
          <span>Independent RNG draws per tick</span>
        </div>
      </div>
    </div>
  );
};
