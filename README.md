# 🌤️ Kaushik's Weather MCP Server 

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.18.0-purple.svg)](https://modelcontextprotocol.io/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)](./TESTING.md)
[![Claude Verified](https://img.shields.io/badge/Claude%20AI-Live%20Verified-brightgreen?logo=anthropic)](https://claude.ai/share/b1029a6b-545e-4f19-9fe5-11ba489192b5)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

A production-ready **Model Context Protocol (MCP)** server built in TypeScript, connecting LLMs (such as Claude Desktop, Cursor, and custom AI agents) to real-time National Weather Service (NWS / NOAA) meteorological data.

---

## 🔗 Live Proof of Integration

> 🚀 **Verified Working with Claude Desktop**: Check out the live chat session demonstrating real-time forecast retrieval, alerts, and health diagnostics:  
> 👉 **[View Live Claude AI Chat Proof](https://claude.ai/share/b1029a6b-545e-4f19-9fe5-11ba489192b5)**

---

## ✨ Architectural Highlights

- 🏗️ **Modular Clean Architecture**: Decoupled into dedicated service layers (`CacheService`, `RateLimiterService`, `NwsClient`, `Logger`, `Formatter`).
- 📡 **Official Meteorological Bulletins**: Structured weather reports with standardized metadata and provider attribution.
- ⚡ **In-Memory Caching (5-Min TTL)**: Thread-safe in-memory cache reducing upstream API traffic by up to 80%.
- 🛡️ **Zero-Vibe Security Layer**: Strict input sanitization, XSS entity escaping, and client-isolated rate limiting (100 req/min).
- 🔁 **Resilience & Fault Tolerance**: Automated exponential backoff retries for HTTP `5xx` / `429` errors and request timeout guards.
- 🩺 **Observability & Diagnostics**: Built-in `health_check`, `get_metrics`, and `clear_cache` tools with structured JSON logging.

---

## 📁 Project Structure

```
weather/
├── src/
│   ├── config/          # Central configuration & runtime constants
│   ├── services/        # Core business logic (Cache, RateLimiter, NwsClient, Formatter, Logger)
│   ├── tools/           # MCP Tool handlers (alerts, forecast, diagnostics)
│   ├── types/           # Strongly typed TypeScript interfaces
│   ├── utils/           # Input sanitization and security helpers
│   └── index.ts         # Server bootstrap, transport initialization & graceful shutdown
├── tests/
│   ├── unit/            # Unit test suites (utils, sanitizer, cache)
│   ├── integration/     # Upstream NWS API integration & retry tests
│   ├── performance/     # Cache throughput & rate-limiting load tests
│   ├── security/        # XSS, injection prevention & boundary tests
│   └── basic.test.ts    # Comprehensive test runner
├── build/               # Compiled ES module JavaScript distribution
├── package.json
└── tsconfig.json
```

---

## 🛠️ MCP Tools

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `get_forecast` | `latitude` (number), `longitude` (number) | Retrieves real-time period forecasts (temperatures, winds, conditions) for US coordinates. |
| `get_alerts` | `state` (2-letter US code, e.g. `CA`, `NY`, `TX`) | Fetches active severe weather alerts, warnings, and meteorological advisories. |
| `health_check` | *None* | Returns runtime health, uptime, heap memory usage, cache size, and API connection status. |
| `get_metrics` | *None* | Outputs performance diagnostics and active rate-limit client buckets. |
| `clear_cache` | *None* | Flushes the in-memory cache and returns the number of purged entries. |

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/Kaushik2105/mcp-weather.git
cd mcp-weather
npm install
```

### 2. Build
```bash
npm run build
```

### 3. Run Test Suite
```bash
npm test
```

---

## 🔌 Connecting to Claude Desktop

Add this configuration to your Claude Desktop configuration file:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "kaushik-weather": {
      "command": "node",
      "args": [
        "c:/Workholic/LawSikho/POCs/weather/weather/build/index.js"
      ]
    }
  }
}
```

> **Note**: Restart Claude Desktop after saving the configuration.

---

## 💬 Sample Prompts for Claude

- *"Show me the official forecast bulletin from Kaushik's weather tool for Los Angeles (Lat: 34.0522, Lon: -118.2437)"*
- *"Are there any active weather alerts for Florida (FL)?"*
- *"Run a health check diagnostic on Kaushik's weather MCP server."*

---

## 👨‍💻 Author

**Kaushik Karmakar**  
- GitHub: [@Kaushik2105](https://github.com/Kaushik2105)
- Live Integration Proof: [Claude AI Chat](https://claude.ai/share/b1029a6b-545e-4f19-9fe5-11ba489192b5)
