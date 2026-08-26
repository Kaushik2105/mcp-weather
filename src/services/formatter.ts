import { AlertFeature, ForecastPeriod } from "../types/index.js";
import { sanitizeInput } from "../utils/sanitizer.js";

export function createBulletinHeader(title: string, target: string, isCacheHit = false): string {
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

export function createBulletinFooter(): string {
  return [
    "",
    "======================================================================",
    "📡 Issued by Kaushik's Weather MCP Server (v2.0.0)",
    "======================================================================",
  ].join("\n");
}

export function formatAlert(feature: AlertFeature): string {
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

export function formatForecastPeriod(period: ForecastPeriod): string {
  return [
    `📅 ${sanitizeInput(period.name || "Unknown")}:`,
    `   • Temperature: ${period.temperature || "Unknown"}°${sanitizeInput(period.temperatureUnit || "F")}`,
    `   • Wind: ${sanitizeInput(period.windSpeed || "Unknown")} ${sanitizeInput(period.windDirection || "")}`,
    `   • Conditions: ${sanitizeInput(period.shortForecast || "No forecast available")}`,
    "---",
  ].join("\n");
}
