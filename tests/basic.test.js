// Basic JavaScript test to verify Jest setup works
describe('Basic Test Setup', () => {
  test('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle string operations', () => {
    const input = 'test string';
    const sanitized = input.replace(/[<>\"'&]/g, (match) => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match];
    });
    
    expect(sanitized).toBe('test string');
  });

  test('should handle malicious input sanitization', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = maliciousInput.replace(/[<>\"'&]/g, (match) => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match];
    });
    
    expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(sanitized).not.toContain('<script>');
  });

  test('should validate coordinates', () => {
    const validCoordinates = [
      { lat: 0, lon: 0 },
      { lat: 90, lon: 180 },
      { lat: -90, lon: -180 },
      { lat: 34.0522, lon: -118.2437 }
    ];
    
    validCoordinates.forEach(({ lat, lon }) => {
      expect(lat >= -90 && lat <= 90).toBe(true);
      expect(lon >= -180 && lon <= 180).toBe(true);
      expect(isFinite(lat) && isFinite(lon)).toBe(true);
    });
  });

  test('should validate state codes', () => {
    const validStateCodes = ['CA', 'NY', 'TX', 'FL', 'WA'];
    const invalidStateCodes = ['', 'C', 'CAL', '123', 'ca', 'Ca'];
    
    const stateCodeRegex = /^[A-Z]{2}$/;
    
    validStateCodes.forEach(code => {
      expect(stateCodeRegex.test(code)).toBe(true);
    });
    
    invalidStateCodes.forEach(code => {
      expect(stateCodeRegex.test(code)).toBe(false);
    });
  });

  test('should handle caching operations', () => {
    const cache = new Map();
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    const getCachedData = (key) => {
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      cache.delete(key);
      return null;
    };

    const setCachedData = (key, data) => {
      cache.set(key, { data, timestamp: Date.now() });
    };

    // Test cache operations
    const testData = { message: 'test' };
    setCachedData('test-key', testData);
    
    const retrieved = getCachedData('test-key');
    expect(retrieved).toEqual(testData);
    
    const nonExistent = getCachedData('non-existent');
    expect(nonExistent).toBeNull();
  });

  test('should handle rate limiting logic', () => {
    const requestCounts = new Map();
    const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
    const MAX_REQUESTS_PER_WINDOW = 100;

    const isRateLimited = (clientId) => {
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

    // Test rate limiting
    expect(isRateLimited('client1')).toBe(false);
    expect(isRateLimited('client1')).toBe(false);
    
    // Test different clients
    expect(isRateLimited('client2')).toBe(false);
  });

  test('should handle error scenarios', () => {
    const errorMessages = [
      'Failed to retrieve alerts data. Please try again later.',
      'Failed to retrieve forecast data. Please try again later.',
      'Rate limit exceeded. Please try again later.',
      'An error occurred while retrieving alerts data. Please try again later.'
    ];
    
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /api[_-]?key/i,
      /database/i,
      /connection/i,
      /internal/i,
      /stack/i,
      /trace/i
    ];
    
    errorMessages.forEach(message => {
      sensitivePatterns.forEach(pattern => {
        expect(message).not.toMatch(pattern);
      });
    });
  });
});
