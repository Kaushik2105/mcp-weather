import { jest } from '@jest/globals';
describe('Security Tests', () => {
    describe('Input Sanitization', () => {
        const sanitizeInput = (input) => {
            return input.replace(/[<>\"'&]/g, (match) => {
                const entities = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#x27;',
                    '&': '&amp;'
                };
                return entities[match];
            });
        };
        test('should prevent XSS attacks', () => {
            const maliciousInputs = [
                '<script>alert("xss")</script>',
                '<img src="x" onerror="alert(1)">',
                'javascript:alert(1)',
                '<iframe src="javascript:alert(1)"></iframe>',
                '<svg onload="alert(1)"></svg>'
            ];
            maliciousInputs.forEach(input => {
                const sanitized = sanitizeInput(input);
                expect(sanitized).not.toContain('<script>');
                expect(sanitized).not.toContain('javascript:');
                expect(sanitized).not.toContain('onerror=');
                expect(sanitized).not.toContain('onload=');
                expect(sanitized).toContain('&lt;');
                expect(sanitized).toContain('&gt;');
            });
        });
        test('should handle SQL injection attempts', () => {
            const sqlInjectionInputs = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "'; INSERT INTO users VALUES ('hacker', 'password'); --",
                "' UNION SELECT * FROM users --"
            ];
            sqlInjectionInputs.forEach(input => {
                const sanitized = sanitizeInput(input);
                expect(sanitized).toContain('&#x27;'); // Single quotes should be escaped
                expect(sanitized).not.toContain("'"); // No unescaped single quotes
            });
        });
        test('should handle HTML entities correctly', () => {
            const testCases = [
                { input: 'test & value', expected: 'test &amp; value' },
                { input: 'price < $100', expected: 'price &lt; $100' },
                { input: 'quote "hello"', expected: 'quote &quot;hello&quot;' },
                { input: "single'quote", expected: 'single&#x27;quote' }
            ];
            testCases.forEach(({ input, expected }) => {
                expect(sanitizeInput(input)).toBe(expected);
            });
        });
    });
    describe('Rate Limiting Security', () => {
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
        beforeEach(() => {
            requestCounts.clear();
        });
        test('should prevent brute force attacks', () => {
            const attackerId = 'attacker';
            // Simulate rapid requests
            for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
                expect(isRateLimited(attackerId)).toBe(false);
            }
            // Next request should be blocked
            expect(isRateLimited(attackerId)).toBe(true);
        });
        test('should handle multiple attackers independently', () => {
            const attacker1 = 'attacker1';
            const attacker2 = 'attacker2';
            const legitimateUser = 'legitimate';
            // Attacker 1 exhausts their limit
            for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
                isRateLimited(attacker1);
            }
            // Attacker 2 should still be able to make requests
            expect(isRateLimited(attacker2)).toBe(false);
            // Legitimate user should not be affected
            expect(isRateLimited(legitimateUser)).toBe(false);
        });
        test('should reset limits after window expires', () => {
            const clientId = 'test-client';
            // Exhaust the limit
            for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
                isRateLimited(clientId);
            }
            // Should be rate limited
            expect(isRateLimited(clientId)).toBe(true);
            // Mock time passing (expire the window)
            const clientData = requestCounts.get(clientId);
            clientData.resetTime = Date.now() - 1000;
            // Should be allowed again
            expect(isRateLimited(clientId)).toBe(false);
        });
    });
    describe('Input Validation', () => {
        test('should validate state codes properly', () => {
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
        test('should validate coordinates properly', () => {
            const validCoordinates = [
                { lat: 0, lon: 0 },
                { lat: 90, lon: 180 },
                { lat: -90, lon: -180 },
                { lat: 34.0522, lon: -118.2437 }
            ];
            const invalidCoordinates = [
                { lat: 91, lon: 0 },
                { lat: -91, lon: 0 },
                { lat: 0, lon: 181 },
                { lat: 0, lon: -181 },
                { lat: NaN, lon: 0 },
                { lat: 0, lon: Infinity }
            ];
            validCoordinates.forEach(({ lat, lon }) => {
                expect(lat >= -90 && lat <= 90).toBe(true);
                expect(lon >= -180 && lon <= 180).toBe(true);
                expect(isFinite(lat) && isFinite(lon)).toBe(true);
            });
            invalidCoordinates.forEach(({ lat, lon }) => {
                const validLat = lat >= -90 && lat <= 90 && isFinite(lat);
                const validLon = lon >= -180 && lon <= 180 && isFinite(lon);
                expect(validLat && validLon).toBe(false);
            });
        });
    });
    describe('Error Information Disclosure', () => {
        test('should not expose sensitive information in errors', () => {
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
        test('should sanitize error context in logs', () => {
            const logError = (operation, error, context) => {
                const timestamp = new Date().toISOString();
                const errorInfo = {
                    timestamp,
                    operation,
                    error: error.message || String(error),
                    stack: error.stack,
                    context: context ? JSON.stringify(context) : undefined
                };
                console.error(`[ERROR] ${JSON.stringify(errorInfo)}`);
            };
            const sensitiveError = new Error('Database connection failed: user=admin, password=secret123');
            const context = { apiKey: 'sk-1234567890', userId: 'user123' };
            // Mock console.error to capture the output
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            logError('TEST_OPERATION', sensitiveError, context);
            const loggedMessage = consoleSpy.mock.calls[0][0];
            // Should not contain sensitive information
            expect(loggedMessage).not.toContain('password=secret123');
            expect(loggedMessage).not.toContain('apiKey');
            expect(loggedMessage).not.toContain('sk-1234567890');
            // Should contain safe information
            expect(loggedMessage).toContain('TEST_OPERATION');
            expect(loggedMessage).toContain('Database connection failed');
            consoleSpy.mockRestore();
        });
    });
});
