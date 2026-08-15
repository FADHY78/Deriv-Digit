import React from 'react';
import { Clock, CheckCircle, XCircle, TrendingUp, DollarSign, Activity } from 'lucide-react';
import type { ActivePosition } from '../../types/deriv';

interface PositionCardProps {
  position: ActivePosition;
}

export const PositionCard: React.FC<PositionCardProps> = ({ position }) => {
  const isWon = position.status === 'won';
  const isLost = position.status === 'lost';
  const isOpen = position.status === 'open';

  return (
    <div
      className={`glass-panel rounded-3xl p-5 border transition-all duration-200 relative overflow-hidden ${
        isWon
          ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 shadow-lg shadow-emerald-950/30'
          : isLost
          ? 'border-rose-500/50 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 shadow-lg shadow-rose-950/30'
          : 'border-slate-800/90 bg-slate-900/80 hover:border-cyan-500/40'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="font-extrabold text-sm sm:text-base text-white">{position.symbol}</span>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 rounded-lg">
            {position.contractType}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isOpen ? (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-3 py-1 rounded-full animate-pulse shadow-md shadow-amber-950/50">
              <Clock className="w-3.5 h-3.5" />
              LIVE TICKING
            </span>
          ) : isWon ? (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/50 px-3 py-1 rounded-full shadow-md shadow-emerald-950/50">
              <CheckCircle className="w-3.5 h-3.5" />
              WON (+${(position.payout - position.stake).toFixed(2)})
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-300 bg-rose-950/90 border border-rose-500/50 px-3 py-1 rounded-full shadow-md shadow-rose-950/50">
              <XCircle className="w-3.5 h-3.5" />
              LOST (-${position.stake.toFixed(2)})
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3.5 text-xs font-mono">
        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Barrier Target</span>
          <span className="font-black text-amber-400 text-base block mt-0.5">Digit {position.barrier}</span>
        </div>

        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Stake / Payout</span>
          <span className="font-bold text-slate-200 text-sm block mt-0.5">
            ${position.stake.toFixed(2)} / <span className="text-emerald-400">${position.payout.toFixed(2)}</span>
          </span>
        </div>

        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Current Spot</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-bold text-cyan-300 text-sm">
              {position.currentSpot ? position.currentSpot.toFixed(2) : '---.--'}
            </span>
            {position.currentLastDigit !== undefined ? (
              <span className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs">
                {position.currentLastDigit}
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Profit / Loss</span>
          <span
            className={`font-black text-base block mt-0.5 ${
              position.profit > 0
                ? 'text-emerald-400'
                : position.profit < 0
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {position.profit >= 0 ? `+$${position.profit.toFixed(2)}` : `-$${Math.abs(position.profit).toFixed(2)}`}
          </span>
        </div>
      </div>
    </div>
  );
};
