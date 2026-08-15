export interface OAuthAccount {
  accountId: string;
  token: string;
  currency: string;
  isVirtual: boolean;
}

export const REGISTERED_APP_ID = '347FrwAYb8ptoUsbiGVsA';

/**
 * Constructs the official Deriv OAuth redirect URL for browser authentication.
 * Uses response_type=code for OAuth2 compliance with auth.deriv.com.
 */
export function getDerivOAuthUrl(appId: string = REGISTERED_APP_ID): string {
  const currentOrigin = window.location.origin;
  const redirectUri = `${currentOrigin}/callback`;
  const effectiveAppId = (appId || (import.meta as any).env?.VITE_DERIV_APP_ID || REGISTERED_APP_ID).trim();

  // If the App ID is alphanumeric (like 347FrwAYb8ptoUsbiGVsA from api.deriv.com), use auth.deriv.com with response_type=code
  const isAlphanumeric = /[a-zA-Z]/.test(effectiveAppId);

  if (isAlphanumeric) {
    return `https://auth.deriv.com/oauth2/auth?client_id=${effectiveAppId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code`;
  }

  // Otherwise use numeric app_id endpoint
  return `https://oauth.deriv.com/oauth2/authorize?app_id=${effectiveAppId}&l=en&brand=deriv&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;
}

/**
 * Exchanges OAuth2 authorization code with Deriv auth server at https://auth.deriv.com/oauth2/token
 */
export async function exchangeOAuthCodeForTokens(
  code: string,
  clientId: string = REGISTERED_APP_ID
): Promise<OAuthAccount[]> {
  const currentOrigin = window.location.origin;
  const redirectUri = `${currentOrigin}/callback`;

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

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.error_description ||
      data.error ||
      data.message ||
      'Failed to exchange authorization code for access tokens'
    );
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
