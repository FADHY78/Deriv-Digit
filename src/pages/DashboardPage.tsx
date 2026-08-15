import React, { useEffect, useState, useMemo } from 'react';
import { Activity, RefreshCw, Search, Sparkles, Zap, Flame, Snowflake, Layers } from 'lucide-react';
import { useMarketStore } from '../store/useMarketStore';
import { useAuthStore } from '../store/useAuthStore';
import { SymbolCard } from '../components/dashboard/SymbolCard';
import { RiskBanner } from '../components/common/RiskBanner';

export const DashboardPage: React.FC = () => {
  const {
    activeSymbols,
    latestTicks,
    ringBuffers,
    isInitializing,
    loadActiveSymbols,
    subscribeAllVisible,
  } = useMarketStore();

  const { fetchUserAccounts } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'VOL' | '1S' | 'CRASH_BOOM'>('ALL');

  useEffect(() => {
    // 1. Sync accounts & live balance
    fetchUserAccounts();

    // 2. Load symbols and connect WebSocket stream
    loadActiveSymbols();
  }, [loadActiveSymbols, fetchUserAccounts]);

  // Filter symbols based on search and category
  const filteredSymbols = useMemo(() => {
    return activeSymbols.filter((sym) => {
      const matchesSearch =
        sym.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sym.symbol.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === '1S') return sym.symbol.includes('1HZ');
      if (selectedCategory === 'CRASH_BOOM') return sym.symbol.includes('BOOM') || sym.symbol.includes('CRASH') || sym.symbol.includes('JD') || sym.symbol.includes('stp');
      if (selectedCategory === 'VOL') return !sym.symbol.includes('1HZ') && !sym.symbol.includes('BOOM') && !sym.symbol.includes('CRASH') && !sym.symbol.includes('JD') && !sym.symbol.includes('stp');
      return true;
    });
  }, [activeSymbols, searchQuery, selectedCategory]);

  // Auto-subscribe to all displayed symbols so every card streams live data
  useEffect(() => {
    if (filteredSymbols.length > 0) {
      const symbolsToSubscribe = filteredSymbols.map((s) => s.symbol);
      subscribeAllVisible(symbolsToSubscribe);
    }
  }, [filteredSymbols, subscribeAllVisible]);

  return (
    <div className="space-y-6">
      {/* Hero Stats & Terminal Banner */}
      <div className="relative overflow-hidden glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80">
        {/* Glow backdrop decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-xs font-mono font-bold text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ALGORITHMIC DIGIT ANALYSIS TERMINAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Synthetic Indices <span className="shimmer-text">Live Matrix</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Real-time descriptive statistical frequency metrics for Deriv Volatility and 1-Second Indices. Track last-digit deviations, streaks, and variances from the 10% RNG baseline.
            </p>
          </div>

          {/* Quick Metrics HUD */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Synthetics</span>
                <span className="text-sm font-mono font-black text-slate-100">{activeSymbols.length} Symbols</span>
              </div>
            </div>

            <button
              onClick={() => {
                loadActiveSymbols();
                fetchUserAccounts();
              }}
              disabled={isInitializing}
              className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-2xl flex items-center gap-2 transition shadow-lg shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${isInitializing ? 'animate-spin' : ''}`} />
              <span>Sync Feeds</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto">
          {(
            [
              { id: 'ALL', label: 'All Markets' },
              { id: 'VOL', label: 'Volatility' },
              { id: '1S', label: '1-Sec Volatility' },
              { id: 'CRASH_BOOM', label: 'Crash / Boom / Jump' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search index (e.g. 1HZ, R_100, BOOM)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition"
          />
        </div>
      </div>

      {/* Grid of Symbols: 4 cols desktop, 2 cols tablet, 1 col mobile */}
      {filteredSymbols.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
          {filteredSymbols.map((sym) => (
            <SymbolCard
              key={sym.symbol}
              symbolInfo={sym}
              latestTick={latestTicks[sym.symbol]}
              ringBuffer={ringBuffers[sym.symbol]}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 space-y-2 border border-slate-800">
          <Activity className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold">No synthetic indices matched your search.</p>
          <p className="text-xs text-slate-500">Try adjusting your keyword filter or select &quot;All Markets&quot;.</p>
        </div>
      )}

      {/* Bottom Risk Notice */}
      <RiskBanner />
    </div>
  );
};
