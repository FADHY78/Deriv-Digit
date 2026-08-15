export type AccountType = 'demo' | 'real';

export interface OAuthAccount {
  accountId: string;
  token: string;
  currency: string;
  isVirtual: boolean;
}

export interface UserAuth {
  token: string;
  accountType: AccountType;
  accountId: string;
  balance: number;
  currency: string;
  rememberMe: boolean;
  appId: string;
  availableOAuthAccounts?: OAuthAccount[];
}

export interface SyntheticSymbol {
  symbol: string;
  displayName: string;
  market: string;
  submarket: string;
  pipSize: number;
}

export interface TickData {
  symbol: string;
  quote: number;
  lastDigit: number;
  epoch: number;
  id?: string;
  pipSize?: number;
}

export interface FrequencyData {
  digit: number;
  count: number;
  percentage: number; // e.g. 12.4%
  deviation: number;  // e.g. +2.4% from expected 10%
}

export interface DeviationScore {
  digit: number;
  score: number; // percentage point difference, e.g. +3.5 or -2.1
  isHot: boolean; // deviation >= threshold
  isCold: boolean; // deviation <= -threshold
}

export interface StreakInfo {
  digit: number;
  ticksSinceLast: number;
}

export interface SignalSummary {
  digit: number;
  deviation: number;
  streak: number;
  status: 'HOT' | 'COLD' | 'NEUTRAL';
  signalConfidence: number; // 0 - 100 purely statistical deviation score
}

export type ContractType = 'DIGITMATCH' | 'DIGITDIFF' | 'DIGITOVER' | 'DIGITUNDER';

export interface ContractProposalRequest {
  symbol: string;
  contractType: ContractType;
  stake: number;
  duration: number; // ticks (usually 1-10)
  barrier?: number; // digit 0-9
}

export interface ContractProposal {
  id: string;
  askPrice: number;
  payout: number;
  spot: number;
  barrier: string;
}

export interface ActivePosition {
  contractId: number;
  symbol: string;
  contractType: ContractType;
  barrier: number;
  stake: number;
  payout: number;
  buyPrice: number;
  purchaseEpoch: number;
  currentSpot?: number;
  currentLastDigit?: number;
  status: 'open' | 'won' | 'lost';
  profit: number;
  entrySignalSnapshot?: {
    deviation: number;
    status: 'HOT' | 'COLD' | 'NEUTRAL';
  };
}

export interface JournalRecord {
  id?: number;
  contractId: number;
  symbol: string;
  contractType: ContractType;
  selectedDigit: number;
  stake: number;
  payout: number;
  profit: number;
  result: 'WIN' | 'LOSS';
  timestamp: number;
  entrySignalStatus?: 'HOT' | 'COLD' | 'NEUTRAL';
  entrySignalDeviation?: number;
  alignedWithSignal: boolean;
}

export interface AppSettings {
  defaultWindowSize: 100 | 300 | 500;
  deviationThreshold: number; // e.g. 3.0 (means 13% or 7%)
  maxStakeGuardrail: number;  // e.g. 10.00 USD
  allowStakeOverride: boolean;
  appId: string;
  riskDisclaimerAcknowledged: boolean;
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';
