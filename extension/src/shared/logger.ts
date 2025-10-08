/**
 * Structured logging utilities for the extension
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private context: LogContext = {};
  private enabled: boolean = true;

  constructor(defaultContext: LogContext = {}) {
    this.context = defaultContext;

    // Check if debug mode is enabled
    this.loadDebugSettings();
  }

  private async loadDebugSettings() {
    try {
      const settings = await chrome.storage.local.get(["debug"]);
      this.enabled = settings.debug === true;
    } catch {
      // Default to enabled in development
      this.enabled = process.env.NODE_ENV === "development";
    }
  }

  private formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
      error,
    };
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ) {
    if (!this.enabled && level !== "error") return;

    const entry = this.formatLog(level, message, context, error);
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;

    const contextStr =
      entry.context && Object.keys(entry.context).length > 0
        ? JSON.stringify(entry.context)
        : "";

    switch (level) {
      case "debug":
        console.debug(`${prefix} ${message}`, contextStr, error);
        break;
      case "info":
        console.info(`${prefix} ${message}`, contextStr);
        break;
      case "warn":
        console.warn(`${prefix} ${message}`, contextStr, error);
        break;
      case "error":
        console.error(`${prefix} ${message}`, contextStr, error);
        break;
    }

    // Store critical errors for debugging
    if (level === "error") {
      this.storeError(entry);
    }
  }

  private async storeError(entry: LogEntry) {
    try {
      const stored = await chrome.storage.local.get(["errorLog"]);
      const errorLog = Array.isArray(stored.errorLog) ? stored.errorLog : [];

      // Keep only last 10 errors to avoid storage bloat
      errorLog.push(entry);
      if (errorLog.length > 10) {
        errorLog.shift();
      }

      await chrome.storage.local.set({ errorLog });
    } catch (storeError) {
      console.error("[Logger] Failed to store error:", storeError);
    }
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext, error?: Error) {
    this.log("warn", message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log("error", message, context, error);
  }

  withContext(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async getErrorLog(): Promise<LogEntry[]> {
    try {
      const stored = await chrome.storage.local.get(["errorLog"]);
      return Array.isArray(stored.errorLog) ? stored.errorLog : [];
    } catch {
      return [];
    }
  }

  async clearErrorLog(): Promise<void> {
    try {
      await chrome.storage.local.remove(["errorLog"]);
    } catch (error) {
      this.error("Failed to clear error log", {}, error as Error);
    }
  }
}

// Global logger instances
export const logger = new Logger({ component: "extension" });
export const backgroundLogger = new Logger({ component: "background" });
export const contentLogger = new Logger({ component: "content" });
export const uiLogger = new Logger({ component: "ui" });

// Helper function to create component-specific loggers
export function createLogger(
  component: string,
  additionalContext?: LogContext
): Logger {
  return new Logger({ component, ...additionalContext });
}
