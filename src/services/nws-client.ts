import { CONFIG } from "../config/index.js";
import { Logger } from "./logger.js";

export class NwsClient {
  private static timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), ms));
  }

  static async fetch<T>(url: string, retryCount = 0): Promise<T | null> {
    const headers = {
      "User-Agent": CONFIG.USER_AGENT,
      Accept: "application/geo+json",
    };

    try {
      Logger.info("NWS_REQUEST", `Requesting ${url}`, { retryCount });

      const response = await Promise.race([
        fetch(url, { headers }),
        NwsClient.timeout(CONFIG.REQUEST_TIMEOUT_MS),
      ]);

      if (!response.ok) {
        const error = new Error(`HTTP error ${response.status}`);
        Logger.error("NWS_REQUEST", error, { url, status: response.status, retryCount });

        if ((response.status >= 500 || response.status === 429) && retryCount < CONFIG.MAX_RETRIES) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return NwsClient.fetch<T>(url, retryCount + 1);
        }

        return null;
      }

      return (await response.json()) as T;
    } catch (error) {
      Logger.error("NWS_REQUEST", error, { url, retryCount });
      return null;
    }
  }
}
