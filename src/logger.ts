import { mkdirSync, createWriteStream } from "node:fs";
import { resolve } from "node:path";
import { inspect } from "node:util";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
type LogContext = Record<string, unknown>;

const logsDirectory = resolve(process.cwd(), "logs");
const logFile = resolve(logsDirectory, "bot.log");
mkdirSync(logsDirectory, { recursive: true });

const stream = createWriteStream(logFile, { flags: "a", encoding: "utf8" });
stream.on("error", (error) => {
  console.error("Não foi possível escrever no arquivo de log:", error);
});

function normalize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(value.cause ? { cause: normalize(value.cause) } : {}),
    };
  }
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalize(nested)]),
    );
  }
  return value;
}

function write(level: LogLevel, message: string, context: LogContext = {}): void {
  const timestamp = new Date().toISOString();
  const normalized = normalize(context) as LogContext;
  const details = Object.keys(context).length ? ` ${inspect(normalized, { depth: 5, breakLength: Infinity })}` : "";
  const consoleLine = `[${timestamp}] ${level} ${message}${details}`;
  const fileLine = JSON.stringify({ timestamp, level, message, ...normalized });

  if (level === "ERROR") console.error(consoleLine);
  else if (level === "WARN") console.warn(consoleLine);
  else console.log(consoleLine);
  stream.write(`${fileLine}\n`);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("DEBUG", message, context),
  info: (message: string, context?: LogContext) => write("INFO", message, context),
  warn: (message: string, context?: LogContext) => write("WARN", message, context),
  error: (message: string, error?: unknown, context: LogContext = {}) =>
    write("ERROR", message, { ...context, ...(error === undefined ? {} : { error }) }),
  file: logFile,
};
