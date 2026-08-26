import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CONFIG } from "../config/index.js";
import { CacheService } from "../services/cache.js";
import { RateLimiterService } from "../services/rate-limiter.js";
import { Logger } from "../services/logger.js";
import { createBulletinHeader, createBulletinFooter } from "../services/formatter.js";
import { HealthCheckData, ServerMetricsData } from "../types/index.js";

export function registerDiagnosticTools(server: McpServer): void {
  const cache = CacheService.getInstance();
  const rateLimiter = RateLimiterService.getInstance();

  server.tool(
    "health_check",
    "Check system health, uptime, cache metrics, and operational diagnostics for Kaushik's Weather Service.",
    {},
    async () => {
      cache.cleanup();
      rateLimiter.cleanup();

      const healthData: HealthCheckData = {
        server: CONFIG.SERVER_NAME,
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: CONFIG.SERVER_VERSION,
        uptimeSeconds: Math.round(process.uptime()),
        memory: {
          usedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          totalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
        cache: {
          entriesCount: cache.size,
          ttlMilliseconds: CONFIG.CACHE_TTL_MS,
        },
        rateLimit: {
          activeClients: rateLimiter.activeClientsCount,
          maxRequestsPerWindow: CONFIG.MAX_REQUESTS_PER_WINDOW,
          windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
        },
        upstreamApi: {
          provider: "National Weather Service (NWS)",
          baseUrl: CONFIG.NWS_API_BASE,
          timeoutMs: CONFIG.REQUEST_TIMEOUT_MS,
          maxRetries: CONFIG.MAX_RETRIES,
        },
      };

      const header = createBulletinHeader("System Diagnostic & Health Report", "Local MCP Host");
      const footer = createBulletinFooter();

      return {
        content: [{ type: "text", text: `${header}${JSON.stringify(healthData, null, 2)}${footer}` }],
      };
    },
  );

  server.tool(
    "clear_cache",
    "Clear in-memory cache for Kaushik's Weather Service.",
    {},
    async () => {
      const purged = cache.clear();
      Logger.info("CACHE_CLEAR", "Cache cleared", { previousSize: purged });

      const header = createBulletinHeader("Cache Maintenance Operation", "In-Memory Cache Store");
      const footer = createBulletinFooter();

      return {
        content: [{ type: "text", text: `${header}Status: In-memory cache cleared successfully.\nEntries Purged: ${purged}${footer}` }],
      };
    },
  );

  server.tool(
    "get_metrics",
    "Retrieve detailed performance metrics and runtime analytics for Kaushik's Weather Service.",
    {},
    async () => {
      const metrics: ServerMetricsData = {
        service: CONFIG.SERVER_NAME,
        version: CONFIG.SERVER_VERSION,
        timestamp: new Date().toISOString(),
        cache: {
          size: cache.size,
        },
        rateLimit: {
          activeClients: rateLimiter.activeClientsCount,
          clients: rateLimiter.getClientEntries(),
        },
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      };

      const header = createBulletinHeader("Performance Metrics & Diagnostics", "Local MCP Host");
      const footer = createBulletinFooter();

      return {
        content: [{ type: "text", text: `${header}${JSON.stringify(metrics, null, 2)}${footer}` }],
      };
    },
  );
}
