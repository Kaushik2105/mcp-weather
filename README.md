# 🌤️ Kaushik's Weather MCP Server (v2.0.0)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.18.0-purple.svg)](https://modelcontextprotocol.io/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)](./TESTING.md)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

A production-grade **Model Context Protocol (MCP)** server created by **Kaushik Karmakar**, connecting LLMs (such as Claude Desktop, Cursor, and AI agents) to real-time National Weather Service (NWS) data.

---

## ✨ Features

- 🛰️ **Branded Responses**: Custom attribution headers (`🛰️ [Fetched directly from Kaushik's MCP Weather Project (v2.0.0)]`) ensuring verifiable tool execution proof in LLM interfaces and screenshots.
- ⚡ **High Performance Caching**: In-memory 5-minute TTL cache reducing redundant API calls by up to 80%.
- 🛡️ **Built-in Security & Rate Limiting**: Input sanitization (XSS / injection protection) and client rate limiting (100 req/min).
- 🔁 **Resilience & Retry**: Exponential backoff retry for HTTP `5xx` / `429` status codes and 10s request timeouts.
- 🩺 **Observability & Diagnostics**: Built-in `health_check` and `get_metrics` tools with structured JSON logging.

---

## 🛠️ MCP Tools

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `get_forecast` | `latitude` (number), `longitude` (number) | Fetches period-by-period forecasts (temperature, wind speed/direction, conditions). |
| `get_alerts` | `state` (2-letter code, e.g. `CA`, `NY`, `TX`) | Fetches active severe weather alerts, advisories, and warnings. |
| `health_check` | *None* | Returns server status, memory usage, cache metrics, and uptime. |
| `get_metrics` | *None* | Detailed performance diagnostics and active rate limit status. |
| `clear_cache` | *None* | Flushes the in-memory cache. |

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/Kaushik2105/mcp-weather.git
cd mcp-weather
npm install
```

### 2. Build
```bash
npm run build
```

### 3. Run Tests
```bash
npm test
```

---

## 🔌 Connecting to Claude Desktop

Add this configuration to your Claude Desktop config file:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "kaushik-weather": {
      "command": "node",
      "args": [
        "z:/yourPathToProject/weather/build/index.js"
      ]
    }
  }
}
```

> **Note**: Restart Claude Desktop after saving the configuration.

---

## 💬 Sample Prompts for Claude

- *"What's the weather forecast for Los Angeles? (Lat: 34.0522, Lon: -118.2437)"*
- *"Are there any active weather alerts for Florida (FL)?"*
- *"Run a health check on Kaushik's weather MCP server."*

---

## 👨‍💻 Author

**Kaushik Karmakar**  
- GitHub: [@Kaushik2105](https://github.com/Kaushik2105)
