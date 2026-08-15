import type { ConnectionState, TickData, SyntheticSymbol } from '../types/deriv';
import { extractLastDigit } from './analysisEngine';

type ConnectionStateListener = (state: ConnectionState) => void;
type TickListener = (tick: TickData) => void;

class DerivSocketService {
  private ws: WebSocket | null = null;
  private appId: string = '1089'; // Default public numeric App ID for WebSocket feed
  private token: string | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private pingIntervalId: any = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimeoutId: any = null;

  // Fallback WebSocket Endpoints
  private endpoints: string[] = [
    'wss://ws.derivws.com/websockets/v3',
    'wss://frontend.binaryws.com/websockets/v3',
    'wss://blue.derivws.com/websockets/v3',
  ];
  private currentEndpointIndex: number = 0;

  // Active subscriptions tracking
  private activeTickSubscriptions: Set<string> = new Set();
  private subscriptionIdMap: Map<string, string> = new Map(); // symbol -> subscriptionId

  // Callbacks & listeners
  private stateListeners: Set<ConnectionStateListener> = new Set();
  private tickListeners: Set<TickListener> = new Set();
  private reqCallbacks: Map<number, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private reqIdCounter: number = 1;

  constructor() {
    // Singleton instance initialization
  }

  public setAppId(appId: string) {
    if (this.appId !== appId) {
      this.appId = appId;
      if (this.connectionState === 'connected') {
        this.reconnect();
      }
    }
  }

  public setToken(token: string | null) {
    this.token = token ? token.trim() : null;
    if (this.connectionState === 'connected' && this.token) {
      this.authorize(this.token);
    }
  }

  public connect(appId?: string): Promise<void> {
    if (appId) this.appId = appId;

    return new Promise((resolve, reject) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        resolve();
        return;
      }

      this.updateState('connecting');
      const baseEndpoint = this.endpoints[this.currentEndpointIndex % this.endpoints.length];

      // WebSocket URL requires a numeric app_id (fallback to 1089 if alphanumeric OAuth client_id was passed)
      const numericAppId = /^\d+$/.test(this.appId) ? this.appId : '1089';
      const url = `${baseEndpoint}?app_id=${numericAppId}&l=en&brand=deriv`;

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.updateState('connected');
          this.reconnectAttempts = 0;
          this.startPing();

          // Re-authorize if token exists
          if (this.token) {
            this.authorize(this.token);
          }

          // Re-subscribe to previously active tick symbols
          this.resubscribeActiveSymbols();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.warn(`[DerivSocket] Error on endpoint ${baseEndpoint}:`, error);
          this.currentEndpointIndex++; // Try next fallback on error
          this.updateState('error');
          reject(error);
        };

        this.ws.onclose = () => {
          this.updateState('disconnected');
          this.stopPing();
          this.scheduleReconnect();
        };
      } catch (err) {
        this.currentEndpointIndex++;
        this.updateState('error');
        reject(err);
      }
    });
  }

  public disconnect() {
    this.stopPing();
    if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.updateState('disconnected');
  }

  public reconnect() {
    this.disconnect();
    this.connect();
  }

  public onStateChange(listener: ConnectionStateListener) {
    this.stateListeners.add(listener);
    listener(this.connectionState);
    return () => this.stateListeners.delete(listener);
  }

  public onTick(listener: TickListener) {
    this.tickListeners.add(listener);
    return () => this.tickListeners.delete(listener);
  }

  public sendRequest<T = any>(requestData: Record<string, any>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.connect().then(() => {
          this.executeSend(requestData, resolve, reject);
        }).catch(reject);
        return;
      }
      this.executeSend(requestData, resolve, reject);
    });
  }

  private executeSend(
    requestData: Record<string, any>,
    resolve: (val: any) => void,
    reject: (err: any) => void
  ) {
    const reqId = this.reqIdCounter++;
    const payload = { ...requestData, req_id: reqId };

    this.reqCallbacks.set(reqId, { resolve, reject });

    try {
      this.ws?.send(JSON.stringify(payload));
    } catch (err) {
      this.reqCallbacks.delete(reqId);
      reject(err);
    }
  }

  private handleMessage(rawMessage: string) {
    try {
      const data = JSON.parse(rawMessage);

      // 1. Check req_id callbacks
      if (data.req_id && this.reqCallbacks.has(data.req_id)) {
        const { resolve, reject } = this.reqCallbacks.get(data.req_id)!;
        this.reqCallbacks.delete(data.req_id);

        if (data.error) {
          reject(data.error);
        } else {
          resolve(data);
        }
      }

      // 2. Handle incoming tick streams
      if (data.msg_type === 'tick' && data.tick) {
        const rawTick = data.tick;
        const pipSize = rawTick.pip_size ?? 2;
        const lastDigit = extractLastDigit(rawTick.quote, pipSize);

        const tick: TickData = {
          symbol: rawTick.symbol,
          quote: rawTick.quote,
          lastDigit,
          epoch: rawTick.epoch,
          id: rawTick.id,
          pipSize,
        };

        // Track subscription ID if present
        if (data.subscription?.id) {
          this.subscriptionIdMap.set(rawTick.symbol, data.subscription.id);
        }

        this.tickListeners.forEach((listener) => listener(tick));
      }

      // 3. Handle ticks history responses
      if (data.msg_type === 'history' && data.history) {
        const times = data.history.times || [];
        const prices = data.history.prices || [];
        const symbol = data.echo_req?.ticks_history;
        const pipSize = data.pip_size || 2;

        if (symbol) {
          for (let i = 0; i < times.length; i++) {
            const quote = prices[i];
            const epoch = times[i];
            const lastDigit = extractLastDigit(quote, pipSize);
            const tick: TickData = {
              symbol,
              quote,
              lastDigit,
              epoch,
              pipSize,
            };
            this.tickListeners.forEach((listener) => listener(tick));
          }
        }
      }

    } catch (err) {
      console.error('[DerivSocket] Error handling message:', err);
    }
  }

  // --- DERIV SPECIFIC API HELPERS ---

  public async authorize(token: string) {
    if (!token || typeof token !== 'string' || !token.trim()) {
      return { error: { message: 'Invalid token: token cannot be empty.' } };
    }
    const cleanToken = token.trim();
    this.token = cleanToken;
    return this.sendRequest({ authorize: cleanToken });
  }

  public async getActiveSymbols(): Promise<SyntheticSymbol[]> {
    const res = await this.sendRequest({
      active_symbols: 'brief',
      product_type: 'basic',
    });

    if (!res.active_symbols) return [];

    // Filter synthetic / volatility indices
    return res.active_symbols
      .filter((item: any) => item.market === 'synthetic_index' || item.submarket.includes('synth'))
      .map((item: any) => ({
        symbol: item.symbol,
        displayName: item.display_name,
        market: item.market,
        submarket: item.submarket,
        pipSize: item.pip_size ?? 2,
      }));
  }

  public async subscribeTicks(symbol: string, historyCount: number = 500) {
    if (this.activeTickSubscriptions.has(symbol)) return;

    // Enforce max 5 concurrent symbol subscriptions to protect performance
    if (this.activeTickSubscriptions.size >= 5) {
      const oldestSymbol = Array.from(this.activeTickSubscriptions)[0];
      await this.unsubscribeTicks(oldestSymbol);
    }

    this.activeTickSubscriptions.add(symbol);

    // Fetch history first
    try {
      await this.sendRequest({
        ticks_history: symbol,
        count: historyCount,
        end: 'latest',
        style: 'ticks',
      });
    } catch (e) {
      console.warn(`[DerivSocket] History fetch warning for ${symbol}:`, e);
    }

    // Then subscribe live
    try {
      const res = await this.sendRequest({
        ticks: symbol,
        subscribe: 1,
      });

      if (res.subscription?.id) {
        this.subscriptionIdMap.set(symbol, res.subscription.id);
      }
    } catch (e) {
      console.error(`[DerivSocket] Ticks subscription failed for ${symbol}:`, e);
    }
  }

  public async unsubscribeTicks(symbol: string) {
    this.activeTickSubscriptions.delete(symbol);
    const subId = this.subscriptionIdMap.get(symbol);
    if (subId) {
      try {
        await this.sendRequest({ forget: subId });
      } catch (e) {
        // ignore
      }
      this.subscriptionIdMap.delete(symbol);
    }
  }

  private resubscribeActiveSymbols() {
    const symbolsToResubscribe = Array.from(this.activeTickSubscriptions);
    this.activeTickSubscriptions.clear();
    for (const sym of symbolsToResubscribe) {
      this.subscribeTicks(sym);
    }
  }

  private updateState(state: ConnectionState) {
    this.connectionState = state;
    this.stateListeners.forEach((listener) => listener(state));
  }

  private startPing() {
    this.stopPing();
    this.pingIntervalId = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ ping: 1 }));
      }
    }, 30000);
  }

  private stopPing() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[DerivSocket] Max reconnect attempts reached.');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    this.currentEndpointIndex++; // Try alternate endpoint on reconnect
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

export const derivSocket = new DerivSocketService();
