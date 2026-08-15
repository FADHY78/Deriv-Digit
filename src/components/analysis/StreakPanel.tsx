import React from 'react';
import { Clock, Zap } from 'lucide-react';
import type { StreakInfo } from '../../types/deriv';

interface StreakPanelProps {
  streaks: StreakInfo[];
}

export const StreakPanel: React.FC<StreakPanelProps> = ({ streaks }) => {
  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800/80 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Digit Dormancy &amp; Streak Tracker</h2>
            <p className="text-xs text-slate-400">Ticks elapsed since each digit last appeared in tick stream</p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-xl">
          0 = Current Tick
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {streaks.map((s) => {
          const isDormant = s.ticksSinceLast >= 15;
          const isRecent = s.ticksSinceLast === 0;
          const progressPercent = Math.min((s.ticksSinceLast / 25) * 100, 100);

          return (
            <div
              key={s.digit}
              className={`rounded-2xl p-3.5 border transition-all duration-200 flex flex-col justify-between space-y-2 relative overflow-hidden ${
                isRecent
                  ? 'bg-gradient-to-b from-emerald-950/80 to-emerald-900/40 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)] scale-[1.02]'
                  : isDormant
                  ? 'bg-gradient-to-b from-amber-950/50 to-slate-900/80 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Digit Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-extrabold text-slate-400">DIGIT {s.digit}</span>
                {isRecent ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                ) : null}
              </div>

              {/* Streak Counter */}
              <div className="flex items-baseline gap-1.5 py-1">
                <span className="font-mono text-3xl font-black text-white tracking-tight">
                  {s.ticksSinceLast}
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase">ticks</span>
              </div>

              {/* Status Badge & Mini Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-950/80 h-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isRecent ? 'bg-emerald-400' : isDormant ? 'bg-amber-400' : 'bg-slate-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div
                  className={`text-[10px] font-mono font-bold text-center py-0.5 rounded-lg uppercase tracking-wider ${
                    isRecent
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : isDormant
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-slate-500 bg-slate-950/40'
                  }`}
                >
                  {isRecent ? '⚡ JUST NOW' : isDormant ? '❄️ DORMANT' : 'ACTIVE'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
