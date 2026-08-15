import { create } from 'zustand';
import type { ActivePosition, SignalSummary } from '../types/deriv';
import { tradeService } from '../lib/tradeService';
import { JournalStore } from '../lib/db';
import { extractLastDigit } from '../lib/analysisEngine';

interface PositionState {
  openPositions: ActivePosition[];
  addPosition: (pos: ActivePosition, entrySignal?: SignalSummary) => Promise<void>;
  updatePosition: (contractId: number, data: any) => void;
}

export const usePositionStore = create<PositionState>((set, get) => ({
  openPositions: [],

  addPosition: async (pos: ActivePosition, entrySignal?: SignalSummary) => {
    set((state) => ({
      openPositions: [pos, ...state.openPositions],
    }));

    // Subscribe to live contract status updates
    try {
      await tradeService.subscribeOpenContract(pos.contractId, (updateData) => {
        get().updatePosition(pos.contractId, updateData);
      });
    } catch (err) {
      console.warn('[PositionStore] Failed to subscribe to contract update:', err);
    }
  },

  updatePosition: (contractId: number, updateData: any) => {
    const poc = updateData.proposal_open_contract;
    if (!poc) return;

    set((state) => {
      const updatedPositions = state.openPositions.map((pos) => {
        if (pos.contractId !== contractId) return pos;

        const isSold = Boolean(poc.is_sold || poc.status === 'won' || poc.status === 'lost');
        const profit = poc.profit ?? 0;
        const status = poc.status === 'won' ? 'won' : poc.status === 'lost' ? 'lost' : 'open';

        const updatedPos: ActivePosition = {
          ...pos,
          currentSpot: poc.current_spot,
          currentLastDigit: poc.current_spot ? extractLastDigit(poc.current_spot) : pos.currentLastDigit,
          profit,
          status,
        };

        // On settlement (contract finalized), write to IndexedDB trade journal
        if (isSold && pos.status === 'open') {
          const isWin = status === 'won' || profit > 0;
          const resultStr: 'WIN' | 'LOSS' = isWin ? 'WIN' : 'LOSS';

          const entrySignal = pos.entrySignalSnapshot;
          const alignedWithSignal = Boolean(
            entrySignal &&
            ((entrySignal.status === 'HOT' && (pos.contractType === 'DIGITMATCH' || pos.contractType === 'DIGITOVER')) ||
             (entrySignal.status === 'COLD' && (pos.contractType === 'DIGITDIFF' || pos.contractType === 'DIGITUNDER')))
          );

          JournalStore.addRecord({
            contractId: pos.contractId,
            symbol: pos.symbol,
            contractType: pos.contractType,
            selectedDigit: pos.barrier,
            stake: pos.stake,
            payout: pos.payout,
            profit,
            result: resultStr,
            timestamp: Date.now(),
            entrySignalStatus: entrySignal?.status,
            entrySignalDeviation: entrySignal?.deviation,
            alignedWithSignal,
          }).catch((err) => console.error('[JournalStore] Error writing settled contract:', err));
        }

        return updatedPos;
      });

      return { openPositions: updatedPositions };
    });
  },
}));
