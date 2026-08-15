import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, ExternalLink, HelpCircle, UserCheck, ShieldCheck, Zap, ArrowRight, Play, Globe, Info, Copy } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { derivSocket } from '../lib/derivSocket';
import { getDerivOAuthUrl, parseOAuthResponse } from '../lib/derivOAuth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    token,
    rememberMe,
    appId,
    availableOAuthAccounts,
    setToken,
    setAppId,
    setAccountDetails,
    setAvailableOAuthAccounts,
    selectOAuthAccount,
  } = useAuthStore();

  const [inputToken, setInputToken] = useState(token);
  const [inputAppId, setInputAppId] = useState(appId);
  const [remember, setRemember] = useState(rememberMe);
  const [activeTab, setActiveTab] = useState<'TOKEN' | 'DEMO_SANDBOX' | 'OAUTH'>('TOKEN');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Automatically process incoming Deriv OAuth redirect parameters (if returning from registered OAuth)
  useEffect(() => {
    const oauthAccounts = parseOAuthResponse(searchParams);

    if (oauthAccounts.length > 0) {
      setIsLoading(true);
      setErrorMsg(null);

      const primaryAccount = oauthAccounts[0];

      (async () => {
        try {
          await derivSocket.connect(inputAppId);
          const res = await derivSocket.authorize(primaryAccount.token);

          if (res.error) {
            throw new Error(res.error.message || 'OAuth Authorization failed');
          }

          const authInfo = res.authorize;
          const isRealAccount = Boolean(authInfo.is_virtual === 0);

          setToken(primaryAccount.token, true);
          setAvailableOAuthAccounts(oauthAccounts);
          setAccountDetails({
            accountId: authInfo.loginid,
            accountType: isRealAccount ? 'real' : 'demo',
            balance: authInfo.balance ?? 10000,
            currency: authInfo.currency ?? primaryAccount.currency ?? 'USD',
          });

          window.history.replaceState({}, document.title, window.location.pathname);
          navigate('/dashboard');
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to authorize OAuth token with Deriv');
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [searchParams, inputAppId, setToken, setAvailableOAuthAccounts, setAccountDetails, navigate]);

  // Method 1: Connect via Deriv API Token (Works 100% on localhost)
  const handleTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) {
      setErrorMsg('Please paste your Deriv API Token.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (inputAppId !== appId) {
        setAppId(inputAppId);
      }

      await derivSocket.connect(inputAppId);
      const res = await derivSocket.authorize(inputToken.trim());

      if (res.error) {
        throw new Error(res.error.message || 'Authentication failed. Please verify your token.');
      }

      const authInfo = res.authorize;
      const isRealAccount = Boolean(authInfo.is_virtual === 0);

      setToken(inputToken.trim(), remember);
      setAccountDetails({
        accountId: authInfo.loginid,
        accountType: isRealAccount ? 'real' : 'demo',
        balance: authInfo.balance ?? 10000,
        currency: authInfo.currency ?? 'USD',
      });

      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect. Please check your Deriv API Token.');
    } finally {
      setIsLoading(false);
    }
  };

  // Method 2: Instant Virtual Sandbox Mode (No token needed, uses live real-time Deriv ticks)
  const handleInstantDemoMode = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await derivSocket.connect(inputAppId);
      // Setup demo guest session with live public feeds
      setToken('DEMO_SANDBOX_TOKEN', false);
      setAccountDetails({
        accountId: 'VRTC-DEMO-GUEST',
        accountType: 'demo',
        balance: 10000.0,
        currency: 'USD',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg('Failed to connect to Deriv WebSocket feed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Method 3: Deriv OAuth (requires registered redirect URI for non-localhost or custom registered App ID)
  const handleOAuthLogin = () => {
    if (inputAppId !== appId) {
      setAppId(inputAppId);
    }
    const oauthUrl = getDerivOAuthUrl(inputAppId);
    window.location.href = oauthUrl;
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-4 space-y-6">
      {/* Top Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex p-3.5 bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-2xl text-cyan-400 mb-1 shadow-lg shadow-cyan-950/40">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Deriv Terminal Authentication
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Choose your preferred authentication method to connect live WebSocket market streams and digit analyzer.
          </p>
        </div>

        {errorMsg ? (
          <div className="p-4 bg-rose-950/80 border border-rose-700 text-rose-200 rounded-2xl text-xs flex items-start gap-3 shadow-lg shadow-rose-950/40">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Connection Notice</span>
              <span className="text-slate-300">{errorMsg}</span>
            </div>
          </div>
        ) : null}

        {/* Method Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl relative z-10 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('TOKEN')}
            className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === 'TOKEN'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/50 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔑 API Token (Localhost)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DEMO_SANDBOX')}
            className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === 'DEMO_SANDBOX'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ 1-Click Sandbox
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OAUTH')}
            className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === 'OAUTH'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-rose-950/50 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🌐 Deriv OAuth
          </button>
        </div>

        {/* --- TAB 1: API TOKEN (RECOMMENDED FOR LOCALHOST) --- */}
        {activeTab === 'TOKEN' && (
          <form onSubmit={handleTokenLogin} className="space-y-5 relative z-10 animate-in fade-in duration-200">
            {/* Step-by-step Helper Box */}
            <div className="bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center justify-between text-xs text-cyan-300 font-bold font-mono">
                <span className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-cyan-400" />
                  How to get your Deriv API Token (Takes 10 seconds):
                </span>
                <a
                  href="https://app.deriv.com/account/api-token"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg text-[11px] text-cyan-200 flex items-center gap-1 transition"
                >
                  <span>Open Deriv API Tokens</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside font-mono">
                <li>Go to your Deriv account &gt; <strong>Settings &gt; API Token</strong></li>
                <li>Check <strong>Read</strong> and <strong>Trade</strong> permissions</li>
                <li>Click <strong>Create</strong>, copy the generated token, and paste it below</li>
              </ol>
            </div>

            {/* Token Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
                Deriv API Token
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  placeholder="e.g. a1-XyZ987654321..."
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 ring-1 focus:ring-cyan-500/20 transition"
                />
              </div>
            </div>

            {/* App ID Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Deriv App ID
                </label>
                <span className="text-[11px] font-mono text-slate-500">Default: 1089 (Deriv Public Websocket)</span>
              </div>
              <input
                type="text"
                value={inputAppId}
                onChange={(e) => setInputAppId(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* Remember Session Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="mt-0.5 rounded border-slate-800 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
              />
              <div>
                <span className="font-semibold text-white">Remember session on this device</span>
                <p className="text-[11px] text-slate-500">
                  {remember
                    ? '⚠️ Token saved in browser localStorage.'
                    : 'Token saved in sessionStorage (cleared when closing tab).'}
                </p>
              </div>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-sm rounded-2xl transition shadow-xl shadow-cyan-950/60 flex items-center justify-center gap-2.5 cursor-pointer transform active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>{isLoading ? 'Connecting to Deriv WebSocket...' : 'Authenticate & Open Terminal'}</span>
            </button>
          </form>
        )}

        {/* --- TAB 2: INSTANT SANDBOX DEMO (1-CLICK TEST) --- */}
        {activeTab === 'DEMO_SANDBOX' && (
          <div className="space-y-5 relative z-10 animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-sm">
                <Play className="w-5 h-5" />
                <span>Instant Sandbox Practice Terminal</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Want to test the digit analyzer right away without logging into Deriv?
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside font-mono">
                <li>Streams 100% live, real-time tick data directly from Deriv Volatility indices</li>
                <li>Pre-loaded with $10,000.00 virtual practice balance</li>
                <li>Full access to digit frequency charts, streak trackers, and simulation orders</li>
              </ul>
            </div>

            <button
              onClick={handleInstantDemoMode}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2.5 transition transform active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>{isLoading ? 'Connecting Live Stream...' : 'Launch Instant Live Sandbox'}</span>
            </button>
          </div>
        )}

        {/* --- TAB 3: DERIV OAUTH (EXPLAINING LOCALHOST REDIRECTS) --- */}
        {activeTab === 'OAUTH' && (
          <div className="space-y-5 relative z-10 animate-in fade-in duration-200">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                <Globe className="w-4 h-4 text-red-500" />
                <span>Why Deriv OAuth requires a registered domain:</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Deriv’s official OAuth security policy blocks redirecting to generic <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded">http://localhost:5173</code> unless you register your own free custom App ID on{' '}
                <a
                  href="https://api.deriv.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 underline"
                >
                  api.deriv.com
                </a>{' '}
                and whitelist your localhost or tunnel URL.
              </p>

              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] font-mono text-slate-300 space-y-1">
                <div className="text-cyan-300 font-bold">Recommended for Localhost:</div>
                <div>Use the <strong>API Token tab</strong> above to log in instantly without domain restrictions!</div>
              </div>
            </div>

            <button
              onClick={handleOAuthLogin}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-red-950/60 flex items-center justify-center gap-3 transition transform active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{isLoading ? 'Authorizing...' : 'Try Deriv OAuth Portal'}</span>
            </button>
          </div>
        )}

        {/* Existing Available OAuth Accounts Switcher */}
        {availableOAuthAccounts && availableOAuthAccounts.length > 0 ? (
          <div className="border-t border-slate-800/80 pt-4 space-y-2.5">
            <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Saved Accounts ({availableOAuthAccounts.length})
            </label>
            <div className="space-y-2">
              {availableOAuthAccounts.map((acct) => (
                <button
                  key={acct.accountId}
                  onClick={() => selectOAuthAccount(acct)}
                  className="w-full p-3 bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 rounded-2xl text-left flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        acct.isVirtual
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {acct.isVirtual ? 'DEMO' : 'REAL'}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">{acct.accountId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span>{acct.currency}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
