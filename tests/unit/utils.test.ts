import { sanitizeInput } from '../../src/utils/sanitizer.js';
import { RateLimiterService } from '../../src/services/rate-limiter.js';
import { CacheService } from '../../src/services/cache.js';

describe('Sanitizer Unit Tests', () => {
  test('escapes HTML entities in strings', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(sanitizeInput('test & value')).toBe('test &amp; value');
    expect(sanitizeInput("single'quote")).toBe('single&#x27;quote');
  });

  test('keeps safe strings unchanged', () => {
    expect(sanitizeInput('normal text')).toBe('normal text');
    expect(sanitizeInput('123456')).toBe('123456');
    expect(sanitizeInput('')).toBe('');
  });
});

describe('Rate Limiter Unit Tests', () => {
  let limiter: RateLimiterService;

  beforeEach(() => {
    limiter = RateLimiterService.getInstance();
    limiter.clear();
  });

  test('permits initial request', () => {
    expect(limiter.isRateLimited('client1')).toBe(false);
  });

  test('permits multiple requests under the threshold', () => {
    for (let i = 0; i < 50; i++) {
      expect(limiter.isRateLimited('client1')).toBe(false);
    }
  });

  test('blocks requests exceeding maximum threshold', () => {
    for (let i = 0; i < 100; i++) {
      limiter.isRateLimited('client1');
    }
    expect(limiter.isRateLimited('client1')).toBe(true);
  });
});

describe('Cache Unit Tests', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = CacheService.getInstance();
    cache.clear();
  });

  test('stores and returns cached objects', () => {
    const data = { temp: 72 };
    cache.set('key-1', data);
    expect(cache.get('key-1')).toEqual(data);
  });

  test('returns null for missing keys', () => {
    expect(cache.get('missing-key')).toBeNull();
  });

  test('flushes all entries on clear', () => {
    cache.set('k1', 1);
    cache.set('k2', 2);
    expect(cache.clear()).toBe(2);
    expect(cache.size).toBe(0);
  });
});
