import { create } from 'zustand';
import type { UserAuth, AccountType, OAuthAccount } from '../types/deriv';
import { derivSocket } from '../lib/derivSocket';

interface AuthState extends UserAuth {
  isLoggedIn: boolean;
  setToken: (token: string, rememberMe?: boolean) => void;
  setAccountDetails: (details: { accountId: string; accountType: AccountType; balance: number; currency: string }) => void;
  setAvailableOAuthAccounts: (accounts: OAuthAccount[]) => void;
  selectOAuthAccount: (account: OAuthAccount) => Promise<void>;
  fetchUserAccounts: (tokenOverride?: string) => Promise<void>;
  setAppId: (appId: string) => void;
  logout: () => void;
}

const STORAGE_KEY_TOKEN = 'deriv_auth_token';
const STORAGE_KEY_REMEMBER = 'deriv_remember_me';
const STORAGE_KEY_APP_ID = 'deriv_app_id';
const STORAGE_KEY_OAUTH_ACCTS = 'deriv_oauth_accounts';
const STORAGE_KEY_ACCOUNT_DETAILS = 'deriv_account_details';

// Deriv Registered App ID for https://deriv-digit-three.vercel.app/callback
export const DEFAULT_DERIV_APP_ID = '347FrwAYb8ptoUsbiGVsA';

const envAppId = (import.meta as any).env?.VITE_DERIV_APP_ID || '';
const initialRemember = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true';
const initialToken = initialRemember
  ? localStorage.getItem(STORAGE_KEY_TOKEN) || ''
  : sessionStorage.getItem(STORAGE_KEY_TOKEN) || '';
const initialAppId = localStorage.getItem(STORAGE_KEY_APP_ID) || envAppId || DEFAULT_DERIV_APP_ID;

const rawOAuthAccts = localStorage.getItem(STORAGE_KEY_OAUTH_ACCTS);
const initialOAuthAccts: OAuthAccount[] = rawOAuthAccts ? JSON.parse(rawOAuthAccts) : [];

const rawDetails = localStorage.getItem(STORAGE_KEY_ACCOUNT_DETAILS);
const initialDetails = rawDetails
  ? JSON.parse(rawDetails)
  : { accountId: '', accountType: 'demo' as AccountType, balance: 10000, currency: 'USD' };

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initialToken,
  accountType: initialDetails.accountType || 'demo',
  accountId: initialDetails.accountId || '',
  balance: initialDetails.balance ?? 10000,
  currency: initialDetails.currency || 'USD',
  rememberMe: initialRemember,
  appId: initialAppId,
  availableOAuthAccounts: initialOAuthAccts,
  isLoggedIn: Boolean(initialToken),

  setToken: (token: string, rememberMe: boolean = false) => {
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
      sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    } else {
      sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.setItem(STORAGE_KEY_REMEMBER, 'false');
    }

    derivSocket.setToken(token);
    set({ token, rememberMe, isLoggedIn: Boolean(token) });
  },

  setAccountDetails: ({ accountId, accountType, balance, currency }) => {
    const details = { accountId, accountType, balance, currency };
    localStorage.setItem(STORAGE_KEY_ACCOUNT_DETAILS, JSON.stringify(details));
    set(details);
  },

  setAvailableOAuthAccounts: (accounts: OAuthAccount[]) => {
    localStorage.setItem(STORAGE_KEY_OAUTH_ACCTS, JSON.stringify(accounts));
    set({ availableOAuthAccounts: accounts });
  },

  fetchUserAccounts: async (tokenOverride?: string) => {
    const currentToken = (tokenOverride || get().token || '').trim();
    if (!currentToken) return;

    const { appId } = get();

    // 1. Try Deriv REST Options Accounts endpoint (for OAuth 2.0 Bearer tokens)
    try {
      const res = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Deriv-App-ID': appId || DEFAULT_DERIV_APP_ID,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          const accounts: OAuthAccount[] = json.data.map((acc: any) => ({
            accountId: acc.account_id,
            token: currentToken,
            currency: acc.currency || 'USD',
            isVirtual: acc.account_type === 'demo',
          }));

          get().setAvailableOAuthAccounts(accounts);

          const primary = json.data[0];
          get().setAccountDetails({
            accountId: primary.account_id,
            accountType: primary.account_type === 'demo' ? 'demo' : 'real',
            balance: Number(primary.balance ?? 10000),
            currency: primary.currency || 'USD',
          });
          return;
        }
      }
    } catch (e) {
      console.warn('[AuthStore] REST accounts fetch attempt:', e);
    }

    // 2. Fallback: Socket authorize (for legacy API tokens)
    if (!currentToken.startsWith('ory_at_') && currentToken.length < 50) {
      try {
        await derivSocket.connect();
        const res = await derivSocket.authorize(currentToken);
        if (res.authorize) {
          const auth = res.authorize;
          const isVirtual = auth.is_virtual === 1;

          if (Array.isArray(auth.account_list)) {
            const accounts: OAuthAccount[] = auth.account_list.map((acc: any) => ({
              accountId: acc.loginid,
              token: currentToken,
              currency: acc.currency || 'USD',
              isVirtual: Boolean(acc.is_virtual),
            }));
            get().setAvailableOAuthAccounts(accounts);
          }

          get().setAccountDetails({
            accountId: auth.loginid,
            accountType: isVirtual ? 'demo' : 'real',
            balance: Number(auth.balance ?? 10000),
            currency: auth.currency || 'USD',
          });
        }
      } catch (err) {
        console.warn('[AuthStore] Socket authorize attempt:', err);
      }
    }
  },

  selectOAuthAccount: async (account: OAuthAccount) => {
    const { rememberMe } = get();
    get().setToken(account.token, rememberMe);

    get().setAccountDetails({
      accountId: account.accountId,
      accountType: account.isVirtual ? 'demo' : 'real',
      balance: get().balance,
      currency: account.currency || 'USD',
    });

    // Refresh balance & status
    await get().fetchUserAccounts(account.token);
  },

  setAppId: (appId: string) => {
    localStorage.setItem(STORAGE_KEY_APP_ID, appId);
    derivSocket.setAppId(appId);
    set({ appId });
  },

  logout: () => {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REMEMBER);
    localStorage.removeItem(STORAGE_KEY_OAUTH_ACCTS);
    localStorage.removeItem(STORAGE_KEY_ACCOUNT_DETAILS);
    derivSocket.setToken(null);
    set({
      token: '',
      isLoggedIn: false,
      accountId: '',
      balance: 0,
      currency: 'USD',
      availableOAuthAccounts: [],
    });
  },
}));
