import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Zap, Flame, Snowflake, Activity } from 'lucide-react';
import type { SyntheticSymbol, TickData } from '../../types/deriv';
import { RingBuffer } from '../../lib/ringBuffer';
import { computeFrequencyTable } from '../../lib/analysisEngine';

interface SymbolCardProps {
  symbolInfo: SyntheticSymbol;
  latestTick?: TickData;
  ringBuffer?: RingBuffer<TickData>;
}

export const SymbolCard: React.FC<SymbolCardProps> = ({ symbolInfo, latestTick, ringBuffer }) => {
  const navigate = useNavigate();

  const tickList = useMemo(() => {
    return ringBuffer ? ringBuffer.toArray(100) : [];
  }, [ringBuffer, latestTick]);

  // Compute frequency table
  const freqTable = useMemo(() => {
    return computeFrequencyTable(tickList, 100);
  }, [tickList]);

  // Find highest & lowest frequency digits
  const { hotDigit, coldDigit } = useMemo(() => {
    if (freqTable.length === 0) return { hotDigit: null, coldDigit: null };
    let max = freqTable[0];
    let min = freqTable[0];
    for (const f of freqTable) {
      if (f.percentage > max.percentage) max = f;
      if (f.percentage < min.percentage) min = f;
    }
    return {
      hotDigit: max.percentage >= 13 ? max.digit : null,
      coldDigit: min.percentage <= 7 ? min.digit : null,
    };
  }, [freqTable]);

  // SVG Sparkline path & area calculation
  const { sparklinePath, areaPath, isPriceUp } = useMemo(() => {
    if (tickList.length < 2) return { sparklinePath: '', areaPath: '', isPriceUp: true };
    const recent = tickList.slice(-25);
    const min = Math.min(...recent.map((t) => t.quote));
    const max = Math.max(...recent.map((t) => t.quote));
    const range = max - min || 1;

    const width = 130;
    const height = 36;

    const points = recent.map((t, idx) => {
      const x = (idx / (recent.length - 1)) * width;
      const y = height - ((t.quote - min) / range) * (height - 8) - 4;
      return { x, y };
    });

    const pathD = `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
    const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

    const firstPrice = recent[0].quote;
    const lastPrice = recent[recent.length - 1].quote;

    return {
      sparklinePath: pathD,
      areaPath: areaD,
      isPriceUp: lastPrice >= firstPrice,
    };
  }, [tickList]);

  const currentDigit = latestTick?.lastDigit !== undefined ? latestTick.lastDigit : null;
  const formattedQuote = latestTick?.quote.toFixed(symbolInfo.pipSize) ?? '---.--';

  const is1s = symbolInfo.symbol.includes('1HZ');
  const isBoomCrash = symbolInfo.symbol.includes('BOOM') || symbolInfo.symbol.includes('CRASH');

  return (
    <div
      onClick={() => navigate(`/analysis/${symbolInfo.symbol}`)}
      className="glass-card rounded-2xl p-4.5 cursor-pointer flex flex-col justify-between space-y-3.5 group border border-slate-800/80 hover:border-cyan-500/40 relative overflow-hidden"
    >
      {/* Background Subtle Gradient Glow */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition duration-300 pointer-events-none" />

      {/* Header Row */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                is1s
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : isBoomCrash
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              {is1s ? '1-SEC' : isBoomCrash ? 'SPIKE' : 'SYNTH'}
            </span>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">{symbolInfo.symbol}</span>
          </div>
          <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">
            {symbolInfo.displayName}
          </h3>
        </div>

        {/* Current Last Digit Badge with Neon Glow */}
        <div className="relative">
          <div
            key={currentDigit !== null ? `${symbolInfo.symbol}-${currentDigit}-${latestTick?.epoch}` : 'empty'}
            className={`w-11 h-11 rounded-2xl border flex flex-col items-center justify-center font-mono font-black text-xl transition-all ${
              currentDigit !== null
                ? currentDigit % 2 === 0
                  ? 'bg-gradient-to-b from-emerald-950/90 to-emerald-900/60 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.35)] digit-update-anim'
                  : 'bg-gradient-to-b from-amber-950/90 to-amber-900/60 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.35)] digit-update-anim'
                : 'bg-slate-900/80 text-slate-600 border-slate-800'
            }`}
          >
            <span>{currentDigit !== null ? currentDigit : '-'}</span>
            <span className="text-[7px] -mt-1 font-sans text-slate-400 font-normal uppercase">DIGIT</span>
          </div>
        </div>
      </div>

      {/* Sparkline & Current Price */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60 relative z-10">
        <div>
          <span className="text-xs font-mono font-bold text-slate-100 tracking-tight block">
            {formattedQuote}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>Live Ticker</span>
          </div>
        </div>

        {sparklinePath ? (
          <div className="relative">
            <svg className="w-32 h-9 overflow-visible" viewBox="0 0 130 36">
              <defs>
                <linearGradient id={`grad-${symbolInfo.symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPriceUp ? '#34d399' : '#38bdf8'} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={isPriceUp ? '#34d399' : '#38bdf8'} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#grad-${symbolInfo.symbol})`} />
              <path
                d={sparklinePath}
                fill="none"
                stroke={isPriceUp ? '#34d399' : '#38bdf8'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : (
          <div className="h-9 flex items-center text-[11px] text-slate-600 font-mono">
            Streaming ticks...
          </div>
        )}
      </div>

      {/* Digit Distribution Heatmap Preview (0-9) */}
      <div className="pt-2 border-t border-slate-800/60 relative z-10">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-mono">
          <span>Frequency (0–9)</span>
          <div className="flex items-center gap-2">
            {hotDigit !== null ? (
              <span className="flex items-center gap-0.5 text-rose-400 font-bold">
                <Flame className="w-3 h-3" /> #{hotDigit}
              </span>
            ) : null}
            {coldDigit !== null ? (
              <span className="flex items-center gap-0.5 text-cyan-400 font-bold">
                <Snowflake className="w-3 h-3" /> #{coldDigit}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-end justify-between gap-1 h-7 px-0.5 bg-slate-950/60 rounded-lg p-1 border border-slate-800/50">
          {freqTable.map((freq) => {
            const isHigh = freq.percentage >= 13;
            const isLow = freq.percentage <= 7;
            const barHeight = Math.max(Math.min((freq.percentage / 25) * 100, 100), 15);

            return (
              <div key={freq.digit} className="flex-1 flex flex-col items-center gap-0.5 group/bar relative h-full justify-end">
                {/* Tooltip */}
                <div className="absolute -top-7 hidden group-hover/bar:block bg-slate-900 border border-slate-700 text-[9px] font-mono text-slate-200 px-1.5 py-0.5 rounded shadow-xl z-20 whitespace-nowrap">
                  {freq.digit}: {freq.percentage}%
                </div>

                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    isHigh
                      ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                      : isLow
                      ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                      : 'bg-slate-700'
                  }`}
                  style={{ height: `${barHeight}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="pt-1.5 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-cyan-400 transition-colors relative z-10">
        <span className="flex items-center gap-1 text-[11px]">
          <Zap className="w-3.5 h-3.5" /> Launch Terminal
        </span>
        <div className="p-1 rounded-lg bg-slate-900 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 transition">
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
