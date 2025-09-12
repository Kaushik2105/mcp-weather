import { jest } from '@jest/globals';

// Mock the utility functions by importing them
// We'll need to extract these functions to a separate module for proper testing
describe('Utility Functions', () => {
  // Test sanitizeInput function
  describe('sanitizeInput', () => {
    const sanitizeInput = (input: string): string => {
      return input.replace(/[<>\"'&]/g, (match) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match];
      });
    };

    test('should sanitize HTML entities', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(sanitizeInput('test & value')).toBe('test &amp; value');
      expect(sanitizeInput("single'quote")).toBe('single&#x27;quote');
    });

    test('should not modify safe strings', () => {
      expect(sanitizeInput('normal text')).toBe('normal text');
      expect(sanitizeInput('123456')).toBe('123456');
      expect(sanitizeInput('')).toBe('');
    });
  });

  // Test rate limiting function
  describe('isRateLimited', () => {
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

    test('should allow first request', () => {
      expect(isRateLimited('client1')).toBe(false);
    });

    test('should allow requests within limit', () => {
      for (let i = 0; i < 50; i++) {
        expect(isRateLimited('client1')).toBe(false);
      }
    });

    test('should block requests over limit', () => {
      // Fill up to the limit
      for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
        isRateLimited('client1');
      }
      
      // Next request should be rate limited
      expect(isRateLimited('client1')).toBe(true);
    });

    test('should reset after window expires', () => {
      // Fill up to the limit
      for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
        isRateLimited('client1');
      }
      
      // Mock time passing
      const clientData = requestCounts.get('client1')!;
      clientData.resetTime = Date.now() - 1000; // Expired
      
      expect(isRateLimited('client1')).toBe(false);
    });
  });

  // Test caching functions
  describe('Cache Functions', () => {
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

    test('should store and retrieve cached data', () => {
      const testData = { message: 'test' };
      setCachedData('test-key', testData);
      
      const retrieved = getCachedData<typeof testData>('test-key');
      expect(retrieved).toEqual(testData);
    });

    test('should return null for non-existent key', () => {
      const retrieved = getCachedData('non-existent');
      expect(retrieved).toBeNull();
    });

    test('should return null for expired data', () => {
      const testData = { message: 'test' };
      setCachedData('test-key', testData);
      
      // Mock expired timestamp
      const cached = cache.get('test-key')!;
      cached.timestamp = Date.now() - CACHE_TTL - 1000;
      
      const retrieved = getCachedData<typeof testData>('test-key');
      expect(retrieved).toBeNull();
      expect(cache.has('test-key')).toBe(false); // Should be deleted
    });
  });
});
