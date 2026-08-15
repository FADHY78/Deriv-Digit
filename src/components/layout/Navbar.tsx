import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Activity, BarChart3, Clock, BookOpen, Settings, LogIn, LogOut, Wallet, ShieldAlert, ChevronDown, Check, Zap, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useMarketStore } from '../../store/useMarketStore';

export const Navbar: React.FC = () => {
  const {
    isLoggedIn,
    accountType,
    accountId,
    balance,
    currency,
    availableOAuthAccounts,
    logout,
    selectOAuthAccount,
  } = useAuthStore();
  const { connectionState, selectedSymbol } = useMarketStore();
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const isDemo = accountType === 'demo';

  const getConnectionBadge = () => {
    switch (connectionState) {
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/30 rounded-full text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="font-semibold tracking-wide">LIVE FEED</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/60 border border-amber-500/30 rounded-full text-[11px] font-mono text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>CONNECTING</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-950/60 border border-rose-500/30 rounded-full text-[11px] font-mono text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>OFFLINE</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      {/* Sleek Demo / Real Account Banner */}
      <div
        className={`w-full text-center text-[11px] font-bold py-1 px-4 tracking-wider flex items-center justify-center gap-2 transition-all ${
          isDemo
            ? 'bg-gradient-to-r from-emerald-950/90 via-emerald-900/60 to-emerald-950/90 text-emerald-300 border-b border-emerald-500/20'
            : 'bg-gradient-to-r from-rose-950/90 via-rose-900/70 to-rose-950/90 text-rose-200 border-b border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
        }`}
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        <span className="font-mono uppercase">
          {isDemo
            ? '• VIRTUAL PRACTICE ENVIRONMENT (DEMO) — NO REAL FUNDS AT RISK •'
            : '⚠️ LIVE CAPITAL ACTIVE (REAL ACCOUNT) — DERIVATIVE CONTRACTS INVOLVE HIGH RISK'}
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo with Glow */}
        <Link to="/dashboard" className="flex items-center gap-3 text-slate-100 group">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition duration-300" />
            <div className="relative p-2.5 bg-slate-900 border border-cyan-500/40 rounded-xl flex items-center justify-center text-cyan-400 group-hover:text-white transition">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                DERIV DIGIT
              </span>
              <span className="px-1.5 py-0.2 bg-cyan-500/10 border border-cyan-500/30 rounded text-[10px] font-mono font-bold text-cyan-400">
                PRO
              </span>
            </div>
            <span className="text-[10px] block text-slate-400 font-mono tracking-wider -mt-0.5">
              QUANTITATIVE ANALYZER
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-1.5 shadow-inner">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`
            }
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Dashboard
          </NavLink>

          <NavLink
            to={`/analysis/${selectedSymbol || 'R_100'}`}
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`
            }
          >
            <Zap className="w-3.5 h-3.5" />
            Analysis
          </NavLink>

          <NavLink
            to="/positions"
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`
            }
          >
            <Clock className="w-3.5 h-3.5" />
            Positions
          </NavLink>

          <NavLink
            to="/journal"
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`
            }
          >
            <BookOpen className="w-3.5 h-3.5" />
            Journal
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`
            }
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </NavLink>
        </nav>

        {/* Right Status & Account Bar */}
        <div className="flex items-center gap-3">
          {/* Connection Status Badge */}
          {getConnectionBadge()}

          {/* Account Balance & Dropdown */}
          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                className="flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl text-xs transition shadow-sm"
              >
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isDemo
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isDemo ? 'DEMO' : 'REAL'}
                    </span>
                    <span className="font-mono text-slate-300 text-[11px] font-semibold">{accountId}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Wallet className="w-3 h-3 text-emerald-400" />
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{currency}</span>
                  </div>
                </div>
                {availableOAuthAccounts && availableOAuthAccounts.length > 1 ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : null}
              </button>

              {/* OAuth Account Switcher Dropdown */}
              {accountDropdownOpen && availableOAuthAccounts && availableOAuthAccounts.length > 0 ? (
                <div className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl p-2 border border-slate-800 shadow-2xl z-50 animate-in fade-in zoom-in duration-150">
                  <div className="px-2 py-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    Switch Connected Account
                  </div>
                  <div className="space-y-1 mt-1">
                    {availableOAuthAccounts.map((acct) => (
                      <button
                        key={acct.accountId}
                        onClick={() => {
                          selectOAuthAccount(acct);
                          setAccountDropdownOpen(false);
                        }}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between text-xs transition ${
                          acct.accountId === accountId
                            ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-300'
                            : 'hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              acct.isVirtual
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {acct.isVirtual ? 'DEMO' : 'REAL'}
                          </span>
                          <span className="font-mono font-semibold">{acct.accountId}</span>
                        </div>
                        {acct.accountId === accountId ? (
                          <Check className="w-3.5 h-3.5 text-cyan-400" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-800/80 mt-2 pt-2">
                    <button
                      onClick={() => {
                        logout();
                        setAccountDropdownOpen(false);
                      }}
                      className="w-full p-2 text-rose-400 hover:bg-rose-950/40 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Disconnect Session
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-lg shadow-rose-950/50 transform active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              Connect Deriv
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
