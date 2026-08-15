import React from 'react';
import { Award, Zap, TrendingUp, DollarSign, Percent, ArrowUpRight } from 'lucide-react';

interface JournalAnalyticsProps {
  analytics: {
    totalTrades: number;
    totalWins: number;
    totalLosses: number;
    overallWinRate: number;
    totalNetProfit: number;
    signalAlignedTradesCount: number;
    signalAlignedWinRate: number;
    nonSignalWinRate: number;
  };
}

export const JournalAnalytics: React.FC<JournalAnalyticsProps> = ({ analytics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Trades Card */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800/80 flex items-center gap-4 relative overflow-hidden">
        <div className="p-3.5 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20 shadow-md">
          <Award className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
            Settled Contracts
          </span>
          <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
            {analytics.totalTrades}
          </span>
          <span className="text-[10px] font-mono text-slate-500 block">
            {analytics.totalWins} Won / {analytics.totalLosses} Lost
          </span>
        </div>
      </div>

      {/* Overall Win Rate Card */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800/80 flex items-center gap-4 relative overflow-hidden">
        <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-md">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
            Overall Win Rate
          </span>
          <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
            {analytics.overallWinRate}%
          </span>
          <span className="text-[10px] font-mono text-slate-500 block">Across all executed trades</span>
        </div>
      </div>

      {/* Signal Aligned Win Rate Card (Highlight Strategy Test) */}
      <div className="glass-panel rounded-3xl p-5 border border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 flex items-center gap-4 relative overflow-hidden shadow-xl shadow-indigo-950/30">
        <div className="p-3.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/40 shadow-md">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-mono text-indigo-300 font-bold uppercase tracking-wider block">
            Signal Aligned Win Rate
          </span>
          <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-200 tracking-tight">
            {analytics.signalAlignedWinRate}%
          </span>
          <span className="text-[10px] font-mono text-indigo-400 block">
            {analytics.signalAlignedTradesCount} signal-aligned entries
          </span>
        </div>
      </div>

      {/* Net Profit Card */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800/80 flex items-center gap-4 relative overflow-hidden">
        <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shadow-md">
          <DollarSign className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
            Net Profit / Loss
          </span>
          <span
            className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
              analytics.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {analytics.totalNetProfit >= 0
              ? `+$${analytics.totalNetProfit.toFixed(2)}`
              : `-$${Math.abs(analytics.totalNetProfit).toFixed(2)}`}
          </span>
          <span className="text-[10px] font-mono text-slate-500 block">Stored in local IndexedDB</span>
        </div>
      </div>
    </div>
  );
};
