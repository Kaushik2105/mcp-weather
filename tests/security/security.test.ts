import { sanitizeInput } from '../../src/utils/sanitizer.js';
import { RateLimiterService } from '../../src/services/rate-limiter.js';

describe('Security Tests', () => {
  describe('Input Sanitization', () => {
    test('neutralizes XSS tags and attributes', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<svg onload="alert(1)"></svg>',
      ];

      maliciousInputs.forEach((input) => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('<iframe>');
        expect(sanitized).toContain('&lt;');
        expect(sanitized).toContain('&gt;');
      });
    });

    test('escapes single and double quotes', () => {
      const sqlInjectionInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      ];

      sqlInjectionInputs.forEach((input) => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).toContain('&#x27;');
        expect(sanitized).not.toContain("'");
      });
    });

    test('handles standard HTML entities', () => {
      const testCases = [
        { input: 'test & value', expected: 'test &amp; value' },
        { input: 'price < $100', expected: 'price &lt; $100' },
        { input: 'quote "hello"', expected: 'quote &quot;hello&quot;' },
        { input: "single'quote", expected: 'single&#x27;quote' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeInput(input)).toBe(expected);
      });
    });
  });

  describe('Rate Limiting Security', () => {
    let limiter: RateLimiterService;

    beforeEach(() => {
      limiter = RateLimiterService.getInstance();
      limiter.clear();
    });

    test('throttles rapid sequential requests', () => {
      const attackerId = 'attacker-ip';
      for (let i = 0; i < 100; i++) {
        expect(limiter.isRateLimited(attackerId)).toBe(false);
      }
      expect(limiter.isRateLimited(attackerId)).toBe(true);
    });

    test('isolates limits across different client identities', () => {
      for (let i = 0; i < 100; i++) {
        limiter.isRateLimited('client-a');
      }
      expect(limiter.isRateLimited('client-a')).toBe(true);
      expect(limiter.isRateLimited('client-b')).toBe(false);
    });
  });
});
