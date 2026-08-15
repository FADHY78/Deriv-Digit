import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Activity, ChevronDown, ArrowLeft, Zap, Sparkles } from 'lucide-react';
import { useMarketStore } from '../store/useMarketStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  computeFrequencyTable,
  computeDeviationScores,
  computeStreaks,
  computeSignals,
} from '../lib/analysisEngine';
import { DigitHistogram } from '../components/analysis/DigitHistogram';
import { StreakPanel } from '../components/analysis/StreakPanel';
import { SignalPanel } from '../components/analysis/SignalPanel';
import { TradePanel } from '../components/analysis/TradePanel';

export const AnalysisPage: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();

  const {
    activeSymbols,
    latestTicks,
    ringBuffers,
    subscribeSymbol,
    setSelectedSymbol,
  } = useMarketStore();

  const { defaultWindowSize, deviationThreshold } = useSettingsStore();

  const [windowSize, setWindowSize] = useState<100 | 300 | 500>(defaultWindowSize);

  const currentSymbol = symbol || 'R_100';

  useEffect(() => {
    setSelectedSymbol(currentSymbol);
    subscribeSymbol(currentSymbol);
  }, [currentSymbol, setSelectedSymbol, subscribeSymbol]);

  const activeSymbolInfo = activeSymbols.find((s) => s.symbol === currentSymbol) || {
    symbol: currentSymbol,
    displayName: currentSymbol,
    pipSize: 2,
  };

  const buffer = ringBuffers[currentSymbol];
  const tickList = useMemo(() => (buffer ? buffer.toArray() : []), [buffer, latestTicks[currentSymbol]]);

  // Compute Statistical Analysis
  const frequencyTable = useMemo(
    () => computeFrequencyTable(tickList, windowSize),
    [tickList, windowSize]
  );
  const deviationScores = useMemo(
    () => computeDeviationScores(frequencyTable, deviationThreshold),
    [frequencyTable, deviationThreshold]
  );
  const streaks = useMemo(() => computeStreaks(tickList), [tickList]);
  const signals = useMemo(
    () => computeSignals(deviationScores, streaks, deviationThreshold),
    [deviationScores, streaks, deviationThreshold]
  );

  const latestTick = latestTicks[currentSymbol];
  const currentDigit = latestTick?.lastDigit !== undefined ? latestTick.lastDigit : '-';
  const currentQuote = latestTick?.quote.toFixed(activeSymbolInfo.pipSize) ?? '---.--';

  return (
    <div className="space-y-6">
      {/* Top Header & Symbol Switcher Bar */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          <Link
            to="/dashboard"
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-2xl transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white">{activeSymbolInfo.displayName}</h1>
              {/* Symbol Selector Dropdown */}
              <div className="relative">
                <select
                  value={currentSymbol}
                  onChange={(e) => navigate(`/analysis/${e.target.value}`)}
                  className="appearance-none bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 text-xs font-mono font-bold text-cyan-300 rounded-xl pl-3 pr-8 py-1.5 focus:outline-none cursor-pointer transition shadow-sm"
                >
                  {activeSymbols.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.displayName} ({s.symbol})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">High-frequency tick stream and digit distribution terminal</p>
          </div>
        </div>

        {/* Live Ticker Bar with Glowing Digit */}
        <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-2.5 sm:px-5 relative z-10 shadow-inner">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-mono font-semibold">Live Quote</span>
            <span className="font-mono text-base sm:text-lg font-black text-white tracking-tight">{currentQuote}</span>
          </div>

          <div className="w-px h-9 bg-slate-800" />

          <div className="flex items-center gap-2">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-mono font-semibold">Last Digit</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-950/40 border border-amber-500/50 text-amber-300 flex items-center justify-center font-mono font-black text-lg shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                {currentDigit}
              </div>
            </div>
          </div>

          <div className="w-px h-9 bg-slate-800" />

          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-mono font-semibold">Buffer Sample</span>
            <span className="font-mono text-xs font-bold text-cyan-400 block mt-1">{tickList.length} Ticks</span>
          </div>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Digit Frequency Histogram + Streak Tracker + Signal Matrix */}
        <div className="lg:col-span-2 space-y-6">
          <DigitHistogram
            frequencyTable={frequencyTable}
            windowSize={windowSize}
            onWindowSizeChange={setWindowSize}
            deviationThreshold={deviationThreshold}
          />

          <StreakPanel streaks={streaks} />

          <SignalPanel signals={signals} deviationThreshold={deviationThreshold} />
        </div>

        {/* Right 1 Col: Execution Trade Panel */}
        <div className="lg:col-span-1">
          <TradePanel symbol={currentSymbol} activeSignals={signals} />
        </div>
      </div>
    </div>
  );
};
