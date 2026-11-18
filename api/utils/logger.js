// utils/logger.js
/**
 * Structured Logger for Sahayog Platform
 * Provides standardized JSON logging in production and readable formatting in development.
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level) {
  const currentPriority = LOG_LEVELS[currentLevel] ?? 2;
  const levelPriority = LOG_LEVELS[level] ?? 2;
  return levelPriority <= currentPriority;
}

function sanitize(data) {
  if (!data || typeof data !== 'object') return data;
  const cloned = Array.isArray(data) ? [...data] : { ...data };
  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'jwt_secret', 'cookie'];
  for (const key of Object.keys(cloned)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      cloned[key] = '[REDACTED]';
    } else if (typeof cloned[key] === 'object' && cloned[key] !== null) {
      cloned[key] = sanitize(cloned[key]);
    }
  }
  return cloned;
}

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = sanitize(meta);

  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'sahayog-api',
      ...sanitizedMeta,
    });
  }

  // Development pretty print
  const colors = {
    error: '\x1b[31m',
    warn: '\x1b[33m',
    info: '\x1b[32m',
    http: '\x1b[36m',
    debug: '\x1b[90m',
    reset: '\x1b[0m',
  };
  const color = colors[level] || colors.reset;
  const metaStr = Object.keys(sanitizedMeta).length ? ` ${JSON.stringify(sanitizedMeta)}` : '';
  return `${colors.reset}[${timestamp}] ${color}${level.toUpperCase()}${colors.reset}: ${message}${metaStr}`;
}

const logger = {
  info: (msg, meta) => {
    if (shouldLog('info')) console.log(formatLog('info', msg, meta));
  },
  warn: (msg, meta) => {
    if (shouldLog('warn')) console.warn(formatLog('warn', msg, meta));
  },
  error: (msg, meta) => {
    if (shouldLog('error')) console.error(formatLog('error', msg, meta));
  },
  http: (msg, meta) => {
    if (shouldLog('http')) console.log(formatLog('http', msg, meta));
  },
  debug: (msg, meta) => {
    if (shouldLog('debug')) console.log(formatLog('debug', msg, meta));
  },
};

module.exports = logger;
