import { jest } from '@jest/globals';

describe('Performance Tests', () => {
  describe('Caching Performance', () => {
    const cache = new Map<string, { data: any; timestamp: number }>();
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    const getCachedData = <T>(key: string): T | null => {
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data as T;
      }
      cache.delete(key);
      return null;
    };

    const setCachedData = <T>(key: string, data: T): void => {
      cache.set(key, { data, timestamp: Date.now() });
    };

    beforeEach(() => {
      cache.clear();
    });

    test('should handle large cache efficiently', () => {
      const startTime = Date.now();
      
      // Add 1000 items to cache
      for (let i = 0; i < 1000; i++) {
        setCachedData(`key-${i}`, { id: i, data: `test-data-${i}` });
      }
      
      const setTime = Date.now() - startTime;
      expect(setTime).toBeLessThan(100); // Should be very fast
      expect(cache.size).toBe(1000);
    });

    test('should retrieve cached data quickly', () => {
      // Pre-populate cache
      for (let i = 0; i < 1000; i++) {
        setCachedData(`key-${i}`, { id: i, data: `test-data-${i}` });
      }

      const startTime = Date.now();
      
      // Retrieve 100 random items
      for (let i = 0; i < 100; i++) {
        const randomKey = `key-${Math.floor(Math.random() * 1000)}`;
        getCachedData(randomKey);
      }
      
      const retrievalTime = Date.now() - startTime;
      expect(retrievalTime).toBeLessThan(50); // Should be very fast
    });

    test('should clean up expired entries efficiently', () => {
      // Add items with different timestamps
      const now = Date.now();
      for (let i = 0; i < 100; i++) {
        const timestamp = now - (i * 1000); // Staggered timestamps
        cache.set(`key-${i}`, { 
          data: `test-${i}`, 
          timestamp 
        });
      }

      const startTime = Date.now();
      
      // Trigger cleanup by accessing expired items
      for (let i = 0; i < 50; i++) {
        getCachedData(`key-${i}`); // These should be expired
      }
      
      const cleanupTime = Date.now() - startTime;
      expect(cleanupTime).toBeLessThan(100);
      expect(cache.size).toBeLessThan(100); // Some items should be cleaned up
    });
  });

  describe('Rate Limiting Performance', () => {
    const requestCounts = new Map<string, { count: number; resetTime: number }>();
    const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
    const MAX_REQUESTS_PER_WINDOW = 100;

    const isRateLimited = (clientId: string): boolean => {
      const now = Date.now();
      const clientData = requestCounts.get(clientId);
      
      if (!clientData || now > clientData.resetTime) {
        requestCounts.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return false;
      }
      
      if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
        return true;
      }
      
      clientData.count++;
      return false;
    };

    beforeEach(() => {
      requestCounts.clear();
    });

    test('should handle high volume of rate limit checks', () => {
      const startTime = Date.now();
      const clientId = 'test-client';
      
      // Simulate 1000 rate limit checks
      for (let i = 0; i < 1000; i++) {
        isRateLimited(clientId);
      }
      
      const checkTime = Date.now() - startTime;
      expect(checkTime).toBeLessThan(100); // Should be very fast
    });

    test('should handle multiple clients efficiently', () => {
      const startTime = Date.now();
      
      // Simulate 100 clients each making 10 requests
      for (let client = 0; client < 100; client++) {
        for (let req = 0; req < 10; req++) {
          isRateLimited(`client-${client}`);
        }
      }
      
      const checkTime = Date.now() - startTime;
      expect(checkTime).toBeLessThan(200);
      expect(requestCounts.size).toBe(100);
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory with cache operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const cache = new Map<string, { data: any; timestamp: number }>();
      
      // Perform many cache operations
      for (let i = 0; i < 10000; i++) {
        cache.set(`key-${i}`, { 
          data: { id: i, largeData: 'x'.repeat(100) }, 
          timestamp: Date.now() 
        });
        
        // Periodically clean up
        if (i % 1000 === 0) {
          cache.clear();
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
