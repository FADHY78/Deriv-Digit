import { create } from 'zustand';
import type { AppSettings } from '../types/deriv';

interface SettingsState extends AppSettings {
  setDefaultWindowSize: (size: 100 | 300 | 500) => void;
  setDeviationThreshold: (threshold: number) => void;
  setMaxStakeGuardrail: (stake: number) => void;
  setAllowStakeOverride: (allow: boolean) => void;
  setRiskDisclaimerAcknowledged: (acknowledged: boolean) => void;
  resetSettings: () => void;
}

const SETTINGS_KEY = 'deriv_analyzer_settings';

const defaultSettings: AppSettings = {
  defaultWindowSize: 100,
  deviationThreshold: 3.0,
  maxStakeGuardrail: 10.0,
  allowStakeOverride: false,
  appId: '1089',
  riskDisclaimerAcknowledged: false,
};

const savedRaw = localStorage.getItem(SETTINGS_KEY);
const initialSettings: AppSettings = savedRaw ? { ...defaultSettings, ...JSON.parse(savedRaw) } : defaultSettings;

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initialSettings,

  setDefaultWindowSize: (defaultWindowSize) => {
    set({ defaultWindowSize });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...get(), defaultWindowSize }));
  },

  setDeviationThreshold: (deviationThreshold) => {
    set({ deviationThreshold });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...get(), deviationThreshold }));
  },

  setMaxStakeGuardrail: (maxStakeGuardrail) => {
    set({ maxStakeGuardrail });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...get(), maxStakeGuardrail }));
  },

  setAllowStakeOverride: (allowStakeOverride) => {
    set({ allowStakeOverride });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...get(), allowStakeOverride }));
  },

  setRiskDisclaimerAcknowledged: (riskDisclaimerAcknowledged) => {
    set({ riskDisclaimerAcknowledged });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...get(), riskDisclaimerAcknowledged }));
  },

  resetSettings: () => {
    set(defaultSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
  },
}));
