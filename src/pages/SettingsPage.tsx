import React from 'react';
import { Settings, ShieldAlert, RotateCcw, CheckCircle, ShieldCheck, Sliders, DollarSign, Database, Key } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';

export const SettingsPage: React.FC = () => {
  const {
    defaultWindowSize,
    deviationThreshold,
    maxStakeGuardrail,
    allowStakeOverride,
    riskDisclaimerAcknowledged,
    setDefaultWindowSize,
    setDeviationThreshold,
    setMaxStakeGuardrail,
    setAllowStakeOverride,
    setRiskDisclaimerAcknowledged,
    resetSettings,
  } = useSettingsStore();

  const { appId, setAppId } = useAuthStore();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-2xl">
              <Settings className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Terminal Settings &amp; Guardrails</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure default statistical windows, risk guardrails, and Deriv API credentials
          </p>
        </div>

        <button
          onClick={resetSettings}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300 hover:text-white rounded-2xl flex items-center gap-2 transition shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Defaults
        </button>
      </div>

      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-6">
        {/* Default Window Size */}
        <div className="space-y-2.5 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-2 text-slate-200">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <label className="text-sm font-bold block">
              Default Analysis Window Size
            </label>
          </div>
          <p className="text-xs text-slate-400">
            Number of recent ticks used to calculate baseline frequency distributions when opening charts.
          </p>
          <div className="flex items-center gap-2.5 pt-1">
            {([100, 300, 500] as const).map((size) => (
              <button
                key={size}
                onClick={() => setDefaultWindowSize(size)}
                className={`px-4 py-2.5 text-xs font-mono font-bold rounded-2xl border transition-all ${
                  defaultWindowSize === size
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-950/50 scale-[1.02]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {size} Ticks Window
              </button>
            ))}
          </div>
        </div>

        {/* Deviation Threshold */}
        <div className="space-y-2.5 border-b border-slate-800/80 pb-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Statistical Deviation Threshold Sensitivity
            </label>
            <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-800">
              &plusmn;{deviationThreshold.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Percentage point variance from 10.0% expected baseline required to flag digits as Hot or Cold.
          </p>
          <input
            type="range"
            min="1.0"
            max="6.0"
            step="0.5"
            value={deviationThreshold}
            onChange={(e) => setDeviationThreshold(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>&plusmn;1.0% (High Sensitivity)</span>
            <span>&plusmn;3.0% (Standard)</span>
            <span>&plusmn;6.0% (Extreme Outliers Only)</span>
          </div>
        </div>

        {/* Max Stake Guardrail */}
        <div className="space-y-3 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-2 text-slate-200">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <label className="text-sm font-bold block">
              Client-Side Max-Stake Guardrail ($ USD)
            </label>
          </div>
          <p className="text-xs text-slate-400">
            Safety mechanism that blocks high-stake trade execution unless explicitly overridden.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="1000"
              value={maxStakeGuardrail}
              onChange={(e) => setMaxStakeGuardrail(Math.max(1, parseFloat(e.target.value) || 10))}
              className="bg-slate-900 border border-slate-800 text-sm font-mono font-bold text-white rounded-2xl px-4 py-2.5 w-36 focus:outline-none focus:border-cyan-500 ring-1 focus:ring-cyan-500/20"
            />
            <span className="text-xs font-mono text-slate-500">USD Max per contract</span>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-amber-300 font-medium cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={allowStakeOverride}
              onChange={(e) => setAllowStakeOverride(e.target.checked)}
              className="rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-amber-500"
            />
            <span>Allow manual stake override above guardrail limit on trade execution</span>
          </label>
        </div>

        {/* Deriv App ID */}
        <div className="space-y-2.5 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-2 text-slate-200">
            <Key className="w-4 h-4 text-cyan-400" />
            <label className="text-sm font-bold block">Deriv Application App ID</label>
          </div>
          <p className="text-xs text-slate-400">
            Registered App ID used for WebSocket endpoints and OAuth redirects. Default: 1089.
          </p>
          <input
            type="text"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs font-mono text-white rounded-2xl px-4 py-2.5 w-48 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Risk Disclaimer Acknowledgment */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Risk Disclosure &amp; Compliance Status
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {riskDisclaimerAcknowledged
                  ? 'Active — You have acknowledged that synthetic indices use audited RNG'
                  : 'Pending explicit user acknowledgment'}
              </p>
            </div>

            <button
              onClick={() => setRiskDisclaimerAcknowledged(!riskDisclaimerAcknowledged)}
              className={`px-4 py-2.5 text-xs font-bold rounded-2xl border transition-all flex items-center gap-2 ${
                riskDisclaimerAcknowledged
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md'
                  : 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md'
              }`}
            >
              {riskDisclaimerAcknowledged ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Acknowledged
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  Review &amp; Accept
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
