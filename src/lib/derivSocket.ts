import type { ConnectionState, TickData, SyntheticSymbol } from '../types/deriv';
import { extractLastDigit } from './analysisEngine';

type ConnectionStateListener = (state: ConnectionState) => void;
type TickListener = (tick: TickData) => void;

class DerivSocketService {
  private ws: WebSocket | null = null;
  private appId: string = '1089'; // Public numeric App ID for streaming live WebSocket tick data
  private token: string | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private pingIntervalId: any = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimeoutId: any = null;

  // Primary and fallback WebSocket Gateways
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
      if (!this.token.startsWith('ory_at_') && this.token.length < 50) {
        this.authorize(this.token);
      }
    }
  }

  public connect(appId?: string): Promise<void> {
    if (appId && /^\d+$/.test(appId)) {
      this.appId = appId;
    }

    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        const checkOpen = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            resolve();
          } else if (this.ws?.readyState === WebSocket.CLOSED) {
            reject(new Error('Socket connection failed'));
          } else {
            setTimeout(checkOpen, 50);
          }
        };
        checkOpen();
        return;
      }

      this.updateState('connecting');
      const baseEndpoint = this.endpoints[this.currentEndpointIndex % this.endpoints.length];
      const numericAppId = /^\d+$/.test(this.appId) ? this.appId : '1089';
      const url = `${baseEndpoint}?app_id=${numericAppId}&l=en&brand=deriv`;

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.updateState('connected');
          this.reconnectAttempts = 0;
          this.startPing();

          // Resubscribe to all active tick symbols
          this.resubscribeActiveSymbols();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.warn(`[DerivSocket] Error on endpoint ${baseEndpoint}:`, error);
          this.currentEndpointIndex++;
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
        this.connect()
          .then(() => {
            this.executeSend(requestData, resolve, reject);
          })
          .catch(reject);
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

      // 2. Handle incoming tick streams (msg_type: 'tick' or data.tick)
      if (data.tick || data.msg_type === 'tick') {
        const rawTick = data.tick;
        if (rawTick && typeof rawTick.quote === 'number') {
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

          if (data.subscription?.id) {
            this.subscriptionIdMap.set(rawTick.symbol, data.subscription.id);
          }

          this.tickListeners.forEach((listener) => listener(tick));
        }
      }

      // 3. Handle ticks history responses (msg_type: 'history')
      if (data.msg_type === 'history' && data.history) {
        const times = data.history.times || [];
        const prices = data.history.prices || [];
        const symbol = data.echo_req?.ticks_history;
        const pipSize = data.pip_size || 2;

        if (symbol && times.length > 0) {
          for (let i = 0; i < times.length; i++) {
            const quote = Number(prices[i]);
            const epoch = Number(times[i]);
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
    try {
      const res = await this.sendRequest({
        active_symbols: 'brief',
        product_type: 'basic',
      });

      if (!res.active_symbols) return [];

      return res.active_symbols
        .filter((item: any) => item.market === 'synthetic_index' || (item.submarket && item.submarket.includes('synth')) || item.symbol.startsWith('R_') || item.symbol.startsWith('1HZ') || item.symbol.startsWith('BOOM') || item.symbol.startsWith('CRASH'))
        .map((item: any) => ({
          symbol: item.symbol,
          displayName: item.display_name,
          market: item.market || 'synthetic_index',
          submarket: item.submarket || 'random_index',
          pipSize: item.pip_size ?? 2,
        }));
    } catch (e) {
      console.warn('[DerivSocket] getActiveSymbols error, using defaults:', e);
      return [];
    }
  }

  public async subscribeTicks(symbol: string, historyCount: number = 200) {
    if (this.activeTickSubscriptions.has(symbol)) return;
    this.activeTickSubscriptions.add(symbol);

    // 1. Fetch initial tick history for immediate charts & frequencies
    try {
      this.sendRequest({
        ticks_history: symbol,
        count: historyCount,
        end: 'latest',
        style: 'ticks',
      }).catch((err) => console.warn(`[DerivSocket] History error for ${symbol}:`, err));
    } catch (e) {
      // ignore
    }

    // 2. Subscribe to continuous live stream
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
    }, 25000);
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
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.currentEndpointIndex++;
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

export const derivSocket = new DerivSocketService();
