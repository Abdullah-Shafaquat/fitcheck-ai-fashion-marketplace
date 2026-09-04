/**
 * Lightweight structured logging helper for production diagnostics.
 *
 * Goals:
 *  - Consistent, one-line JSON-ish log output for errors/events.
 *  - Automatic redaction of known secrets (tokens, keys, salts, hashes,
 *    passwords, card/CVV data) and sensitive identity fields so we never
 *    accidentally log them.
 *  - Safe request context only (method, path, status, route) — never bodies or
 *    credentials.
 *
 * This is intentionally dependency-free and does not send logs anywhere;
 * it just normalizes output for whatever collector (stdout / log drain /
 * third-party service) the deployment configures later.
 */

const SECRET_KEY_RE = /(password|passwd|secret|token|api[_-]?key|key|salt|hash|cvv|card|pin|auth|credential|cnic|session|signature)/i;

const SECRET_VALUE_RE =
  /(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})|([A-Za-z0-9]{24,})/g;

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  event: string;
  msg: string;
  /** Safe extra context. Values with secret-looking keys are redacted. */
  context?: Record<string, unknown>;
}

function redactValue(key: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (SECRET_KEY_RE.test(key)) return "[REDACTED]";
  return value.replace(SECRET_VALUE_RE, "[REDACTED]");
}

function safeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(context)) {
    out[k] = redactValue(k, v);
  }
  return out;
}

function write(level: LogLevel, event: string, msg: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    event,
    msg,
    context: safeContext(context),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (event: string, msg: string, context?: Record<string, unknown>) =>
    write("info", event, msg, context),
  warn: (event: string, msg: string, context?: Record<string, unknown>) =>
    write("warn", event, msg, context),
  error: (event: string, msg: string, context?: Record<string, unknown>) =>
    write("error", event, msg, context),
};
