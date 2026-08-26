import { CacheService } from '../../src/services/cache.js';
import { RateLimiterService } from '../../src/services/rate-limiter.js';

describe('Performance Tests', () => {
  describe('Caching Performance', () => {
    let cache: CacheService;

    beforeEach(() => {
      cache = CacheService.getInstance();
      cache.clear();
    });

    test('handles bulk insertions efficiently', () => {
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        cache.set(`key-${i}`, { id: i, data: `test-data-${i}` });
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
      expect(cache.size).toBe(1000);
    });

    test('retrieves cached data with minimal latency', () => {
      for (let i = 0; i < 1000; i++) {
        cache.set(`key-${i}`, { id: i, data: `test-data-${i}` });
      }

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        const randomKey = `key-${Math.floor(Math.random() * 1000)}`;
        cache.get(randomKey);
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Rate Limiter Performance', () => {
    let limiter: RateLimiterService;

    beforeEach(() => {
      limiter = RateLimiterService.getInstance();
      limiter.clear();
    });

    test('processes high request volumes under 100ms', () => {
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        limiter.isRateLimited('test-client');
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    test('handles multi-client load efficiently', () => {
      const startTime = Date.now();
      for (let client = 0; client < 100; client++) {
        for (let req = 0; req < 10; req++) {
          limiter.isRateLimited(`client-${client}`);
        }
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200);
      expect(limiter.activeClientsCount).toBe(100);
    });
  });
});
