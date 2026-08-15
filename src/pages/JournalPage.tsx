import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { JournalRecord } from '../types/deriv';
import { JournalStore } from '../lib/db';
import { JournalAnalytics } from '../components/journal/JournalAnalytics';
import { JournalTable } from '../components/journal/JournalTable';
import { RiskBanner } from '../components/common/RiskBanner';

export const JournalPage: React.FC = () => {
  const [records, setRecords] = useState<JournalRecord[]>([]);
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [resultFilter, setResultFilter] = useState<string>('ALL');

  const [analytics, setAnalytics] = useState({
    totalTrades: 0,
    totalWins: 0,
    totalLosses: 0,
    overallWinRate: 0,
    totalNetProfit: 0,
    signalAlignedTradesCount: 0,
    signalAlignedWinRate: 0,
    nonSignalWinRate: 0,
  });

  const loadJournalData = async () => {
    try {
      const summary = await JournalStore.getAnalyticsSummary();
      setAnalytics(summary);

      const filtered = await JournalStore.getFilteredRecords({
        symbol: symbolFilter,
        result: resultFilter as any,
      });
      setRecords(filtered);
    } catch (err) {
      console.error('[JournalPage] Error loading IndexedDB data:', err);
    }
  };

  useEffect(() => {
    loadJournalData();
  }, [symbolFilter, resultFilter]);

  const handleClearJournal = async () => {
    if (window.confirm('Are you sure you want to clear your trade journal history from IndexedDB?')) {
      await JournalStore.clearAllRecords();
      await loadJournalData();
    }
  };

  const symbolsList = Array.from(new Set(records.map((r) => r.symbol)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-sky-400" />
            Empirical Strategy Journal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Offline IndexedDB journal measuring empirical win rate vs. signal alignment
          </p>
        </div>
      </div>

      {/* Analytics Summary */}
      <JournalAnalytics analytics={analytics} />

      {/* Journal Table */}
      <JournalTable
        records={records}
        symbolFilter={symbolFilter}
        onSymbolFilterChange={setSymbolFilter}
        resultFilter={resultFilter}
        onResultFilterChange={setResultFilter}
        onClearJournal={handleClearJournal}
        symbols={symbolsList}
      />

      <RiskBanner />
    </div>
  );
};
