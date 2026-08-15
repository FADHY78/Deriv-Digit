export interface OAuthAccount {
  accountId: string;
  token: string;
  currency: string;
  isVirtual: boolean;
}

/**
 * Constructs the official Deriv OAuth redirect URL for browser authentication.
 * Uses /callback endpoint for Deriv app redirect requirement.
 */
export function getDerivOAuthUrl(appId: string = '1089'): string {
  const currentOrigin = window.location.origin;
  const redirectUri = `${currentOrigin}/callback`;

  // Deriv OAuth endpoint: redirects to /callback with acctX, tokenX, and curX params
  return `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&l=en&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;
}

/**
 * Parses incoming URL query parameters or hash fragments returned by Deriv OAuth redirect.
 * Deriv returns parameters in format: acct1=VRTC1234&token1=xyz&cur1=USD&acct2=CR5678&token2=abc&cur2=USD...
 */
export function parseOAuthResponse(searchParams: URLSearchParams): OAuthAccount[] {
  const accounts: OAuthAccount[] = [];
  let index = 1;

  while (searchParams.has(`acct${index}`) && searchParams.has(`token${index}`)) {
    const accountId = searchParams.get(`acct${index}`) || '';
    const token = searchParams.get(`token${index}`) || '';
    const currency = searchParams.get(`cur${index}`) || 'USD';
    const isVirtual = accountId.startsWith('VRTC') || accountId.startsWith('VRW');

    if (accountId && token) {
      accounts.push({
        accountId,
        token,
        currency,
        isVirtual,
      });
    }
    index++;
  }

  return accounts;
}
