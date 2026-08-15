import React from 'react';
import { Download, Trash2, CheckCircle, XCircle, FileSpreadsheet, Filter } from 'lucide-react';
import type { JournalRecord } from '../../types/deriv';

interface JournalTableProps {
  records: JournalRecord[];
  symbolFilter: string;
  onSymbolFilterChange: (val: string) => void;
  resultFilter: string;
  onResultFilterChange: (val: string) => void;
  onClearJournal: () => void;
  symbols: string[];
}

export const JournalTable: React.FC<JournalTableProps> = ({
  records,
  symbolFilter,
  onSymbolFilterChange,
  resultFilter,
  onResultFilterChange,
  onClearJournal,
  symbols,
}) => {
  const exportToCSV = () => {
    if (records.length === 0) return;

    const headers = ['ID', 'Date', 'Symbol', 'ContractType', 'BarrierDigit', 'Stake', 'Payout', 'Profit', 'Result', 'SignalAligned'];
    const rows = records.map((r) => [
      r.contractId,
      new Date(r.timestamp).toISOString(),
      r.symbol,
      r.contractType,
      r.selectedDigit,
      r.stake,
      r.payout,
      r.profit,
      r.result,
      r.alignedWithSignal ? 'YES' : 'NO',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `deriv_trade_journal_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800/80 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">Execution Journal Log</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Persisted offline in IndexedDB with entry signal tags</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Symbol Filter */}
          <select
            value={symbolFilter}
            onChange={(e) => onSymbolFilterChange(e.target.value)}
            className="bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
          >
            <option value="ALL">All Markets</option>
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Result Filter */}
          <select
            value={resultFilter}
            onChange={(e) => onResultFilterChange(e.target.value)}
            className="bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WIN">Won Trades Only</option>
            <option value="LOSS">Lost Trades Only</option>
          </select>

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-bold rounded-xl flex items-center gap-2 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Export CSV
          </button>

          {/* Clear Button */}
          <button
            onClick={onClearJournal}
            className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 text-xs font-mono font-bold rounded-xl flex items-center gap-2 transition shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800/80 uppercase tracking-wider text-[10px] font-bold">
            <tr>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Market</th>
              <th className="py-3 px-4">Contract</th>
              <th className="py-3 px-4">Barrier</th>
              <th className="py-3 px-4">Stake</th>
              <th className="py-3 px-4">Net Profit</th>
              <th className="py-3 px-4">Signal Aligned</th>
              <th className="py-3 px-4">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300 bg-slate-900/40">
            {records.length > 0 ? (
              records.map((r) => {
                const isWin = r.result === 'WIN';
                return (
                  <tr key={r.id || r.contractId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{r.symbol}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-bold">
                        {r.contractType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-amber-400 font-black text-sm">{r.selectedDigit}</td>
                    <td className="py-3 px-4 text-slate-200 font-bold">${r.stake.toFixed(2)}</td>
                    <td className={`py-3 px-4 font-black text-sm ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {r.profit >= 0 ? `+$${r.profit.toFixed(2)}` : `-$${Math.abs(r.profit).toFixed(2)}`}
                    </td>
                    <td className="py-3 px-4">
                      {r.alignedWithSignal ? (
                        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-lg border border-indigo-700/60 shadow-sm">
                          YES ({r.entrySignalStatus})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">NO</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isWin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40">
                          <CheckCircle className="w-3.5 h-3.5" />
                          WIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-rose-300 bg-rose-950/80 border border-rose-500/40">
                          <XCircle className="w-3.5 h-3.5" />
                          LOSS
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 font-sans space-y-2">
                  <p className="text-sm font-semibold">No journal records found.</p>
                  <p className="text-xs">Place and settle contracts in the Analysis terminal to populate your trade log.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
