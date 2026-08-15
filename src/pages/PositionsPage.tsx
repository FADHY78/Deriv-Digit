import React from 'react';
import { Clock, Layers } from 'lucide-react';
import { usePositionStore } from '../store/usePositionStore';
import { PositionCard } from '../components/positions/PositionCard';
import { RiskBanner } from '../components/common/RiskBanner';

export const PositionsPage: React.FC = () => {
  const { openPositions } = usePositionStore();

  const activePositions = openPositions.filter((p) => p.status === 'open');
  const settledPositions = openPositions.filter((p) => p.status !== 'open');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-sky-400" />
            Open &amp; Recent Contracts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time streaming P/L updates subscribed via Deriv WebSocket
          </p>
        </div>

        <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
          Active: <span className="text-emerald-400 font-bold">{activePositions.length}</span>
        </div>
      </div>

      {/* Active Positions */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Active Contracts ({activePositions.length})
        </h2>

        {activePositions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePositions.map((pos) => (
              <PositionCard key={pos.contractId} position={pos} />
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-8 text-center text-xs text-slate-500 border border-slate-800">
            No active open contracts right now. Open a contract from the Analysis view.
          </div>
        )}
      </div>

      {/* Settled Positions */}
      {settledPositions.length > 0 ? (
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-bold text-slate-300">Recent Settled Contracts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settledPositions.slice(0, 10).map((pos) => (
              <PositionCard key={pos.contractId} position={pos} />
            ))}
          </div>
        </div>
      ) : null}

      <RiskBanner />
    </div>
  );
};
