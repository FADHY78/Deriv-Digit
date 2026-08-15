export interface OAuthAccount {
  accountId: string;
  token: string;
  currency: string;
  isVirtual: boolean;
}

export const REGISTERED_APP_ID = '347FrwAYb8ptoUsbiGVsA';

/**
 * Constructs the official Deriv OAuth redirect URL for browser authentication.
 * Uses /callback endpoint for Deriv app redirect requirement.
 */
export function getDerivOAuthUrl(appId: string = REGISTERED_APP_ID): string {
  const currentOrigin = window.location.origin;
  const redirectUri = `${currentOrigin}/callback`;
  const effectiveAppId = appId || (import.meta as any).env?.VITE_DERIV_APP_ID || REGISTERED_APP_ID;

  // Official Deriv OAuth authorize endpoint
  return `https://oauth.deriv.com/oauth2/authorize?app_id=${effectiveAppId}&l=en&brand=deriv&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;
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
