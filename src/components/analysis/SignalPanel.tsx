import React from 'react';
import { Flame, Snowflake, Activity, Zap, ShieldCheck } from 'lucide-react';
import type { SignalSummary } from '../../types/deriv';
import { RiskBanner } from '../common/RiskBanner';

interface SignalPanelProps {
  signals: SignalSummary[];
  deviationThreshold: number;
}

export const SignalPanel: React.FC<SignalPanelProps> = ({ signals, deviationThreshold }) => {
  const hotSignals = signals.filter((s) => s.status === 'HOT');
  const coldSignals = signals.filter((s) => s.status === 'COLD');

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800/80 space-y-5 relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Statistical Signal Matrix</h2>
            <p className="text-xs text-slate-400">Deviation scores from theoretical uniform distribution</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            SENSITIVITY: &plusmn;{deviationThreshold.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Summary Highlights: Overrepresented (Hot) vs Underrepresented (Cold) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Hot Digits Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-slate-950 border border-rose-500/30 rounded-2xl p-4.5 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400">
              <div className="p-1.5 bg-rose-500/20 rounded-lg">
                <Flame className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-rose-200">
                Overrepresented Digits (Hot)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-950 px-2 py-0.5 rounded-full border border-rose-800/60 font-bold">
              +{deviationThreshold}% Threshold
            </span>
          </div>

          {hotSignals.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {hotSignals.map((s) => (
                <div
                  key={s.digit}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-mono font-bold text-xs rounded-xl border border-rose-500/40 flex items-center gap-2 shadow-md shadow-rose-950/50"
                >
                  <span className="text-sm font-black text-white">#{s.digit}</span>
                  <span className="text-[11px] text-rose-400">+{s.deviation}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 pt-1 font-mono">
              No digits currently exceed +{deviationThreshold}% baseline deviation.
            </p>
          )}
        </div>

        {/* Cold Digits Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-slate-950 border border-cyan-500/30 rounded-2xl p-4.5 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400">
              <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                <Snowflake className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-200">
                Underrepresented Digits (Cold)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800/60 font-bold">
              -{deviationThreshold}% Threshold
            </span>
          </div>

          {coldSignals.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {coldSignals.map((s) => (
                <div
                  key={s.digit}
                  className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono font-bold text-xs rounded-xl border border-cyan-500/40 flex items-center gap-2 shadow-md shadow-cyan-950/50"
                >
                  <span className="text-sm font-black text-white">#{s.digit}</span>
                  <span className="text-[11px] text-cyan-400">{s.deviation}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 pt-1 font-mono">
              No digits currently fall below -{deviationThreshold}% baseline deviation.
            </p>
          )}
        </div>
      </div>

      {/* Grid of All Digits Deviation Scores */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
          Complete Digit Variance Radar
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {signals.map((sig) => (
            <div
              key={sig.digit}
              className={`p-3 rounded-2xl border text-center font-mono space-y-1 transition-all duration-200 ${
                sig.status === 'HOT'
                  ? 'bg-gradient-to-b from-rose-950/60 to-slate-900/90 border-rose-500/50 text-rose-200 shadow-md shadow-rose-950/30 scale-[1.02]'
                  : sig.status === 'COLD'
                  ? 'bg-gradient-to-b from-cyan-950/60 to-slate-900/90 border-cyan-500/50 text-cyan-200 shadow-md shadow-cyan-950/30 scale-[1.02]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-bold text-slate-400">DIGIT {sig.digit}</div>
              <div className="text-base font-black text-white">
                {sig.deviation >= 0 ? `+${sig.deviation}%` : `${sig.deviation}%`}
              </div>
              <div
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  sig.status === 'HOT'
                    ? 'bg-rose-500/20 text-rose-300'
                    : sig.status === 'COLD'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-500'
                }`}
              >
                {sig.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Persistent Disclaimer */}
      <RiskBanner />
    </div>
  );
};
