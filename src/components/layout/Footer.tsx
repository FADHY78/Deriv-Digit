import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Activity, Clock, BookOpen, Settings } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';

export const Footer: React.FC = () => {
  const { selectedSymbol } = useMarketStore();

  return (
    <>
      {/* Desktop Footer */}
      <footer className="w-full border-t border-slate-800/60 bg-slate-950 py-6 px-4 mt-auto mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-400">Deriv Digit Analyzer</span> &copy; {new Date().getFullYear()} — Client-side statistical suite for synthetic index last-digit dynamics.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Deriv API v3</span>
            <span>•</span>
            <span>RNG Audited Synthetic Indices</span>
            <span>•</span>
            <span className="text-amber-500/80">Descriptive Statistical Models Only</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-800 bg-slate-950/95 px-2 py-1.5 flex items-center justify-around">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
              isActive ? 'text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <BarChart3 className="w-5 h-5" />
          Dashboard
        </NavLink>

        <NavLink
          to={`/analysis/${selectedSymbol || 'R_100'}`}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
              isActive ? 'text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <Activity className="w-5 h-5" />
          Analysis
        </NavLink>

        <NavLink
          to="/positions"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
              isActive ? 'text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <Clock className="w-5 h-5" />
          Positions
        </NavLink>

        <NavLink
          to="/journal"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
              isActive ? 'text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <BookOpen className="w-5 h-5" />
          Journal
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
              isActive ? 'text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <Settings className="w-5 h-5" />
          Settings
        </NavLink>
      </nav>
    </>
  );
};
