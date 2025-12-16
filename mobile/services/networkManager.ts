import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosRequestConfig } from 'axios';

const QUEUE_KEY = 'pb_offline_queue_v1';

type QueuedRequest = AxiosRequestConfig & { id: string };

class NetworkManager {
  private online = true;
  private queue: QueuedRequest[] = [];
  private subscribers: Array<(online: boolean) => void> = [];

  constructor() {
    this.init();
  }

  private async init() {
    const state = await NetInfo.fetch();
    this.online = state.isConnected ?? true;
    this.loadQueue();
    NetInfo.addEventListener(this.onChange.bind(this));
  }

  private async loadQueue() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (raw) this.queue = JSON.parse(raw) as QueuedRequest[];
    } catch (e) {
      this.queue = [];
    }
  }

  private async persistQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      // ignore
    }
  }

  isOnline() {
    return this.online;
  }

  subscribe(cb: (online: boolean) => void) {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  private notify() {
    this.subscribers.forEach((s) => s(this.online));
  }

  private async onChange(state: NetInfoState) {
    const nowe = !!state.isConnected;
    const prev = this.online;
    this.online = nowe;
    if (prev !== nowe) this.notify();
    if (nowe) this.replayQueue();
  }

  queueRequest(req: AxiosRequestConfig) {
    const q: QueuedRequest = { ...req, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` };
    // Deduplicate simple cases by url+method+body
    const exists = this.queue.find((r) => r.url === q.url && r.method === q.method && JSON.stringify(r.data) === JSON.stringify(q.data));
    if (!exists) this.queue.push(q);
    this.persistQueue();
  }

  async clearQueue() {
    this.queue = [];
    await this.persistQueue();
  }

  // Replay by using global axios instance; errors will be logged but not re-queued infinitely
  private async replayQueue() {
    if (!this.queue.length) return;
    // eslint-disable-next-line global-require
    const { axiosInstance } = require('./api');
    const items = [...this.queue];
    this.queue = [];
    await this.persistQueue();

    for (const item of items) {
      try {
        await axiosInstance.request(item);
      } catch (e) {
        // If still failing, we could re-queue; for now we log and drop to avoid loops
        // eslint-disable-next-line no-console
        console.warn('[NetworkManager] replay failed for', item.url, e?.message || e);
      }
    }
  }
}

const networkManager = new NetworkManager();
export default networkManager;
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AxiosInstance } from 'axios';
import { EnhancedAxiosRequestConfig } from '../types/api';

class SimpleEventEmitter {
  private listeners: Record<string, Array<(...args: any[]) => void>> = {};

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  removeListener(event: string, listener: (...args: any[]) => void) {
    this.listeners[event] = (this.listeners[event] || []).filter((cb) => cb !== listener);
  }

  emit(event: string, ...args: any[]) {
    (this.listeners[event] || []).forEach((listener) => listener(...args));
  }
}

interface QueuedRequest {
  config: EnhancedAxiosRequestConfig;
  resolve: (config: EnhancedAxiosRequestConfig) => void;
  reject: (reason?: unknown) => void;
  dedupeKey?: string;
}

class NetworkManager {
  private status: NetInfoState | null = null;
  private queue: QueuedRequest[] = [];
  private dedupeMap = new Map<string, Promise<EnhancedAxiosRequestConfig>>();
  private emitter = new SimpleEventEmitter();
  private client: AxiosInstance | null = null;

  constructor() {
    NetInfo.addEventListener((state) => {
      this.status = state;
      this.emitter.emit('change', state);
      if (this.isConsideredOnline(state)) {
        this.flushQueue();
      }
    });

    void NetInfo.fetch().then((state) => {
      this.status = state;
    });
  }

  registerClient(client: AxiosInstance) {
    this.client = client;
  }

  async isOnline(): Promise<boolean> {
    if (this.status) {
      return this.isConsideredOnline(this.status);
    }
    const current = await NetInfo.fetch();
    this.status = current;
    return this.isConsideredOnline(current);
  }

  getStatus(): NetInfoState | null {
    return this.status;
  }

  onStatusChange(listener: (state: NetInfoState) => void) {
    this.emitter.on('change', listener);
    return () => this.emitter.removeListener('change', listener);
  }

  enqueue(config: EnhancedAxiosRequestConfig): Promise<EnhancedAxiosRequestConfig> {
    const dedupeKey = config.meta?.dedupeKey;
    if (dedupeKey && config.allowDeduplication !== false) {
      const existing = this.dedupeMap.get(dedupeKey);
      if (existing) {
        return existing;
      }
    }

    const promise = new Promise<EnhancedAxiosRequestConfig>((resolve, reject) => {
      this.queue.push({ config, resolve, reject, dedupeKey });
    });

    if (dedupeKey && config.allowDeduplication !== false) {
      this.dedupeMap.set(dedupeKey, promise);
    }

    return promise;
  }

  flushQueue() {
    const pending = [...this.queue];
    this.queue = [];
    pending.forEach(({ config, resolve, dedupeKey }) => {
      if (dedupeKey) {
        this.dedupeMap.delete(dedupeKey);
      }
      resolve({ ...config });
    });
  }

  async flushQueueImmediately() {
    if (!this.client) {
      return;
    }
    const pending = [...this.queue];
    this.queue = [];

    await Promise.all(
      pending.map(async ({ config, reject, dedupeKey }) => {
        try {
          if (dedupeKey) {
            this.dedupeMap.delete(dedupeKey);
          }
          await this.client?.(config);
        } catch (error) {
          reject(error);
        }
      }),
    );
  }

  getQueueSize() {
    return this.queue.length;
  }

  private isConsideredOnline(state: NetInfoState) {
    return state.isConnected === true && state.isInternetReachable !== false;
  }
}

const networkManager = new NetworkManager();
export default networkManager;
