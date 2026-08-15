import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, RefreshCw, ArrowRight, Zap } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { derivSocket } from '../lib/derivSocket';
import { parseOAuthResponse } from '../lib/derivOAuth';

export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    appId,
    setToken,
    setAccountDetails,
    setAvailableOAuthAccounts,
  } = useAuthStore();

  const [status, setStatus] = useState<'authorizing' | 'success' | 'error'>('authorizing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      // 1. Check query parameters (?acct1=...&token1=...)
      let params = searchParams;

      // Also check hash fragment if OAuth returned tokens after #
      if (!params.has('token1') && window.location.hash) {
        const hashQuery = window.location.hash.substring(1);
        params = new URLSearchParams(hashQuery);
      }

      const oauthAccounts = parseOAuthResponse(params);

      if (oauthAccounts.length === 0) {
        setStatus('error');
        setErrorMessage('No authentication tokens were received from Deriv. Please try logging in again.');
        return;
      }

      const primaryAccount = oauthAccounts[0];

      try {
        await derivSocket.connect(appId);
        const res = await derivSocket.authorize(primaryAccount.token);

        if (res.error) {
          throw new Error(res.error.message || 'Deriv token authorization failed.');
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

        setStatus('success');

        // Clean URL and navigate to dashboard after brief success display
        setTimeout(() => {
          window.history.replaceState({}, document.title, '/dashboard');
          navigate('/dashboard');
        }, 1200);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Failed to complete Deriv authorization handshake.');
      }
    };

    processCallback();
  }, [searchParams, appId, setToken, setAvailableOAuthAccounts, setAccountDetails, navigate]);

  return (
    <div className="max-w-md mx-auto my-16 p-4">
      <div className="glass-panel rounded-3xl p-8 border border-slate-800/80 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {status === 'authorizing' && (
          <div className="space-y-4 py-4 animate-in fade-in duration-300">
            <div className="inline-flex p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white">Authorizing Deriv Session</h2>
            <p className="text-xs text-slate-400 font-mono">
              Establishing secure WebSocket handshake and retrieving account balances...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-4 animate-in zoom-in duration-300">
            <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shadow-lg shadow-emerald-950/50">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Authorization Successful!</h2>
            <p className="text-xs text-slate-300 font-mono">
              Account connected. Launching trading terminal...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-4 animate-in shake duration-300">
            <div className="inline-flex p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Authentication Failed</h2>
            <p className="text-xs text-rose-300 font-mono bg-rose-950/60 p-3 rounded-xl border border-rose-800/60">
              {errorMessage}
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-white rounded-2xl transition shadow-sm"
              >
                <span>Return to Login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
