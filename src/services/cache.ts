import { CONFIG } from "../config/index.js";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class CacheService {
  private static instance: CacheService;
  private readonly store = new Map<string, CacheEntry<unknown>>();

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  get<T>(key: string): T | null {
    const cached = this.store.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp < CONFIG.CACHE_TTL_MS) {
      return cached.data as T;
    }

    this.store.delete(key);
    return null;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, { data, timestamp: Date.now() });
  }

  clear(): number {
    const previousSize = this.store.size;
    this.store.clear();
    return previousSize;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now - value.timestamp > CONFIG.CACHE_TTL_MS) {
        this.store.delete(key);
      }
    }
  }

  get size(): number {
    return this.store.size;
  }
}
