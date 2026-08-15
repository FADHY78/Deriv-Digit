import { create } from 'zustand';
import type { UserAuth, AccountType, OAuthAccount } from '../types/deriv';
import { derivSocket } from '../lib/derivSocket';

interface AuthState extends UserAuth {
  isLoggedIn: boolean;
  setToken: (token: string, rememberMe?: boolean) => void;
  setAccountDetails: (details: { accountId: string; accountType: AccountType; balance: number; currency: string }) => void;
  setAvailableOAuthAccounts: (accounts: OAuthAccount[]) => void;
  selectOAuthAccount: (account: OAuthAccount) => Promise<void>;
  setAppId: (appId: string) => void;
  logout: () => void;
}

const STORAGE_KEY_TOKEN = 'deriv_auth_token';
const STORAGE_KEY_REMEMBER = 'deriv_remember_me';
const STORAGE_KEY_APP_ID = 'deriv_app_id';
const STORAGE_KEY_OAUTH_ACCTS = 'deriv_oauth_accounts';

// Initial load check with optional VITE_DERIV_APP_ID env support
const envAppId = (import.meta as any).env?.VITE_DERIV_APP_ID || '';
const initialRemember = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true';
const initialToken = initialRemember
  ? localStorage.getItem(STORAGE_KEY_TOKEN) || ''
  : sessionStorage.getItem(STORAGE_KEY_TOKEN) || '';
const initialAppId = localStorage.getItem(STORAGE_KEY_APP_ID) || envAppId || '1089';

const rawOAuthAccts = localStorage.getItem(STORAGE_KEY_OAUTH_ACCTS);
const initialOAuthAccts: OAuthAccount[] = rawOAuthAccts ? JSON.parse(rawOAuthAccts) : [];

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initialToken,
  accountType: 'demo',
  accountId: '',
  balance: 10000,
  currency: 'USD',
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
    set({ accountId, accountType, balance, currency });
  },

  setAvailableOAuthAccounts: (accounts: OAuthAccount[]) => {
    localStorage.setItem(STORAGE_KEY_OAUTH_ACCTS, JSON.stringify(accounts));
    set({ availableOAuthAccounts: accounts });
  },

  selectOAuthAccount: async (account: OAuthAccount) => {
    const { rememberMe } = get();
    get().setToken(account.token, rememberMe);

    try {
      await derivSocket.connect();
      const res = await derivSocket.authorize(account.token);
      if (res.authorize) {
        set({
          accountId: res.authorize.loginid,
          accountType: res.authorize.is_virtual === 1 ? 'demo' : 'real',
          balance: res.authorize.balance ?? 10000,
          currency: res.authorize.currency ?? account.currency ?? 'USD',
        });
      }
    } catch (err) {
      console.error('[AuthStore] Error switching OAuth account:', err);
    }
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
