import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, RefreshCw, ArrowRight, Zap, ExternalLink, Copy, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { derivSocket } from '../lib/derivSocket';
import { parseOAuthResponse, exchangeOAuthCodeForTokens } from '../lib/derivOAuth';

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
  const [debugUrl, setDebugUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Prevent double execution of single-use authorization code in React
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;

    const processCallback = async () => {
      const fullUrl = window.location.href;
      setDebugUrl(fullUrl);

      // 1. Search Query Parameters
      let params = new URLSearchParams(window.location.search);

      // 2. Hash Fragment Parameters (if tokens returned after #)
      if (window.location.hash) {
        const hashContent = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hashContent);
        if (!params.has('token1') && !params.has('token') && !params.has('code')) {
          params = hashParams;
        }
      }

      // 3. Check for explicit error parameters returned from Deriv
      const error = params.get('error') || params.get('error_code');
      const errorDesc = params.get('error_description') || params.get('msg');
      if (error || errorDesc) {
        setStatus('error');
        setErrorMessage(errorDesc || `Deriv OAuth returned error: ${error}`);
        return;
      }

      // 4. Validate returned OAuth State (CSRF protection required by Deriv)
      const returnedState = params.get('state');
      const savedState = sessionStorage.getItem('oauth_state');

      if (savedState && returnedState && returnedState !== savedState) {
        setStatus('error');
        setErrorMessage('Invalid OAuth state returned by Deriv. For security reasons, authentication was stopped.');
        return;
      }

      // Clean up saved state
      if (savedState) {
        sessionStorage.removeItem('oauth_state');
      }

      // Retrieve PKCE code verifier
      const codeVerifier = sessionStorage.getItem('oauth_code_verifier') || '';
      if (codeVerifier) {
        sessionStorage.removeItem('oauth_code_verifier');
      }

      let oauthAccounts = parseOAuthResponse(params);

      // 5. If code is received (Authorization Code Flow with PKCE from auth.deriv.com)
      const code = params.get('code');
      if (oauthAccounts.length === 0 && code) {
        try {
          oauthAccounts = await exchangeOAuthCodeForTokens(code, appId, codeVerifier);
        } catch (exchangeErr: any) {
          setStatus('error');
          setErrorMessage(
            exchangeErr.message ||
            'Failed to exchange authorization code with Deriv token endpoint. The code may have expired or already been used.'
          );
          return;
        }
      }

      if (oauthAccounts.length === 0) {
        setStatus('error');
        setErrorMessage(
          'No authentication tokens or authorization code were received. Please click "Return to Login" and start the authorization from the login button.'
        );
        return;
      }

      const primaryAccount = oauthAccounts[0];

      try {
        await derivSocket.connect(); // Connect using standard Deriv WebSocket stream
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

        setTimeout(() => {
          window.history.replaceState({}, document.title, '/dashboard');
          navigate('/dashboard');
        }, 1000);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Failed to authorize account with Deriv.');
      }
    };

    processCallback();
  }, [searchParams, appId, setToken, setAvailableOAuthAccounts, setAccountDetails, navigate]);

  const copyDebugInfo = () => {
    navigator.clipboard.writeText(debugUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto my-12 p-4">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {status === 'authorizing' && (
          <div className="space-y-4 py-4 animate-in fade-in duration-300">
            <div className="inline-flex p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white">Authorizing Deriv Session</h2>
            <p className="text-xs text-slate-400 font-mono">
              Validating session and loading account balance...
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
              Connected to Deriv. Launching quantitative trading terminal...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-2 animate-in shake duration-300 text-left">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Authentication Notice</h2>
            </div>

            <div className="p-3.5 bg-rose-950/50 border border-rose-800/60 rounded-2xl text-xs font-mono text-rose-200 leading-relaxed">
              {errorMessage}
            </div>

            {/* URL debug panel */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Received Callback URL:</span>
                <button
                  onClick={copyDebugInfo}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400 break-all max-h-24 overflow-y-auto select-all">
                {debugUrl || window.location.href}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-3">
              <Link
                to="/login"
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-xs font-mono font-bold text-white rounded-2xl transition shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2"
              >
                <span>Return to Login (Start Fresh Login)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
