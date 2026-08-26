import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CONFIG } from "./config/index.js";
import { CacheService } from "./services/cache.js";
import { RateLimiterService } from "./services/rate-limiter.js";
import { Logger } from "./services/logger.js";
import { registerAlertsTool } from "./tools/alerts.js";
import { registerForecastTool } from "./tools/forecast.js";
import { registerDiagnosticTools } from "./tools/diagnostics.js";

const server = new McpServer({
  name: "weather",
  version: CONFIG.SERVER_VERSION,
  capabilities: {
    resources: {},
    tools: {},
  },
});

registerAlertsTool(server);
registerForecastTool(server);
registerDiagnosticTools(server);

function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    Logger.info("SHUTDOWN", `Received ${signal}, cleaning up`);
    CacheService.getInstance().clear();
    RateLimiterService.getInstance().clear();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("uncaughtException", (error) => {
    Logger.error("UNCAUGHT_EXCEPTION", error);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    Logger.error("UNHANDLED_REJECTION", reason);
    process.exit(1);
  });
}

async function main(): Promise<void> {
  setupGracefulShutdown();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${CONFIG.SERVER_NAME} v${CONFIG.SERVER_VERSION} running on stdio`);
}

main().catch((error) => {
  Logger.error("FATAL_ERROR", error);
  process.exit(1);
});