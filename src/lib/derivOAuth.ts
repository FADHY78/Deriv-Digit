export interface OAuthAccount {
  accountId: string;
  token: string;
  currency: string;
  isVirtual: boolean;
}

export const REGISTERED_APP_ID = '347FrwAYb8ptoUsbiGVsA';

/**
 * Generates a random PKCE code verifier string (43-128 characters) per Deriv OAuth2 docs.
 */
export function generateCodeVerifier(): string {
  const array = crypto.getRandomValues(new Uint8Array(64));
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  return Array.from(array)
    .map((v) => charset[v % charset.length])
    .join('');
}

/**
 * Generates a base64url-encoded SHA-256 code challenge from a code verifier per Deriv OAuth2 docs.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  return verifier;
}

/**
 * Generates a random state string for CSRF protection per Deriv OAuth2 docs.
 */
export function generateRandomState(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Constructs the official Deriv OAuth 2.0 Authorization URL per developers.deriv.com/docs/intro/oauth/
 */
export async function getDerivOAuthUrl(appId: string = REGISTERED_APP_ID): Promise<string> {
  const currentOrigin = window.location.origin;
  const redirectUri = `${currentOrigin}/callback`;
  const effectiveAppId = (appId || (import.meta as any).env?.VITE_DERIV_APP_ID || REGISTERED_APP_ID).trim();

  // 1. Generate & Store Random State
  const state = generateRandomState();
  sessionStorage.setItem('oauth_state', state);

  // 2. Generate & Store PKCE Code Verifier & Challenge
  const codeVerifier = generateCodeVerifier();
  sessionStorage.setItem('oauth_code_verifier', codeVerifier);
  sessionStorage.setItem('pkce_code_verifier', codeVerifier);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const isAlphanumeric = /[a-zA-Z]/.test(effectiveAppId);

  if (isAlphanumeric) {
    // Official Deriv OAuth 2.0 Authorization Code Flow with PKCE
    return (
      `https://auth.deriv.com/oauth2/auth` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(effectiveAppId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent('trade account_manage')}` +
      `&state=${encodeURIComponent(state)}` +
      `&code_challenge=${encodeURIComponent(codeChallenge)}` +
      `&code_challenge_method=S256`
    );
  }

  // Legacy numeric app_id endpoint
  return (
    `https://oauth.deriv.com/oauth2/authorize` +
    `?app_id=${encodeURIComponent(effectiveAppId)}` +
    `&l=en` +
    `&brand=deriv` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`
  );
}

/**
 * Exchanges OAuth2 authorization code via serverless backend route (/api/oauth-token)
 * or direct to https://auth.deriv.com/oauth2/token with PKCE code_verifier per docs.
 */
export async function exchangeOAuthCodeForTokens(
  code: string,
  clientId: string = REGISTERED_APP_ID,
  codeVerifier: string = ''
): Promise<OAuthAccount[]> {
  const currentOrigin = window.location.origin;
  const redirectUri = `${currentOrigin}/callback`;

  let data: any = null;

  // 1. Try Vercel Serverless Function first
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
        codeVerifier,
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

    if (codeVerifier) {
      body.append('code_verifier', codeVerifier);
    }

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
 */
export function parseOAuthResponse(params: URLSearchParams): OAuthAccount[] {
  const accounts: OAuthAccount[] = [];

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
