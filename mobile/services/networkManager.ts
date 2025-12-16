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
      resolve(config);
    });
  }

  queueRequest(config: EnhancedAxiosRequestConfig): Promise<EnhancedAxiosRequestConfig> {
    return this.enqueue(config);
  }

  getClient() {
    return this.client;
  }

  private isConsideredOnline(state: NetInfoState) {
    return !!state.isConnected && !!state.isInternetReachable;
  }
}

const networkManager = new NetworkManager();
export default networkManager;
