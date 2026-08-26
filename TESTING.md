# Weather MCP Server - Testing Suite

## ✅ Test Suite Overview

Comprehensive unit, integration, performance, and security tests covering all modular components of the Weather MCP Server.

## 🧪 Test Coverage

### 1. **Unit Tests** (`tests/unit/`, `tests/basic.test.ts`)
- **Sanitizer**: XSS prevention, entity escaping, boundary checking.
- **CacheService**: In-memory storage, retrieval, TTL handling, memory purge.
- **RateLimiterService**: Token bucket tracking, isolation between client identifiers.
- **Formatters**: Official meteorological bulletin formatting.

### 2. **Integration Tests** (`tests/integration/`)
- Upstream NWS API response parsing.
- Error handling and HTTP status code processing.

### 3. **Performance Tests** (`tests/performance/`)
- Caching throughput under 1,000+ operations.
- Sub-millisecond rate limiter evaluations.

### 4. **Security Tests** (`tests/security/`)
- XSS and SQL injection vector neutralization.
- Brute-force throttling and client isolation.

---

## 🚀 Running Tests

```bash
# Run full test suite
npm test

# Run with coverage report
npm run test:coverage

# Watch mode during development
npm run test:watch
```

**Status**: ✅ **100% Passing (All Suites Verified)**
