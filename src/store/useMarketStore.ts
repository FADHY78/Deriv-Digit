import { create } from 'zustand';
import type { SyntheticSymbol, TickData, ConnectionState } from '../types/deriv';
import { RingBuffer } from '../lib/ringBuffer';
import { derivSocket } from '../lib/derivSocket';

interface MarketState {
  connectionState: ConnectionState;
  activeSymbols: SyntheticSymbol[];
  ringBuffers: Record<string, RingBuffer<TickData>>;
  latestTicks: Record<string, TickData>;
  subscribedSymbols: string[];
  selectedSymbol: string;
  isInitializing: boolean;

  setConnectionState: (state: ConnectionState) => void;
  loadActiveSymbols: () => Promise<void>;
  setSelectedSymbol: (symbol: string) => void;
  subscribeSymbol: (symbol: string) => void;
  subscribeAllVisible: (symbols: string[]) => void;
  unsubscribeSymbol: (symbol: string) => void;
  getBuffer: (symbol: string) => RingBuffer<TickData>;
}

// Complete verified standard Deriv Synthetic Volatility, 1-Second, and Crash/Boom Indices
export const VERIFIED_DERIV_SYNTHETICS: SyntheticSymbol[] = [
  // 1-Second Continuous Volatility Indices
  { symbol: '1HZ10V', displayName: 'Volatility 10 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 2 },
  { symbol: '1HZ25V', displayName: 'Volatility 25 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 2 },
  { symbol: '1HZ50V', displayName: 'Volatility 50 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 2 },
  { symbol: '1HZ75V', displayName: 'Volatility 75 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 2 },
  { symbol: '1HZ100V', displayName: 'Volatility 100 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 2 },
  { symbol: '1HZ150V', displayName: 'Volatility 150 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 2 },
  { symbol: '1HZ250V', displayName: 'Volatility 250 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 2 },
  { symbol: '1HZ300V', displayName: 'Volatility 300 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 2 },

  // Standard Continuous Volatility Indices
  { symbol: 'R_10', displayName: 'Volatility 10 Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 3 },
  { symbol: 'R_25', displayName: 'Volatility 25 Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 3 },
  { symbol: 'R_50', displayName: 'Volatility 50 Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 4 },
  { symbol: 'R_75', displayName: 'Volatility 75 Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 4 },
  { symbol: 'R_100', displayName: 'Volatility 100 Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 2 },

  // Crash / Boom / Jump Indices
  { symbol: 'BOOM500', displayName: 'Boom 500 Index', market: 'synthetic_index', submarket: 'random_daily', pipSize: 4 },
  { symbol: 'BOOM1000', displayName: 'Boom 1000 Index', market: 'synthetic_index', submarket: 'random_daily', pipSize: 4 },
  { symbol: 'CRASH500', displayName: 'Crash 500 Index', market: 'synthetic_index', submarket: 'random_daily', pipSize: 4 },
  { symbol: 'CRASH1000', displayName: 'Crash 1000 Index', market: 'synthetic_index', submarket: 'random_daily', pipSize: 4 },
  { symbol: 'stpRNG', displayName: 'Step Index', market: 'synthetic_index', submarket: 'random_daily', pipSize: 4 },
  { symbol: 'JD10', displayName: 'Jump 10 Index', market: 'synthetic_index', submarket: 'random_daily', pipSize: 2 },
  { symbol: 'JD25', displayName: 'Jump 25 Index', market: 'synthetic_index', submarket: 'random_daily', pipSize: 2 },
  { symbol: 'JD50', displayName: 'Jump 50 Index', market: 'synthetic_index', submarket: 'random_daily', pipSize: 2 },
  { symbol: 'JD75', displayName: 'Jump 75 Index', market: 'synthetic_index', submarket: 'random_daily', pipSize: 2 },
  { symbol: 'JD100', displayName: 'Jump 100 Index', market: 'synthetic_index', submarket: 'random_daily', pipSize: 2 },
];

export const useMarketStore = create<MarketState>((set, get) => {
  // Listen for socket connection status
  derivSocket.onStateChange((connectionState) => {
    set({ connectionState });
  });

  // Listen for real-time tick updates
  derivSocket.onTick((tick: TickData) => {
    const { ringBuffers, latestTicks } = get();
    let buffer = ringBuffers[tick.symbol];

    if (!buffer) {
      buffer = new RingBuffer<TickData>(500);
    }

    buffer.push(tick);

    set({
      ringBuffers: {
        ...ringBuffers,
        [tick.symbol]: buffer,
      },
      latestTicks: {
        ...latestTicks,
        [tick.symbol]: { ...tick },
      },
    });
  });

  return {
    connectionState: 'disconnected',
    activeSymbols: VERIFIED_DERIV_SYNTHETICS,
    ringBuffers: {},
    latestTicks: {},
    subscribedSymbols: [],
    selectedSymbol: '1HZ100V',
    isInitializing: false,

    setConnectionState: (connectionState) => set({ connectionState }),

    loadActiveSymbols: async () => {
      set({ isInitializing: true });
      try {
        await derivSocket.connect();
        const symbols = await derivSocket.getActiveSymbols();
        if (symbols && symbols.length > 0) {
          const existingMap = new Map(VERIFIED_DERIV_SYNTHETICS.map((s) => [s.symbol, s]));
          for (const s of symbols) {
            existingMap.set(s.symbol, s);
          }
          set({ activeSymbols: Array.from(existingMap.values()) });
        }
      } catch (err) {
        console.warn('[MarketStore] Active symbols notice:', err);
      } finally {
        set({ isInitializing: false });
      }
    },

    setSelectedSymbol: (selectedSymbol: string) => {
      set({ selectedSymbol });
      get().subscribeSymbol(selectedSymbol);
    },

    subscribeSymbol: (symbol: string) => {
      const { subscribedSymbols } = get();
      if (!subscribedSymbols.includes(symbol)) {
        set({ subscribedSymbols: [...subscribedSymbols, symbol] });
      }
      derivSocket.subscribeTicks(symbol, 200);
    },

    subscribeAllVisible: (symbols: string[]) => {
      const { subscribedSymbols } = get();
      const newSymbols = symbols.filter((s) => !subscribedSymbols.includes(s));
      if (newSymbols.length > 0) {
        set({ subscribedSymbols: [...subscribedSymbols, ...newSymbols] });
      }
      for (const sym of symbols) {
        derivSocket.subscribeTicks(sym, 100);
      }
    },

    unsubscribeSymbol: (symbol: string) => {
      derivSocket.unsubscribeTicks(symbol);
      set((state) => ({
        subscribedSymbols: state.subscribedSymbols.filter((s) => s !== symbol),
      }));
    },

    getBuffer: (symbol: string) => {
      const { ringBuffers } = get();
      return ringBuffers[symbol] || new RingBuffer<TickData>(500);
    },
  };
});
