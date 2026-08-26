export const CONFIG = {
  SERVER_NAME: "Kaushik's Weather MCP Server",
  SERVER_VERSION: "2.0.0",
  NWS_API_BASE: "https://api.weather.gov",
  USER_AGENT: "weather-app/2.0 (contact@kaushik.dev)",
  CACHE_TTL_MS: 5 * 60 * 1000,
  REQUEST_TIMEOUT_MS: 10000,
  MAX_RETRIES: 3,
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  MAX_REQUESTS_PER_WINDOW: 100,
} as const;
