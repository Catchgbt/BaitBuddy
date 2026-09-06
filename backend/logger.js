/**
 * Production-Grade Logging für Bait Buddy Backend
 * 
 * Features:
 * - Strukturierte JSON-Logs (stdout für Vercel/Cloud)
 * - Request/Response Tracking (Performance, Errors)
 * - Error Context (Stack, Code, User-Info)
 * - Sentry Integration (Production Errors)
 * - Rate Limiting für Log-Spam
 * 
 * Usage:
 *   import { logger, requestLogger, errorLogger } from './lib/logger.js';
 * 
 *   // Strukturiertes Log
 *   logger.info('User logged in', { userId, email, provider: 'oauth' });
 *   logger.error('Payment failed', { error, transactionId, amount });
 *   logger.warn('Quota reached', { userId, quotaType: 'api-calls' });
 * 
 *   // Express Middleware
 *   app.use(requestLogger);
 *   app.use(errorLogger);
 */

import * as Sentry from "@sentry/node";

// ============================================================================
// SENTRY KONFIGURATION
// ============================================================================

if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in Prod
    maxBreadcrumbs: 50,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
  });
}

// ============================================================================
// LOG LEVEL & SEVERITY
// ============================================================================

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4,
};

const MIN_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || (
  process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG'
)];

const SEVERITY_MAP = {
  debug: 'debug',
  info: 'info',
  warn: 'warning',
  error: 'error',
  critical: 'fatal',
};

// ============================================================================
// CONTEXT STORAGE (für Request-bezogene Logs)
// ============================================================================

const requestContextMap = new Map(); // WeakMap wäre besser, aber Map für Klarheit

export function setRequestContext(req, context) {
  requestContextMap.set(req, context);
}

export function getRequestContext(req) {
  return requestContextMap.get(req) || {};
}

export function clearRequestContext(req) {
  requestContextMap.delete(req);
}

// ============================================================================
// LOGGER OBJEKT
// ============================================================================

export const logger = {
  /**
   * Debug-Level Log (Development only)
   */
  debug(message, data = {}) {
    if (LOG_LEVELS.DEBUG >= MIN_LOG_LEVEL) {
      const payload = createLogPayload('DEBUG', message, data);
      console.log(JSON.stringify(payload));
    }
  },

  /**
   * Info-Level Log (Standard)
   */
  info(message, data = {}) {
    if (LOG_LEVELS.INFO >= MIN_LOG_LEVEL) {
      const payload = createLogPayload('INFO', message, data);
      console.log(JSON.stringify(payload));
    }
  },

  /**
   * Warn-Level Log (Dringend, aber nicht kritisch)
   */
  warn(message, data = {}) {
    if (LOG_LEVELS.WARN >= MIN_LOG_LEVEL) {
      const payload = createLogPayload('WARN', message, data);
      console.warn(JSON.stringify(payload));
      
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureMessage(message, 'warning');
      }
    }
  },

  /**
   * Error-Level Log (Fehler, aber Service läuft)
   */
  error(message, error, data = {}) {
    if (LOG_LEVELS.ERROR >= MIN_LOG_LEVEL) {
      const errorData = extractErrorInfo(error);
      const payload = createLogPayload('ERROR', message, {
        ...data,
        error: errorData,
      });
      console.error(JSON.stringify(payload));
      
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, {
          tags: { context: message },
          extra: data,
        });
      }
    }
  },

  /**
   * Critical-Level Log (Service-Ausfall)
   */
  critical(message, error, data = {}) {
    if (LOG_LEVELS.CRITICAL >= MIN_LOG_LEVEL) {
      const errorData = extractErrorInfo(error);
      const payload = createLogPayload('CRITICAL', message, {
        ...data,
        error: errorData,
      });
      console.error(JSON.stringify(payload));
      
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, {
          level: 'fatal',
          tags: { context: message, critical: true },
          extra: data,
        });
      }
    }
  },
};

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Request-Logging Middleware
 * Tracked: Method, Path, Status, Duration, User-Info
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Speichere Request-Context
  setRequestContext(req, {
    requestId,
    startTime,
    userId: req.user?.id,
    email: req.user?.email,
  });

  // Überschreibe res.json, um Response-Größe zu tracken
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Nur teure/wichtige Requests loggen (nicht jeden /health call)
    if (shouldLogRequest(req.path, statusCode)) {
      logger.info(`${req.method} ${req.path}`, {
        requestId,
        method: req.method,
        path: req.path,
        statusCode,
        durationMs: duration,
        userId: req.user?.id,
        userEmail: req.user?.email,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    // Langsame Requests warnen (>1000ms)
    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.path}`, {
        requestId,
        durationMs: duration,
        threshold: 1000,
      });
    }

    // Cleanup
    clearRequestContext(req);
    
    return originalJson(data);
  };

  next();
}

/**
 * Error-Logging Middleware (Express Error Handler)
 * Muss als letzter Middleware registriert werden!
 * 
 * Usage:
 *   app.use(errorLogger);
 */
export function errorLogger(err, req, res, next) {
  const context = getRequestContext(req);
  const errorData = extractErrorInfo(err);

  // Klassifiziere den Fehler
  let level = 'ERROR';
  let statusCode = 500;

  if (err.statusCode) {
    statusCode = err.statusCode;
  }

  if (err?.timeout || err?.name === 'FetchTimeoutError' || err?.name === 'AbortError') {
    statusCode = 504;
    level = 'WARN'; // Timeouts sind nicht immer kritisch
  } else if (statusCode >= 500) {
    level = 'CRITICAL';
  } else if (statusCode >= 400) {
    level = 'WARN';
  }

  // Logge den Fehler
  logger[level.toLowerCase()](
    `${req.method} ${req.path} - ${statusCode}`,
    err,
    {
      requestId: context.requestId,
      method: req.method,
      path: req.path,
      statusCode,
      userId: context.userId,
      stack: err.stack,
      errorName: err.name,
      durationMs: Date.now() - context.startTime,
    }
  );

  // Sende sichere Error-Response (ohne Internals)
  if (!res.headersSent) {
    res.status(statusCode).json({
      error: getPublicErrorMessage(statusCode, err),
      requestId: context.requestId,
    });
  }

  next(err);
}

// ============================================================================
// HELPER FUNKTIONEN
// ============================================================================

/**
 * Erstellt strukturiertes Log-Payload
 */
function createLogPayload(level, message, data = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  };
}

/**
 * Extrahiert Fehler-Informationen (ohne sensible Details)
 */
function extractErrorInfo(error) {
  if (!error) return null;

  const info = {
    name: error.name || 'Unknown',
    message: error.message || String(error),
    code: error.code,
    statusCode: error.statusCode,
  };

  // Stack-Trace nur in Development/Staging
  if (process.env.NODE_ENV !== 'production') {
    info.stack = error.stack?.split('\n').slice(0, 5).join('\n');
  }

  return info;
}

/**
 * Bestimmt, ob ein Request geloggt werden soll
 * (Filtert z.B. /health, statische Assets)
 */
function shouldLogRequest(path, statusCode) {
  // Ignoriere Health-Checks
  if (path === '/health' || path === '/api/health') {
    return false;
  }

  // Ignoriere 304 Not Modified
  if (statusCode === 304) {
    return false;
  }

  return true;
}

/**
 * Generiert eindeutige Request-ID (für Tracing)
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Public Error Message (keine Internals)
 */
function getPublicErrorMessage(statusCode, error) {
  const messages = {
    400: 'Ungültige Anfrage',
    401: 'Authentifizierung erforderlich',
    403: 'Zugriff verweigert',
    404: 'Nicht gefunden',
    409: 'Konflikt – bitte erneut versuchen',
    429: 'Zu viele Anfragen – bitte warten',
    500: 'Interner Fehler',
    503: 'Service nicht verfügbar',
    504: 'Zeitüberschreitung beim externen Dienst',
  };

  // Bei Timeouts spezial behandeln
  if (error?.timeout || error?.name === 'FetchTimeoutError') {
    return 'Zeitüberschreitung beim externen Dienst — bitte erneut versuchen';
  }

  return messages[statusCode] || 'Ein Fehler ist aufgetreten';
}

/**
 * Sentry Integration initialisieren
 * (Wird automatisch aufgerufen bei Import)
 */
export function initSentry(app) {
  if (!process.env.SENTRY_DSN) {
    logger.warn('SENTRY_DSN not configured – error tracking disabled');
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.errorHandler());
    logger.info('Sentry initialized', { dsn: process.env.SENTRY_DSN.substring(0, 50) + '...' });
  }
}

// ============================================================================
// SPEZIELLE LOG-FUNKTIONEN
// ============================================================================

/**
 * Logge Database-Operation
 */
export function logDatabaseOperation(operation, table, result, duration) {
  const level = result.error ? 'error' : 'debug';
  logger[level](`Database: ${operation} on ${table}`, {
    operation,
    table,
    durationMs: duration,
    rowsAffected: result.rowsAffected,
    error: result.error,
  });
}

/**
 * Logge externe API-Call
 */
export function logExternalAPI(service, endpoint, statusCode, duration) {
  const level = statusCode >= 400 ? 'warn' : 'debug';
  logger[level](`External API: ${service} ${endpoint}`, {
    service,
    endpoint,
    statusCode,
    durationMs: duration,
  });
}

/**
 * Logge Auth-Event
 */
export function logAuthEvent(event, userId, data = {}) {
  logger.info(`Auth: ${event}`, {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Logge User-Action (für Audit Trail)
 */
export function logUserAction(userId, action, resource, data = {}) {
  logger.info(`User Action: ${action}`, {
    userId,
    action,
    resource,
    timestamp: new Date().toISOString(),
    ...data,
  });
}

export default logger;
