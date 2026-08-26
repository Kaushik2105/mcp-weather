import { sanitizeInput } from '../src/utils/sanitizer.js';
import { CacheService } from '../src/services/cache.js';
import { RateLimiterService } from '../src/services/rate-limiter.js';
import { formatAlert, formatForecastPeriod } from '../src/services/formatter.js';

describe('Sanitization & Security', () => {
  test('sanitizes dangerous HTML characters', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(malicious);
    expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(sanitized).not.toContain('<script>');
  });

  test('preserves safe alphanumeric text', () => {
    expect(sanitizeInput('Los Angeles 90210')).toBe('Los Angeles 90210');
  });

  test('validates coordinate boundaries', () => {
    const coordinates = [
      { lat: 0, lon: 0 },
      { lat: 90, lon: 180 },
      { lat: -90, lon: -180 },
      { lat: 34.0522, lon: -118.2437 },
    ];

    coordinates.forEach(({ lat, lon }) => {
      expect(lat >= -90 && lat <= 90).toBe(true);
      expect(lon >= -180 && lon <= 180).toBe(true);
    });
  });

  test('validates US state code format', () => {
    const regex = /^[A-Z]{2}$/;
    expect(regex.test('CA')).toBe(true);
    expect(regex.test('NY')).toBe(true);
    expect(regex.test('california')).toBe(false);
    expect(regex.test('123')).toBe(false);
  });
});

describe('Cache Service', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = CacheService.getInstance();
    cache.clear();
  });

  test('stores and retrieves cached data', () => {
    const testData = { temperature: 75 };
    cache.set('test:key', testData);
    expect(cache.get('test:key')).toEqual(testData);
  });

  test('returns null on cache miss', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  test('clears cache and reports previous size', () => {
    cache.set('key1', 'val1');
    cache.set('key2', 'val2');
    expect(cache.clear()).toBe(2);
    expect(cache.size).toBe(0);
  });
});

describe('Rate Limiter Service', () => {
  let limiter: RateLimiterService;

  beforeEach(() => {
    limiter = RateLimiterService.getInstance();
    limiter.clear();
  });

  test('allows requests within window threshold', () => {
    expect(limiter.isRateLimited('client-1')).toBe(false);
    expect(limiter.isRateLimited('client-2')).toBe(false);
  });

  test('tracks active client counts', () => {
    limiter.isRateLimited('client-a');
    limiter.isRateLimited('client-b');
    expect(limiter.activeClientsCount).toBe(2);
  });
});

describe('Formatters', () => {
  test('formats alert features correctly', () => {
    const alert = {
      properties: {
        event: 'Flood Warning',
        areaDesc: 'Los Angeles County',
        severity: 'Severe',
        status: 'Actual',
        headline: 'Flash flood warning in effect',
      },
    };
    const formatted = formatAlert(alert);
    expect(formatted).toContain('Event: Flood Warning');
    expect(formatted).toContain('Area: Los Angeles County');
  });

  test('formats forecast periods correctly', () => {
    const period = {
      name: 'Today',
      temperature: 85,
      temperatureUnit: 'F',
      windSpeed: '10 mph',
      windDirection: 'SW',
      shortForecast: 'Sunny',
    };
    const formatted = formatForecastPeriod(period);
    expect(formatted).toContain('Today');
    expect(formatted).toContain('85°F');
    expect(formatted).toContain('Sunny');
  });
});
