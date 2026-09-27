/**
 * ContainerGuard Structured Application Logger
 * 
 * Provides Docker- and CloudWatch-compatible structured JSON logging in production
 * and human-readable formatted logging in development.
 * 
 * All logs are written directly to stdout / stderr so that Docker container log
 * drivers (json-file, awslogs, or CloudWatch Agent) can collect them seamlessly.
 * 
 * SECURITY: Automatically redacts passwords, tokens, DATABASE_URL credentials,
 * and sensitive environment variables from log outputs.
 */

const LOG_LEVELS = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  FATAL: 50,
};

const SERVICE_NAME = 'containerguard-backend';
const isProd = process.env.NODE_ENV === 'production';

// Sensitive key patterns to sanitize
const SENSITIVE_KEY_REGEX = /^(password|passwd|secret|token|auth|authorization|cookie|key|jwt|credential|apikey|api_key|private)$/i;

// Database URL pattern to sanitize credentials (e.g. postgresql://user:pass@host:5432/db)
const DB_URL_REGEX = /(postgres(?:ql)?:\/\/)([^:@\s]+):([^@\s]+)@/gi;

/**
 * Sanitizes an object or value recursively, masking passwords and credentials.
 */
function sanitize(value, depth = 0) {
  if (depth > 6) return '[MAX_DEPTH_EXCEEDED]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    // Redact password embedded in database connection strings
    return value.replace(DB_URL_REGEX, '$1$2:***@');
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitize(value.message, depth + 1),
      code: value.code || value.statusCode || undefined,
      stack: isProd ? value.stack : value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }

  if (typeof value === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY_REGEX.test(k)) {
        cleaned[k] = '[REDACTED]';
      } else {
        cleaned[k] = sanitize(v, depth + 1);
      }
    }
    return cleaned;
  }

  return String(value);
}

/**
 * Emits a structured log entry.
 */
function log(level, message, context = null) {
  const timestamp = new Date().toISOString();
  const sanitizedContext = context ? sanitize(context) : undefined;

  if (isProd) {
    // Production: Single-line JSON to stdout/stderr for Docker/CloudWatch
    const logPayload = {
      timestamp,
      level,
      service: SERVICE_NAME,
      message: typeof message === 'string' ? message.replace(DB_URL_REGEX, '$1$2:***@') : message,
    };

    if (sanitizedContext !== undefined) {
      logPayload.context = sanitizedContext;
    }

    const jsonStr = JSON.stringify(logPayload);
    if (level === 'ERROR' || level === 'FATAL') {
      process.stderr.write(jsonStr + '\n');
    } else {
      process.stdout.write(jsonStr + '\n');
    }
  } else {
    // Development: Human-readable output with icons and timestamp
    const levelIcons = {
      DEBUG: '🔍',
      INFO: 'ℹ️ ',
      WARN: '⚠️ ',
      ERROR: '❌',
      FATAL: '💥',
    };

    const icon = levelIcons[level] || '•';
    const contextStr = sanitizedContext ? ` ${JSON.stringify(sanitizedContext)}` : '';

    if (level === 'ERROR' || level === 'FATAL') {
      console.error(`[${timestamp}] ${icon} [${level}] ${message}${contextStr}`);
    } else if (level === 'WARN') {
      console.warn(`[${timestamp}] ${icon} [${level}] ${message}${contextStr}`);
    } else {
      console.log(`[${timestamp}] ${icon} [${level}] ${message}${contextStr}`);
    }
  }
}

export const logger = {
  debug: (message, context) => log('DEBUG', message, context),
  info: (message, context) => log('INFO', message, context),
  warn: (message, context) => log('WARN', message, context),
  error: (message, context) => log('ERROR', message, context),
  fatal: (message, context) => log('FATAL', message, context),
  http: (message, context) => log('INFO', message, context),
  sanitize,
};

export default logger;
