export interface OAuthAccount {
  accountId: string;
  token: string;
  currency: string;
  isVirtual: boolean;
}

export const REGISTERED_APP_ID = '347FrwAYb8ptoUsbiGVsA';

/**
 * Constructs the official Deriv OAuth redirect URL for browser authentication.
 * Generates a secure random state (crypto.randomUUID()), stores it in sessionStorage,
 * and appends &state= to satisfy Deriv's security requirements.
 */
export function getDerivOAuthUrl(appId: string = REGISTERED_APP_ID): string {
  const currentOrigin = window.location.origin;
  const redirectUri = `${currentOrigin}/callback`;
  const effectiveAppId = (appId || (import.meta as any).env?.VITE_DERIV_APP_ID || REGISTERED_APP_ID).trim();

  // Generate secure random state of at least 8 characters
  let state = '';
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    state = crypto.randomUUID();
  } else {
    state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Store state for validation on callback
  sessionStorage.setItem('oauth_state', state);

  // If the App ID is alphanumeric (like 347FrwAYb8ptoUsbiGVsA), use auth.deriv.com with response_type=code & state
  const isAlphanumeric = /[a-zA-Z]/.test(effectiveAppId);

  if (isAlphanumeric) {
    return `https://auth.deriv.com/oauth2/auth?client_id=${effectiveAppId}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${encodeURIComponent(state)}`;
  }

  // Otherwise use legacy numeric app_id endpoint
  return `https://oauth.deriv.com/oauth2/authorize?app_id=${effectiveAppId}&l=en&brand=deriv&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${encodeURIComponent(state)}`;
}

/**
 * Exchanges OAuth2 authorization code via serverless backend route (/api/oauth-token)
 * or fallback direct to https://auth.deriv.com/oauth2/token
 */
export async function exchangeOAuthCodeForTokens(
  code: string,
  clientId: string = REGISTERED_APP_ID
): Promise<OAuthAccount[]> {
  const currentOrigin = window.location.origin;
  const redirectUri = `${currentOrigin}/callback`;

  let data: any = null;

  // 1. Try Vercel Serverless Function first (keeps secrets and token exchange server-side)
  try {
    const serverRes = await fetch('/api/oauth-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        clientId,
        redirectUri,
      }),
    });

    if (serverRes.ok) {
      data = await serverRes.json();
    }
  } catch (serverErr) {
    console.warn('[OAuth] Serverless exchange attempt error, trying fallback:', serverErr);
  }

  // 2. Direct client fallback if serverless route not found
  if (!data) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: code,
      redirect_uri: redirectUri,
    });

    const response = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(
        data.error_description ||
        data.error ||
        data.message ||
        'Failed to exchange authorization code for access tokens'
      );
    }
  }

  const accounts: OAuthAccount[] = [];

  if (Array.isArray(data.accounts)) {
    data.accounts.forEach((acc: any) => {
      accounts.push({
        accountId: acc.account_id || acc.loginid || acc.id || 'DERIV_ACCOUNT',
        token: acc.token || data.access_token,
        currency: acc.currency || 'USD',
        isVirtual: Boolean(acc.is_virtual || acc.account_id?.startsWith('VRTC')),
      });
    });
  }

  if (accounts.length === 0 && data.access_token) {
    accounts.push({
      accountId: 'DERIV_USER',
      token: data.access_token,
      currency: 'USD',
      isVirtual: false,
    });
  }

  return accounts;
}

/**
 * Robustly parses incoming tokens from URL search params, hash fragments, or full href.
 * Handles both multi-account responses (acct1/token1, acct2/token2) and single token parameters (token, access_token).
 */
export function parseOAuthResponse(params: URLSearchParams): OAuthAccount[] {
  const accounts: OAuthAccount[] = [];

  // 1. Try standard Deriv multi-account pattern: acct1 & token1, acct2 & token2...
  let index = 1;
  while (params.has(`token${index}`) || params.has(`acct${index}`)) {
    const token = params.get(`token${index}`) || '';
    const accountId = params.get(`acct${index}`) || `ACCOUNT_${index}`;
    const currency = params.get(`cur${index}`) || 'USD';
    const isVirtual = accountId.startsWith('VRTC') || accountId.startsWith('VRW');

    if (token) {
      accounts.push({
        accountId,
        token,
        currency,
        isVirtual,
      });
    }
    index++;
  }

  // 2. Fallback: check single token parameters (token, access_token, auth_token)
  if (accounts.length === 0) {
    const singleToken =
      params.get('token') ||
      params.get('access_token') ||
      params.get('auth_token');

    if (singleToken) {
      const accountId = params.get('acct') || params.get('loginid') || 'DERIV_USER';
      const currency = params.get('cur') || 'USD';
      const isVirtual = accountId.startsWith('VRTC') || accountId.startsWith('VRW');

      accounts.push({
        accountId,
        token: singleToken,
        currency,
        isVirtual,
      });
    }
  }

  return accounts;
}
