import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CONFIG } from "../config/index.js";
import { CacheService } from "../services/cache.js";
import { RateLimiterService } from "../services/rate-limiter.js";
import { NwsClient } from "../services/nws-client.js";
import { Logger } from "../services/logger.js";
import { createBulletinHeader, createBulletinFooter, formatAlert } from "../services/formatter.js";
import { sanitizeInput } from "../utils/sanitizer.js";
import { AlertsResponse } from "../types/index.js";

export function registerAlertsTool(server: McpServer): void {
  const cache = CacheService.getInstance();
  const rateLimiter = RateLimiterService.getInstance();

  server.tool(
    "get_alerts",
    "Retrieve active severe weather alerts and official advisories for a US state from Kaushik's Weather Service.",
    {
      state: z.string().length(2).describe("Two-letter US state code (e.g. CA, NY, TX)"),
    },
    async ({ state }) => {
      const clientId = "anonymous";

      if (rateLimiter.isRateLimited(clientId)) {
        Logger.error("RATE_LIMIT", new Error("Rate limit exceeded"), { clientId });
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
        const sanitizedState = sanitizeInput(state);
        const cacheKey = `alerts:${sanitizedState}`;

        const cachedData = cache.get<AlertsResponse>(cacheKey);
        if (cachedData) {
          Logger.info("CACHE_HIT", "Returning cached alerts data", { state: sanitizedState });
          const features = cachedData.features || [];
          const header = createBulletinHeader("Severe Weather Alerts", `State [${sanitizedState}]`, true);
          const footer = createBulletinFooter();

          if (features.length === 0) {
            return {
              content: [{ type: "text", text: `${header}No active severe weather alerts or advisories for ${sanitizedState}.${footer}` }],
            };
          }

          const formattedAlerts = features.map(formatAlert);
          return {
            content: [{ type: "text", text: `${header}ACTIVE ALERTS FOR ${sanitizedState}:\n\n${formattedAlerts.join("\n")}${footer}` }],
          };
        }

        Logger.info("ALERTS_REQUEST", "Fetching alerts data", { state: sanitizedState });
        const alertsUrl = `${CONFIG.NWS_API_BASE}/alerts?area=${sanitizedState}`;
        const alertsData = await NwsClient.fetch<AlertsResponse>(alertsUrl);

        if (!alertsData) {
          Logger.error("ALERTS_REQUEST", new Error("Failed to retrieve alerts data"), { state: sanitizedState });
          return {
            content: [
              {
                type: "text",
                text: `${createBulletinHeader("Alerts Notification", `State [${sanitizedState}]`)}Failed to retrieve alerts from NWS. Please try again later.${createBulletinFooter()}`,
              },
            ],
          };
        }

        cache.set(cacheKey, alertsData);
        Logger.info("CACHE_SET", "Cached alerts data", { state: sanitizedState });

        const features = alertsData.features || [];
        const header = createBulletinHeader("Severe Weather Alerts", `State [${sanitizedState}]`, false);
        const footer = createBulletinFooter();

        if (features.length === 0) {
          return {
            content: [{ type: "text", text: `${header}No active severe weather alerts or advisories for ${sanitizedState}.${footer}` }],
          };
        }

        const formattedAlerts = features.map(formatAlert);
        return {
          content: [{ type: "text", text: `${header}ACTIVE ALERTS FOR ${sanitizedState}:\n\n${formattedAlerts.join("\n")}${footer}` }],
        };
      } catch (error) {
        Logger.error("ALERTS_REQUEST", error, { state, clientId });
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
}
