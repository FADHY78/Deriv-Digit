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
  subscribeSymbol: (symbol: string) => Promise<void>;
  unsubscribeSymbol: (symbol: string) => Promise<void>;
  getBuffer: (symbol: string) => RingBuffer<TickData>;
}

// Pre-populate default popular synthetic indices
const DEFAULT_SYNTHETICS: SyntheticSymbol[] = [
  { symbol: 'R_10', displayName: 'Volatility 10 Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 3 },
  { symbol: '1HZ10V', displayName: 'Volatility 10 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 3 },
  { symbol: 'R_25', displayName: 'Volatility 25 Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 3 },
  { symbol: '1HZ25V', displayName: 'Volatility 25 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 3 },
  { symbol: 'R_50', displayName: 'Volatility 50 Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 4 },
  { symbol: '1HZ50V', displayName: 'Volatility 50 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 4 },
  { symbol: 'R_75', displayName: 'Volatility 75 Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 4 },
  { symbol: '1HZ75V', displayName: 'Volatility 75 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 4 },
  { symbol: 'R_100', displayName: 'Volatility 100 Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 2 },
  { symbol: '1HZ100V', displayName: 'Volatility 100 (1s) Index', market: 'synthetic_index', submarket: 'random_index', pipSize: 2 },
  { symbol: 'BOOM500', displayName: 'Boom 500 Index', market: 'synthetic_index', submarket: 'random_daily', pipSize: 4 },
  { symbol: 'CRASH500', displayName: 'Crash 500 Index', market: 'synthetic_index', submarket: 'random_daily', pipSize: 4 },
];

export const useMarketStore = create<MarketState>((set, get) => {
  // Listen for socket connection status
  derivSocket.onStateChange((connectionState) => {
    set({ connectionState });
  });

  // Listen for tick updates from DerivSocketService
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
        [tick.symbol]: tick,
      },
    });
  });

  return {
    connectionState: 'disconnected',
    activeSymbols: DEFAULT_SYNTHETICS,
    ringBuffers: {},
    latestTicks: {},
    subscribedSymbols: [],
    selectedSymbol: 'R_100',
    isInitializing: false,

    setConnectionState: (connectionState) => set({ connectionState }),

    loadActiveSymbols: async () => {
      set({ isInitializing: true });
      try {
        await derivSocket.connect();
        const symbols = await derivSocket.getActiveSymbols();
        if (symbols && symbols.length > 0) {
          set({ activeSymbols: symbols });
        }
      } catch (err) {
        console.warn('[MarketStore] Using fallback default synthetic indices:', err);
      } finally {
        set({ isInitializing: false });
      }
    },

    setSelectedSymbol: (selectedSymbol: string) => {
      set({ selectedSymbol });
      get().subscribeSymbol(selectedSymbol);
    },

    subscribeSymbol: async (symbol: string) => {
      const { subscribedSymbols } = get();
      if (!subscribedSymbols.includes(symbol)) {
        await derivSocket.subscribeTicks(symbol, 500);
        // Manage maximum 5 active symbol subscriptions
        let newSubscribed = [...subscribedSymbols, symbol];
        if (newSubscribed.length > 5) {
          newSubscribed = newSubscribed.slice(-5);
        }
        set({ subscribedSymbols: newSubscribed });
      }
    },

    unsubscribeSymbol: async (symbol: string) => {
      await derivSocket.unsubscribeTicks(symbol);
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
