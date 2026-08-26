export interface AlertProperties {
  event?: string;
  areaDesc?: string;
  severity?: string;
  status?: string;
  headline?: string;
}

export interface AlertFeature {
  properties: AlertProperties;
}

export interface AlertsResponse {
  features: AlertFeature[];
}

export interface PointsProperties {
  forecast?: string;
}

export interface PointsResponse {
  properties: PointsProperties;
}

export interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

export interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

export interface HealthCheckData {
  server: string;
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptimeSeconds: number;
  memory: {
    usedMB: number;
    totalMB: number;
  };
  cache: {
    entriesCount: number;
    ttlMilliseconds: number;
  };
  rateLimit: {
    activeClients: number;
    maxRequestsPerWindow: number;
    windowMs: number;
  };
  upstreamApi: {
    provider: string;
    baseUrl: string;
    timeoutMs: number;
    maxRetries: number;
  };
}

export interface ServerMetricsData {
  service: string;
  version: string;
  timestamp: string;
  cache: {
    size: number;
  };
  rateLimit: {
    activeClients: number;
    clients: Array<{
      clientId: string;
      requestCount: number;
      resetTime: string;
    }>;
  };
  memory: NodeJS.MemoryUsage;
  uptime: number;
}
