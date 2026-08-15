import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, ExternalLink, HelpCircle, UserCheck, ShieldCheck, Zap, ArrowRight, Play, Globe, Info, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { derivSocket } from '../lib/derivSocket';
import { getDerivOAuthUrl, parseOAuthResponse, REGISTERED_APP_ID } from '../lib/derivOAuth';

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
  const [inputAppId, setInputAppId] = useState(appId || REGISTERED_APP_ID);
  const [remember, setRemember] = useState(rememberMe);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTokenLogin, setShowTokenLogin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Automatically process incoming Deriv OAuth redirect parameters
  useEffect(() => {
    const oauthAccounts = parseOAuthResponse(searchParams);

    if (oauthAccounts.length > 0) {
      setIsLoading(true);
      setErrorMsg(null);

      const primaryAccount = oauthAccounts[0];

      (async () => {
        try {
          await derivSocket.connect();
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
  }, [searchParams, setToken, setAvailableOAuthAccounts, setAccountDetails, navigate]);

  // Primary Action: 1-Click "Continue with Deriv" (like Sign in with Google)
  const handleDerivOAuthLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (inputAppId !== appId) {
        setAppId(inputAppId);
      }
      const oauthUrl = await getDerivOAuthUrl(inputAppId);
      window.location.href = oauthUrl;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize Deriv login');
      setIsLoading(false);
    }
  };

  // Alternative Method: Instant Virtual Sandbox
  const handleInstantDemoMode = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await derivSocket.connect();
      setToken('DEMO_SANDBOX_TOKEN', false);
      setAccountDetails({
        accountId: 'VRTC-DEMO-GUEST',
        accountType: 'demo',
        balance: 10000.0,
        currency: 'USD',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg('Failed to connect to Deriv live stream.');
    } finally {
      setIsLoading(false);
    }
  };

  // Alternative Method: API Token Login
  const handleTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) {
      setErrorMsg('Please paste your Deriv API Token.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await derivSocket.connect();
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

  return (
    <div className="max-w-md mx-auto my-12 px-4 space-y-6">
      {/* Login Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-2xl space-y-6 relative overflow-hidden text-center">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-b from-red-600/20 to-rose-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Icon & Heading */}
        <div className="space-y-3 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-red-600 to-rose-500 rounded-2xl shadow-xl shadow-red-950/60 ring-4 ring-red-500/20 mb-1">
            <span className="text-white font-black text-2xl tracking-tighter">D</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome to Deriv Digit
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Real-time digit frequency analytics, streak detection, and high-speed execution terminal.
          </p>
        </div>

        {errorMsg ? (
          <div className="p-3.5 bg-rose-950/80 border border-rose-700 text-rose-200 rounded-2xl text-xs flex items-start gap-2.5 shadow-lg shadow-rose-950/40 text-left">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Authentication Notice</span>
              <span className="text-slate-300">{errorMsg}</span>
            </div>
          </div>
        ) : null}

        {/* --- MAIN ACTION: "CONTINUE WITH DERIV" (LIKE SIGN IN WITH GOOGLE) --- */}
        <div className="space-y-3 relative z-10 pt-2">
          <button
            onClick={handleDerivOAuthLogin}
            disabled={isLoading}
            className="w-full py-4 px-5 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-red-950/70 border border-red-400/30 flex items-center justify-center gap-3.5 transition duration-200 cursor-pointer group"
          >
            {/* Deriv Brand Icon */}
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
              <span className="text-red-600 font-black text-xs">d</span>
            </div>
            <span>{isLoading ? 'Connecting to Deriv...' : 'Continue with Deriv'}</span>
            <ArrowRight className="w-4 h-4 text-rose-200 group-hover:translate-x-1 transition" />
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure 1-click login with your Deriv browser account</span>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-[#0b0f19] px-3 text-[11px] font-mono text-slate-500 uppercase tracking-widest relative">
            or practice
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        {/* Instant Sandbox Button */}
        <div className="space-y-2 relative z-10">
          <button
            onClick={handleInstantDemoMode}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 text-slate-200 hover:text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer shadow-sm"
          >
            <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <span>Open $10,000 Free Live Sandbox</span>
          </button>
          <p className="text-[11px] text-slate-500 font-mono">
            Streams real live Volatility index ticks without logging in
          </p>
        </div>

        {/* Alternative: API Token Dropdown */}
        <div className="border-t border-slate-800/80 pt-4 text-left">
          <button
            onClick={() => setShowTokenLogin(!showTokenLogin)}
            className="w-full flex items-center justify-between text-xs font-mono text-slate-400 hover:text-slate-200 py-1 transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              Sign in with Deriv API Token
            </span>
            {showTokenLogin ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTokenLogin && (
            <form onSubmit={handleTokenLogin} className="mt-3 space-y-3 animate-in fade-in duration-200">
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="password"
                  placeholder="Paste token (Read + Trade)"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-900 text-cyan-500"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="https://app.deriv.com/account/api-token"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>Get token</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono rounded-xl transition shadow-md"
              >
                Authenticate Token
              </button>
            </form>
          )}
        </div>

        {/* Existing Available OAuth Accounts Switcher */}
        {availableOAuthAccounts && availableOAuthAccounts.length > 0 ? (
          <div className="border-t border-slate-800/80 pt-4 space-y-2 text-left">
            <label className="text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1.5 uppercase">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              Switch Account ({availableOAuthAccounts.length})
            </label>
            <div className="space-y-1.5">
              {availableOAuthAccounts.map((acct) => (
                <button
                  key={acct.accountId}
                  onClick={() => selectOAuthAccount(acct)}
                  className="w-full p-2.5 bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        acct.isVirtual
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {acct.isVirtual ? 'DEMO' : 'REAL'}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">{acct.accountId}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                    <span>{acct.currency}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
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
