import React, { useState, useEffect } from 'react';
import { DollarSign, ShieldAlert, ArrowUpRight, CheckCircle2, RefreshCw, Zap, Sliders, AlertTriangle } from 'lucide-react';
import type { ContractType, ContractProposal, SignalSummary } from '../../types/deriv';
import { tradeService } from '../../lib/tradeService';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { usePositionStore } from '../../store/usePositionStore';

interface TradePanelProps {
  symbol: string;
  activeSignals?: SignalSummary[];
}

export const TradePanel: React.FC<TradePanelProps> = ({ symbol, activeSignals }) => {
  const { isLoggedIn, currency } = useAuthStore();
  const { maxStakeGuardrail, allowStakeOverride, riskDisclaimerAcknowledged } = useSettingsStore();
  const { addPosition } = usePositionStore();

  const [contractType, setContractType] = useState<ContractType>('DIGITMATCH');
  const [selectedDigit, setSelectedDigit] = useState<number>(5);
  const [stake, setStake] = useState<number>(10);
  const [duration, setDuration] = useState<number>(5); // 5 ticks

  const [proposal, setProposal] = useState<ContractProposal | null>(null);
  const [isFetchingProposal, setIsFetchingProposal] = useState<boolean>(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isExecutingBuy, setIsExecutingBuy] = useState<boolean>(false);
  const [buySuccessMsg, setBuySuccessMsg] = useState<string | null>(null);

  const isOverGuardrail = stake > maxStakeGuardrail;

  // Auto fetch proposal quote when parameters change
  useEffect(() => {
    let isCancelled = false;

    const fetchQuote = async () => {
      setIsFetchingProposal(true);
      setProposalError(null);
      try {
        const prop = await tradeService.getProposal(
          {
            symbol,
            contractType,
            stake,
            duration,
            barrier: selectedDigit,
          },
          currency
        );
        if (!isCancelled) {
          setProposal(prop);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setProposalError(err.message || 'Failed to quote contract');
          setProposal(null);
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingProposal(false);
        }
      }
    };

    fetchQuote();

    return () => {
      isCancelled = true;
    };
  }, [symbol, contractType, selectedDigit, stake, duration, currency]);

  const handleBuyClick = () => {
    if (!isLoggedIn) {
      alert('Please log in with your Deriv account (via OAuth or PAT) to place trades.');
      return;
    }
    if (!riskDisclaimerAcknowledged) {
      alert('Please accept the risk disclaimer in settings before executing trades.');
      return;
    }
    if (!proposal) return;
    setShowConfirmModal(true);
  };

  const handleConfirmBuy = async () => {
    if (!proposal) return;
    setIsExecutingBuy(true);
    setBuySuccessMsg(null);

    try {
      const buyRes = await tradeService.buyContract(
        proposal.id,
        proposal.askPrice,
        maxStakeGuardrail,
        allowStakeOverride
      );

      const entrySignal = activeSignals?.find((s) => s.digit === selectedDigit);

      // Register position in store
      await addPosition(
        {
          contractId: buyRes.contractId,
          symbol,
          contractType,
          barrier: selectedDigit,
          stake: proposal.askPrice,
          payout: proposal.payout,
          buyPrice: buyRes.buyPrice,
          purchaseEpoch: Math.floor(Date.now() / 1000),
          status: 'open',
          profit: 0,
          entrySignalSnapshot: entrySignal
            ? { deviation: entrySignal.deviation, status: entrySignal.status }
            : undefined,
        },
        entrySignal
      );

      setBuySuccessMsg(`Contract #${buyRes.contractId} executed!`);
      setShowConfirmModal(false);
      setTimeout(() => setBuySuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Trade Execution Failed: ${err.message}`);
    } finally {
      setIsExecutingBuy(false);
    }
  };

  const quickStakes = [1, 5, 10, 25, 50];

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800/80 space-y-5 relative overflow-hidden">
      {/* Background Subtle Accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">Trade Execution Terminal</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Live Deriv order execution with risk guardrails</p>
        </div>

        {buySuccessMsg ? (
          <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/50 px-3 py-1 rounded-xl shadow-lg shadow-emerald-950/50 animate-pulse">
            ✓ {buySuccessMsg}
          </span>
        ) : null}
      </div>

      {/* Contract Type Selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
          Contract Mechanism
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { type: 'DIGITMATCH', label: 'MATCHES', desc: 'Last digit = target' },
              { type: 'DIGITDIFF', label: 'DIFFERS', desc: 'Last digit ≠ target' },
              { type: 'DIGITOVER', label: 'OVER', desc: 'Last digit > target' },
              { type: 'DIGITUNDER', label: 'UNDER', desc: 'Last digit < target' },
            ] as const
          ).map((item) => (
            <button
              key={item.type}
              onClick={() => setContractType(item.type)}
              className={`p-3 rounded-2xl border text-left transition-all duration-200 ${
                contractType === item.type
                  ? 'bg-gradient-to-br from-cyan-950/90 via-slate-900 to-slate-950 border-cyan-400 text-white shadow-lg shadow-cyan-950/40 scale-[1.02]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-mono font-bold text-cyan-300">{item.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Target Barrier Digit Selector (0-9) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-mono font-bold text-slate-300 uppercase tracking-wider">
            Target Barrier Digit
          </label>
          <span className="font-mono text-cyan-400 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
            Selected: {selectedDigit}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, digit) => (
            <button
              key={digit}
              onClick={() => setSelectedDigit(digit)}
              className={`py-3 rounded-2xl font-mono font-black text-base border transition-all duration-200 ${
                selectedDigit === digit
                  ? 'bg-gradient-to-b from-cyan-500 to-blue-600 text-white border-cyan-300 shadow-lg shadow-cyan-950/50 scale-105'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              {digit}
            </button>
          ))}
        </div>
      </div>

      {/* Stake Input & Quick Select Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-mono font-bold text-slate-300 uppercase tracking-wider">
            Stake Amount ({currency})
          </label>
          <span className="text-[11px] font-mono text-slate-500">Max Guardrail: ${maxStakeGuardrail}</span>
        </div>

        <div className="relative">
          <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="number"
            min="0.5"
            step="1"
            value={stake}
            onChange={(e) => setStake(Math.max(0.5, parseFloat(e.target.value) || 0))}
            className={`w-full bg-slate-900/90 border rounded-2xl pl-10 pr-4 py-3 text-sm font-mono font-bold text-white focus:outline-none transition ${
              isOverGuardrail
                ? 'border-amber-500 focus:border-amber-400 ring-1 ring-amber-500/30'
                : 'border-slate-800 focus:border-cyan-500 ring-1 ring-cyan-500/20'
            }`}
          />
        </div>

        {/* Quick Stake Buttons */}
        <div className="flex items-center gap-1.5 pt-1">
          {quickStakes.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setStake(amt)}
              className={`flex-1 py-1.5 rounded-xl border font-mono text-xs font-semibold transition ${
                stake === amt
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>

        {isOverGuardrail ? (
          <div className="flex items-center gap-2 text-[11px] font-mono text-amber-400 bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {allowStakeOverride
                ? 'Stake exceeds guardrail. Override permitted by settings.'
                : 'Stake exceeds configured guardrail ($' + maxStakeGuardrail + '). Enable override in settings.'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Duration Slider (1 - 10 ticks) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-mono font-bold text-slate-300 uppercase tracking-wider">
            Duration (Ticks)
          </label>
          <span className="font-mono text-cyan-400 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
            {duration} {duration === 1 ? 'Tick' : 'Ticks'}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>1 Tick</span>
          <span>5 Ticks</span>
          <span>10 Ticks</span>
        </div>
      </div>

      {/* Live Payout Quote Card & Purchase CTA */}
      <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/80 rounded-2xl p-4.5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <span>Live Deriv Payout Quote</span>
            {isFetchingProposal ? <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" /> : null}
          </span>
          {proposal ? (
            <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded text-[11px] font-mono font-bold text-emerald-400">
              +{(((proposal.payout - proposal.askPrice) / proposal.askPrice) * 100).toFixed(1)}% Return
            </span>
          ) : null}
        </div>

        {proposalError ? (
          <div className="text-xs text-rose-400 font-mono">{proposalError}</div>
        ) : proposal ? (
          <div className="flex items-baseline justify-between border-t border-slate-800/80 pt-3">
            <span className="text-xs text-slate-400">Estimated Payout:</span>
            <span className="text-2xl font-mono font-black text-emerald-400">
              ${proposal.payout.toFixed(2)}
            </span>
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-mono">Fetching Deriv API quote...</div>
        )}

        <button
          onClick={handleBuyClick}
          disabled={!proposal || isFetchingProposal || (isOverGuardrail && !allowStakeOverride)}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2.5 transition-all transform active:scale-95"
        >
          <span>Purchase Contract</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && proposal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full glass-panel border border-slate-700/80 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="p-2.5 bg-emerald-500/10 rounded-2xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Contract Order</h3>
                <p className="text-xs text-slate-400">Review parameters before firing WebSocket buy</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Market Symbol:</span>
                <span className="font-bold text-white">{symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contract Type:</span>
                <span className="font-bold text-cyan-400">{contractType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Barrier Digit:</span>
                <span className="font-bold text-amber-400">{selectedDigit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-bold text-white">{duration} Ticks</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2.5">
                <span className="text-slate-500">Stake Amount:</span>
                <span className="font-bold text-white">${proposal.askPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Potential Payout:</span>
                <span className="font-bold text-emerald-400 text-sm">${proposal.payout.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBuy}
                disabled={isExecutingBuy}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-2xl transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
              >
                {isExecutingBuy ? 'Executing Order...' : 'Confirm & Execute'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
