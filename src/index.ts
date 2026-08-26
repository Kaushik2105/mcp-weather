import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Configuration
const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/2.0";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

// Rate limiting store
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Cache store
const cache = new Map<string, { data: any; timestamp: number }>();

// Utility functions
function sanitizeInput(input: string): string {
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
}

function isRateLimited(clientId: string): boolean {
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
}

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), ms);
  });
}

function logError(operation: string, error: any, context?: any): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    operation,
    error: error.message || String(error),
    stack: error.stack,
    context
  };
  console.error(`[ERROR] ${JSON.stringify(errorInfo)}`);
}

function logInfo(operation: string, message: string, context?: any): void {
  const timestamp = new Date().toISOString();
  const logInfo = {
    timestamp,
    operation,
    message,
    context
  };
  console.log(`[INFO] ${JSON.stringify(logInfo)}`);
}

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "2.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Enhanced NWS API request function with retry logic and timeout
async function makeNWSRequest<T>(url: string, retryCount = 0): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  try {
    logInfo("NWS_REQUEST", `Making request to ${url}`, { retryCount });
    
    const response = await Promise.race([
      fetch(url, { headers }),
      createTimeoutPromise(REQUEST_TIMEOUT)
    ]);

    if (!response.ok) {
      const error = new Error(`HTTP error! status: ${response.status}`);
      logError("NWS_REQUEST", error, { url, status: response.status, retryCount });
      
      // Retry on server errors (5xx) or rate limiting (429)
      if ((response.status >= 500 || response.status === 429) && retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        logInfo("NWS_REQUEST", `Retrying in ${delay}ms`, { retryCount, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeNWSRequest<T>(url, retryCount + 1);
      }
      
      throw error;
    }

    const data = await response.json() as T;
    logInfo("NWS_REQUEST", "Request successful", { url, retryCount });
    return data;
  } catch (error) {
    logError("NWS_REQUEST", error, { url, retryCount });
    
    // Retry on network errors
    if (retryCount < MAX_RETRIES && (error as Error).message !== 'Request timeout') {
      const delay = Math.pow(2, retryCount) * 1000;
      logInfo("NWS_REQUEST", `Retrying in ${delay}ms`, { retryCount, delay });
      await new Promise(resolve => setTimeout(resolve, delay));
      return makeNWSRequest<T>(url, retryCount + 1);
    }
    
    return null;
  }
}

interface AlertFeature {
  properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
    status?: string;
    headline?: string;
  };
}

// Format alert data
function formatAlert(feature: AlertFeature): string {
  const props = feature.properties;
  return [
    `Event: ${sanitizeInput(props.event || "Unknown")}`,
    `Area: ${sanitizeInput(props.areaDesc || "Unknown")}`,
    `Severity: ${sanitizeInput(props.severity || "Unknown")}`,
    `Status: ${sanitizeInput(props.status || "Unknown")}`,
    `Headline: ${sanitizeInput(props.headline || "No headline")}`,
    "---",
  ].join("\n");
}

interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

interface AlertsResponse {
  features: AlertFeature[];
}

interface PointsResponse {
  properties: {
    forecast?: string;
  };
}

interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

// Bulletin formatting helpers
function createBulletinHeader(title: string, target: string, isCacheHit = false): string {
  const cacheTag = isCacheHit ? " [Cached]" : " [Live]";
  return [
    "======================================================================",
    `🌦️ KAUSHIK WEATHER SERVICE - ${title.toUpperCase()}${cacheTag}`,
    "• Provider: Kaushik's Weather MCP Server (v2.0.0)",
    "• Data Authority: National Weather Service (NOAA/NWS)",
    `• Target: ${target}`,
    `• Timestamp: ${new Date().toISOString()}`,
    "======================================================================",
    "",
  ].join("\n");
}

function createBulletinFooter(): string {
  return [
    "",
    "======================================================================",
    "📡 Issued by Kaushik's Weather MCP Server (v2.0.0)",
    "======================================================================",
  ].join("\n");
}

// Register weather tools
server.tool(
  "get_alerts",
  "Retrieve active severe weather alerts and official advisories for a US state from Kaushik's Weather Service.",
  {
    state: z.string().length(2).describe("Two-letter US state code (e.g. CA, NY, TX)"),
  },
  async ({ state }) => {
    const clientId = 'anonymous';
    
    // Rate limiting check
    if (isRateLimited(clientId)) {
      logError("RATE_LIMIT", new Error("Rate limit exceeded"), { clientId });
      return {
        content: [
          {
            type: "text",
            text: `${createBulletinHeader("Alerts Notification", `State [${state}]`)}Status: Rate limit exceeded. Please retry shortly.${createBulletinFooter()}`,
          },
        ],
      };
    }

    try {
      // Sanitize input
      const sanitizedState = sanitizeInput(state);
      const cacheKey = `alerts:${sanitizedState}`;
      
      // Check cache first
      const cachedData = getCachedData<AlertsResponse>(cacheKey);
      if (cachedData) {
        logInfo("CACHE_HIT", "Returning cached alerts data", { state: sanitizedState });
        const features = cachedData.features || [];
        const header = createBulletinHeader("Severe Weather Alerts", `State [${sanitizedState}]`, true);
        const footer = createBulletinFooter();
        
        if (features.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `${header}No active severe weather alerts or advisories for ${sanitizedState}.${footer}`,
              },
            ],
          };
        }
        const formattedAlerts = features.map(formatAlert);
        return {
          content: [
            {
              type: "text",
              text: `${header}ACTIVE ALERTS FOR ${sanitizedState}:\n\n${formattedAlerts.join("\n")}${footer}`,
            },
          ],
        };
      }

      logInfo("ALERTS_REQUEST", "Fetching alerts data", { state: sanitizedState });
      const alertsUrl = `${NWS_API_BASE}/alerts?area=${sanitizedState}`;
      const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

      if (!alertsData) {
        logError("ALERTS_REQUEST", new Error("Failed to retrieve alerts data"), { state: sanitizedState });
        return {
          content: [
            {
              type: "text",
              text: `${createBulletinHeader("Alerts Notification", `State [${sanitizedState}]`)}Failed to retrieve alerts from NWS. Please try again later.${createBulletinFooter()}`,
            },
          ],
        };
      }

      // Cache the response
      setCachedData(cacheKey, alertsData);
      logInfo("CACHE_SET", "Cached alerts data", { state: sanitizedState });

      const features = alertsData.features || [];
      const header = createBulletinHeader("Severe Weather Alerts", `State [${sanitizedState}]`, false);
      const footer = createBulletinFooter();

      if (features.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `${header}No active severe weather alerts or advisories for ${sanitizedState}.${footer}`,
            },
          ],
        };
      }

      const formattedAlerts = features.map(formatAlert);
      return {
        content: [
          {
            type: "text",
            text: `${header}ACTIVE ALERTS FOR ${sanitizedState}:\n\n${formattedAlerts.join("\n")}${footer}`,
          },
        ],
      };
    } catch (error) {
      logError("ALERTS_REQUEST", error, { state, clientId });
      return {
        content: [
          {
            type: "text",
            text: `${createBulletinHeader("Error Notification", `State [${state}]`)}An error occurred while processing alerts.${createBulletinFooter()}`,
          },
        ],
      };
    }
  },
);

server.tool(
  "get_forecast",
  "Retrieve official real-time meteorological forecasts and weather bulletins from Kaushik's Weather Service.",
  {
    latitude: z.number().min(-90).max(90).describe("Latitude of the US location"),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .describe("Longitude of the US location"),
  },
  async ({ latitude, longitude }) => {
    const clientId = 'anonymous';
    
    // Rate limiting check
    if (isRateLimited(clientId)) {
      logError("RATE_LIMIT", new Error("Rate limit exceeded"), { clientId });
      return {
        content: [
          {
            type: "text",
            text: `${createBulletinHeader("Forecast Notification", `Coordinates [${latitude}, ${longitude}]`)}Status: Rate limit exceeded. Please retry shortly.${createBulletinFooter()}`,
          },
        ],
      };
    }

    try {
      // Validate coordinates
      const lat = Number(latitude.toFixed(4));
      const lon = Number(longitude.toFixed(4));
      const cacheKey = `forecast:${lat},${lon}`;
      
      // Check cache first
      const cachedData = getCachedData<ForecastResponse>(cacheKey);
      if (cachedData) {
        logInfo("CACHE_HIT", "Returning cached forecast data", { latitude: lat, longitude: lon });
        const periods = cachedData.properties?.periods || [];
        const header = createBulletinHeader("Meteorological Forecast Bulletin", `Coordinates [${lat}, ${lon}]`, true);
        const footer = createBulletinFooter();
        
        if (periods.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `${header}No forecast periods available for ${lat}, ${lon}.${footer}`,
              },
            ],
          };
        }
        const formattedForecast = periods.map((period: ForecastPeriod) =>
          [
            `📅 ${sanitizeInput(period.name || "Unknown")}:`,
            `   • Temperature: ${period.temperature || "Unknown"}°${sanitizeInput(period.temperatureUnit || "F")}`,
            `   • Wind: ${sanitizeInput(period.windSpeed || "Unknown")} ${sanitizeInput(period.windDirection || "")}`,
            `   • Conditions: ${sanitizeInput(period.shortForecast || "No forecast available")}`,
            "---",
          ].join("\n"),
        );
        return {
          content: [
            {
              type: "text",
              text: `${header}PERIOD FORECASTS:\n\n${formattedForecast.join("\n")}${footer}`,
            },
          ],
        };
      }

      logInfo("FORECAST_REQUEST", "Fetching forecast data", { latitude: lat, longitude: lon });
      
      // Get grid point data
      const pointsUrl = `${NWS_API_BASE}/points/${lat},${lon}`;
      const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

      if (!pointsData) {
        logError("FORECAST_REQUEST", new Error("Failed to retrieve grid point data"), { latitude: lat, longitude: lon });
        return {
          content: [
            {
              type: "text",
              text: `${createBulletinHeader("Location Error", `Coordinates [${lat}, ${lon}]`)}Failed to retrieve grid point data for coordinates ${lat}, ${lon}. Note: Only US locations are supported by the NWS API.${createBulletinFooter()}`,
            },
          ],
        };
      }

      const forecastUrl = pointsData.properties?.forecast;
      if (!forecastUrl) {
        logError("FORECAST_REQUEST", new Error("No forecast URL found"), { latitude: lat, longitude: lon });
        return {
          content: [
            {
              type: "text",
              text: `${createBulletinHeader("Data Error", `Coordinates [${lat}, ${lon}]`)}Failed to resolve forecast endpoint from grid point.${createBulletinFooter()}`,
            },
          ],
        };
      }

      // Get forecast data
      const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
      if (!forecastData) {
        logError("FORECAST_REQUEST", new Error("Failed to retrieve forecast data"), { latitude: lat, longitude: lon });
        return {
          content: [
            {
              type: "text",
              text: `${createBulletinHeader("Network Error", `Coordinates [${lat}, ${lon}]`)}Failed to retrieve forecast data from NWS. Please retry shortly.${createBulletinFooter()}`,
            },
          ],
        };
      }

      // Cache the response
      setCachedData(cacheKey, forecastData);
      logInfo("CACHE_SET", "Cached forecast data", { latitude: lat, longitude: lon });

      const periods = forecastData.properties?.periods || [];
      const header = createBulletinHeader("Meteorological Forecast Bulletin", `Coordinates [${lat}, ${lon}]`, false);
      const footer = createBulletinFooter();

      if (periods.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `${header}No forecast periods available for ${lat}, ${lon}.${footer}`,
            },
          ],
        };
      }

      // Format forecast periods
      const formattedForecast = periods.map((period: ForecastPeriod) =>
        [
          `📅 ${sanitizeInput(period.name || "Unknown")}:`,
          `   • Temperature: ${period.temperature || "Unknown"}°${sanitizeInput(period.temperatureUnit || "F")}`,
          `   • Wind: ${sanitizeInput(period.windSpeed || "Unknown")} ${sanitizeInput(period.windDirection || "")}`,
          `   • Conditions: ${sanitizeInput(period.shortForecast || "No forecast available")}`,
          "---",
        ].join("\n"),
      );

      return {
        content: [
          {
            type: "text",
            text: `${header}PERIOD FORECASTS:\n\n${formattedForecast.join("\n")}${footer}`,
          },
        ],
      };
    } catch (error) {
      logError("FORECAST_REQUEST", error, { latitude, longitude, clientId });
      return {
        content: [
          {
            type: "text",
            text: `${createBulletinHeader("System Error", `Coordinates [${latitude}, ${longitude}]`)}An error occurred while retrieving forecast data.${createBulletinFooter()}`,
          },
        ],
      };
    }
  },
);

// Health check tool
server.tool(
  "health_check",
  "Check system health, uptime, cache metrics, and operational diagnostics for Kaushik's Weather Service.",
  {},
  async () => {
    const now = Date.now();
    const cacheSize = cache.size;
    const activeClients = requestCounts.size;
    
    // Clean up expired cache entries
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        cache.delete(key);
      }
    }
    
    // Clean up expired rate limit entries
    for (const [key, value] of requestCounts.entries()) {
      if (now > value.resetTime) {
        requestCounts.delete(key);
      }
    }

    const healthData = {
      server: "Kaushik's Weather MCP Server",
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        usedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        totalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      cache: {
        entriesCount: cacheSize,
        ttlMilliseconds: CACHE_TTL,
      },
      rateLimit: {
        activeClients,
        maxRequestsPerWindow: MAX_REQUESTS_PER_WINDOW,
        windowMs: RATE_LIMIT_WINDOW,
      },
      upstreamApi: {
        provider: "National Weather Service (NWS)",
        baseUrl: NWS_API_BASE,
        timeoutMs: REQUEST_TIMEOUT,
        maxRetries: MAX_RETRIES,
      }
    };

    const header = createBulletinHeader("System Diagnostic & Health Report", "Local MCP Host");
    const footer = createBulletinFooter();

    return {
      content: [
        {
          type: "text",
          text: `${header}${JSON.stringify(healthData, null, 2)}${footer}`,
        },
      ],
    };
  },
);

// Cache management tool
server.tool(
  "clear_cache",
  "Clear in-memory cache for Kaushik's Weather Service.",
  {},
  async () => {
    const cacheSize = cache.size;
    cache.clear();
    
    logInfo("CACHE_CLEAR", "Cache cleared", { previousSize: cacheSize });
    const header = createBulletinHeader("Cache Maintenance Operation", "In-Memory Cache Store");
    const footer = createBulletinFooter();

    return {
      content: [
        {
          type: "text",
          text: `${header}Status: In-memory cache cleared successfully.\nEntries Purged: ${cacheSize}${footer}`,
        },
      ],
    };
  },
);

// Metrics tool
server.tool(
  "get_metrics",
  "Retrieve detailed performance metrics and runtime analytics for Kaushik's Weather Service.",
  {},
  async () => {
    const metrics = {
      service: "Kaushik's Weather MCP Server",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      cache: {
        size: cache.size,
      },
      rateLimit: {
        activeClients: requestCounts.size,
        clients: Array.from(requestCounts.entries()).map(([client, data]) => ({
          clientId: client,
          requestCount: data.count,
          resetTime: new Date(data.resetTime).toISOString(),
        })),
      },
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    };

    const header = createBulletinHeader("Performance Metrics & Diagnostics", "Local MCP Host");
    const footer = createBulletinFooter();

    return {
      content: [
        {
          type: "text",
          text: `${header}${JSON.stringify(metrics, null, 2)}${footer}`,
        },
      ],
    };
  },
);

// Graceful shutdown handling
function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    logInfo("SHUTDOWN", `Received ${signal}, shutting down gracefully`);
    
    // Clear caches
    cache.clear();
    requestCounts.clear();
    
    logInfo("SHUTDOWN", "Cleanup completed, exiting");
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (error) => {
    logError("UNCAUGHT_EXCEPTION", error);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logError("UNHANDLED_REJECTION", reason);
    process.exit(1);
  });
}

async function main() {
  try {
    setupGracefulShutdown();
    
    logInfo("SERVER_START", "Starting Weather MCP Server v2.0.0");
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logInfo("SERVER_START", "Weather MCP Server running on stdio");
    console.error("Weather MCP Server v2.0.0 running on stdio");
  } catch (error) {
    logError("SERVER_START", error);
    process.exit(1);
  }
}

main().catch((error) => {
  logError("FATAL_ERROR", error);
  process.exit(1);
});