import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CONFIG } from "../config/index.js";
import { CacheService } from "../services/cache.js";
import { RateLimiterService } from "../services/rate-limiter.js";
import { NwsClient } from "../services/nws-client.js";
import { Logger } from "../services/logger.js";
import { createBulletinHeader, createBulletinFooter, formatForecastPeriod } from "../services/formatter.js";
import { PointsResponse, ForecastResponse } from "../types/index.js";

export function registerForecastTool(server: McpServer): void {
  const cache = CacheService.getInstance();
  const rateLimiter = RateLimiterService.getInstance();

  server.tool(
    "get_forecast",
    "Retrieve official real-time meteorological forecasts and weather bulletins from Kaushik's Weather Service.",
    {
      latitude: z.number().min(-90).max(90).describe("Latitude of the US location"),
      longitude: z.number().min(-180).max(180).describe("Longitude of the US location"),
    },
    async ({ latitude, longitude }) => {
      const clientId = "anonymous";

      if (rateLimiter.isRateLimited(clientId)) {
        Logger.error("RATE_LIMIT", new Error("Rate limit exceeded"), { clientId });
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
        const lat = Number(latitude.toFixed(4));
        const lon = Number(longitude.toFixed(4));
        const cacheKey = `forecast:${lat},${lon}`;

        const cachedData = cache.get<ForecastResponse>(cacheKey);
        if (cachedData) {
          Logger.info("CACHE_HIT", "Returning cached forecast data", { latitude: lat, longitude: lon });
          const periods = cachedData.properties?.periods || [];
          const header = createBulletinHeader("Meteorological Forecast Bulletin", `Coordinates [${lat}, ${lon}]`, true);
          const footer = createBulletinFooter();

          if (periods.length === 0) {
            return {
              content: [{ type: "text", text: `${header}No forecast periods available for ${lat}, ${lon}.${footer}` }],
            };
          }

          const formattedForecast = periods.map(formatForecastPeriod);
          return {
            content: [{ type: "text", text: `${header}PERIOD FORECASTS:\n\n${formattedForecast.join("\n")}${footer}` }],
          };
        }

        Logger.info("FORECAST_REQUEST", "Fetching forecast data", { latitude: lat, longitude: lon });

        const pointsUrl = `${CONFIG.NWS_API_BASE}/points/${lat},${lon}`;
        const pointsData = await NwsClient.fetch<PointsResponse>(pointsUrl);

        if (!pointsData) {
          Logger.error("FORECAST_REQUEST", new Error("Failed to retrieve grid point data"), { latitude: lat, longitude: lon });
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
          Logger.error("FORECAST_REQUEST", new Error("No forecast URL found"), { latitude: lat, longitude: lon });
          return {
            content: [
              {
                type: "text",
                text: `${createBulletinHeader("Data Error", `Coordinates [${lat}, ${lon}]`)}Failed to resolve forecast endpoint from grid point.${createBulletinFooter()}`,
              },
            ],
          };
        }

        const forecastData = await NwsClient.fetch<ForecastResponse>(forecastUrl);
        if (!forecastData) {
          Logger.error("FORECAST_REQUEST", new Error("Failed to retrieve forecast data"), { latitude: lat, longitude: lon });
          return {
            content: [
              {
                type: "text",
                text: `${createBulletinHeader("Network Error", `Coordinates [${lat}, ${lon}]`)}Failed to retrieve forecast data from NWS. Please retry shortly.${createBulletinFooter()}`,
              },
            ],
          };
        }

        cache.set(cacheKey, forecastData);
        Logger.info("CACHE_SET", "Cached forecast data", { latitude: lat, longitude: lon });

        const periods = forecastData.properties?.periods || [];
        const header = createBulletinHeader("Meteorological Forecast Bulletin", `Coordinates [${lat}, ${lon}]`, false);
        const footer = createBulletinFooter();

        if (periods.length === 0) {
          return {
            content: [{ type: "text", text: `${header}No forecast periods available for ${lat}, ${lon}.${footer}` }],
          };
        }

        const formattedForecast = periods.map(formatForecastPeriod);
        return {
          content: [{ type: "text", text: `${header}PERIOD FORECASTS:\n\n${formattedForecast.join("\n")}${footer}` }],
        };
      } catch (error) {
        Logger.error("FORECAST_REQUEST", error, { latitude, longitude, clientId });
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
}
