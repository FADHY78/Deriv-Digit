import type { ConnectionState, TickData, SyntheticSymbol } from '../types/deriv';
import { extractLastDigit } from './analysisEngine';

type ConnectionStateListener = (state: ConnectionState) => void;
type TickListener = (tick: TickData) => void;

interface PendingRequest {
  payload: Record<string, any>;
  resolve: (val: any) => void;
  reject: (err: any) => void;
}

class DerivSocketService {
  private ws: WebSocket | null = null;
  private appId: string = '1089'; // Numeric public App ID for Deriv WebSocket feed
  private token: string | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private pingIntervalId: any = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 15;
  private reconnectTimeoutId: any = null;

  // Primary and fallback WebSocket Gateways
  private endpoints: string[] = [
    'wss://ws.derivws.com/websockets/v3',
    'wss://frontend.binaryws.com/websockets/v3',
    'wss://blue.derivws.com/websockets/v3',
  ];
  private currentEndpointIndex: number = 0;

  // Active subscriptions tracking (symbol -> boolean)
  private subscribedSymbols: Set<string> = new Set();
  private subscriptionIdMap: Map<string, string> = new Map(); // symbol -> subscriptionId

  // Queue for messages sent while socket is connecting or offline
  private messageQueue: PendingRequest[] = [];

  // Callbacks & listeners
  private stateListeners: Set<ConnectionStateListener> = new Set();
  private tickListeners: Set<TickListener> = new Set();
  private reqCallbacks: Map<number, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private reqIdCounter: number = 1;

  constructor() {
    // Singleton instance
  }

  public setAppId(appId: string) {
    if (appId && /^\d+$/.test(appId) && this.appId !== appId) {
      this.appId = appId;
      if (this.connectionState === 'connected') {
        this.reconnect();
      }
    }
  }

  public setToken(token: string | null) {
    this.token = token ? token.trim() : null;
  }

  public connect(appId?: string): Promise<void> {
    if (appId && /^\d+$/.test(appId)) {
      this.appId = appId;
    }

    return new Promise((resolve) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        // Wait until OPEN or CLOSED
        const checkReady = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            resolve();
          } else if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
            this.initSocket(resolve);
          } else {
            setTimeout(checkReady, 50);
          }
        };
        setTimeout(checkReady, 50);
        return;
      }

      this.initSocket(resolve);
    });
  }

  private initSocket(onOpenCallback?: () => void) {
    this.updateState('connecting');
    const baseEndpoint = this.endpoints[this.currentEndpointIndex % this.endpoints.length];
    const numericAppId = /^\d+$/.test(this.appId) ? this.appId : '1089';
    const url = `${baseEndpoint}?app_id=${numericAppId}&l=en&brand=deriv`;

    try {
      if (this.ws) {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        try {
          this.ws.close();
        } catch (e) {
          // ignore
        }
      }

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.updateState('connected');
        this.reconnectAttempts = 0;
        this.startPing();

        // 1. Flush queued messages
        this.flushQueue();

        // 2. Re-subscribe to all active symbols
        this.resubscribeActiveSymbols();

        if (onOpenCallback) {
          onOpenCallback();
        }
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.warn(`[DerivSocket] Error on endpoint ${baseEndpoint}:`, error);
        this.currentEndpointIndex++;
        this.updateState('error');
      };

      this.ws.onclose = () => {
        this.updateState('disconnected');
        this.stopPing();
        this.scheduleReconnect();
      };
    } catch (err) {
      console.error('[DerivSocket] Failed to create WebSocket:', err);
      this.currentEndpointIndex++;
      this.updateState('error');
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.stopPing();
    if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
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

  /**
   * Safely sends a request. If socket is connecting or disconnected, queues it and executes immediately upon connection.
   */
  public sendRequest<T = any>(requestData: Record<string, any>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.executeSend(requestData, resolve, reject);
      } else {
        this.messageQueue.push({ payload: requestData, resolve, reject });
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
          this.connect();
        }
      }
    });
  }

  private executeSend(
    requestData: Record<string, any>,
    resolve: (val: any) => void,
    reject: (err: any) => void
  ) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.messageQueue.push({ payload: requestData, resolve, reject });
      return;
    }

    const reqId = this.reqIdCounter++;
    const payload = { ...requestData, req_id: reqId };

    this.reqCallbacks.set(reqId, { resolve, reject });

    try {
      this.ws.send(JSON.stringify(payload));
    } catch (err) {
      this.reqCallbacks.delete(reqId);
      reject(err);
    }
  }

  private flushQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const queueToProcess = [...this.messageQueue];
    this.messageQueue = [];

    for (const item of queueToProcess) {
      this.executeSend(item.payload, item.resolve, item.reject);
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

          this.tickListeners.forEach((listener) => {
            try {
              listener(tick);
            } catch (err) {
              console.error('[DerivSocket] Error in tick listener:', err);
            }
          });
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
            this.tickListeners.forEach((listener) => {
              try {
                listener(tick);
              } catch (err) {
                // ignore
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('[DerivSocket] Error handling message:', err);
    }
  }

  // --- DERIV API HELPERS ---

  public async authorize(token: string) {
    if (!token || typeof token !== 'string' || !token.trim()) {
      return { error: { message: 'Invalid token.' } };
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
      console.warn('[DerivSocket] getActiveSymbols fallback:', e);
      return [];
    }
  }

  public subscribeTicks(symbol: string, historyCount: number = 100) {
    this.subscribedSymbols.add(symbol);

    // 1. Fetch initial tick history for immediate charts
    this.sendRequest({
      ticks_history: symbol,
      count: historyCount,
      end: 'latest',
      style: 'ticks',
    }).catch(() => {});

    // 2. Subscribe to live stream
    this.sendRequest({
      ticks: symbol,
      subscribe: 1,
    })
      .then((res) => {
        if (res.subscription?.id) {
          this.subscriptionIdMap.set(symbol, res.subscription.id);
        }
      })
      .catch((err) => {
        console.warn(`[DerivSocket] Ticks subscription notice for ${symbol}:`, err);
      });
  }

  public unsubscribeTicks(symbol: string) {
    this.subscribedSymbols.delete(symbol);
    const subId = this.subscriptionIdMap.get(symbol);
    if (subId) {
      this.sendRequest({ forget: subId }).catch(() => {});
      this.subscriptionIdMap.delete(symbol);
    }
  }

  private resubscribeActiveSymbols() {
    const symbols = Array.from(this.subscribedSymbols);
    for (const sym of symbols) {
      // Re-send ticks subscription on reconnect
      this.sendRequest({
        ticks: sym,
        subscribe: 1,
      })
        .then((res) => {
          if (res.subscription?.id) {
            this.subscriptionIdMap.set(sym, res.subscription.id);
          }
        })
        .catch(() => {});
    }
  }

  private updateState(state: ConnectionState) {
    this.connectionState = state;
    this.stateListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        // ignore
      }
    });
  }

  private startPing() {
    this.stopPing();
    this.pingIntervalId = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ ping: 1 }));
      }
    }, 20000);
  }

  private stopPing() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[DerivSocket] Retrying connection...');
      this.reconnectAttempts = 0;
    }
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
    this.reconnectAttempts++;
    this.currentEndpointIndex++;
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

export const derivSocket = new DerivSocketService();
