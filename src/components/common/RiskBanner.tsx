import React from 'react';
import { Info } from 'lucide-react';

interface RiskBannerProps {
  compact?: boolean;
}

export const RiskBanner: React.FC<RiskBannerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5">
        <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span>Statistical description only — RNG ticks are independent. No win guarantees.</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 text-xs text-slate-400 bg-slate-900/80 border border-sky-900/30 rounded-xl p-3">
      <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-slate-300">Statistical Analysis Notice: </span>
        All signal scores and cold/hot flags are descriptive calculations of historical variance from the 10% baseline over the selected window. Past draws do not predict future outcomes.
      </div>
    </div>
  );
};
