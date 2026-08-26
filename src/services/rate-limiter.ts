import { CONFIG } from "../config/index.js";

interface ClientBucket {
  count: number;
  resetTime: number;
}

export class RateLimiterService {
  private static instance: RateLimiterService;
  private readonly clients = new Map<string, ClientBucket>();

  static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  isRateLimited(clientId: string): boolean {
    const now = Date.now();
    const bucket = this.clients.get(clientId);

    if (!bucket || now > bucket.resetTime) {
      this.clients.set(clientId, { count: 1, resetTime: now + CONFIG.RATE_LIMIT_WINDOW_MS });
      return false;
    }

    if (bucket.count >= CONFIG.MAX_REQUESTS_PER_WINDOW) {
      return true;
    }

    bucket.count++;
    return false;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.clients.entries()) {
      if (now > bucket.resetTime) {
        this.clients.delete(key);
      }
    }
  }

  get activeClientsCount(): number {
    return this.clients.size;
  }

  getClientEntries(): Array<{ clientId: string; requestCount: number; resetTime: string }> {
    return Array.from(this.clients.entries()).map(([client, data]) => ({
      clientId: client,
      requestCount: data.count,
      resetTime: new Date(data.resetTime).toISOString(),
    }));
  }

  clear(): void {
    this.clients.clear();
  }
}
