export class Logger {
  static info(operation: string, message: string, context?: Record<string, unknown>): void {
    console.log(`[INFO] ${JSON.stringify({ timestamp: new Date().toISOString(), operation, message, context })}`);
  }

  static error(operation: string, error: unknown, context?: Record<string, unknown>): void {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      operation,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
    };
    console.error(`[ERROR] ${JSON.stringify(errorInfo)}`);
  }
}
