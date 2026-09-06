import * as Sentry from "@sentry/node";

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

const requestContextMap = new Map();

export function setRequestContext(req, context) {
  requestContextMap.set(req, context);
}

export function getRequestContext(req) {
  return requestContextMap.get(req) || {};
}

export function clearRequestContext(req) {
  requestContextMap.delete(req);
}

export const logger = {
  debug(message, data = {}) {
    if (LOG_LEVELS.DEBUG >= MIN_LOG_LEVEL) {
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'DEBUG', message, ...data }));
    }
  },

  info(message, data = {}) {
    if (LOG_LEVELS.INFO >= MIN_LOG_LEVEL) {
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'INFO', message, ...data }));
    }
  },

  warn(message, data = {}) {
    if (LOG_LEVELS.WARN >= MIN_LOG_LEVEL) {
      console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: 'WARN', message, ...data }));
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureMessage(message, 'warning');
      }
    }
  },

  error(message, error, data = {}) {
    if (LOG_LEVELS.ERROR >= MIN_LOG_LEVEL) {
      const errorData = { name: error?.name, message: error?.message, code: error?.code };
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'ERROR', message, error: errorData, ...data }));
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, { tags: { context: message }, extra: data });
      }
    }
  },

  critical(message, error, data = {}) {
    if (LOG_LEVELS.CRITICAL >= MIN_LOG_LEVEL) {
      const errorData = { name: error?.name, message: error?.message };
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'CRITICAL', message, error: errorData, ...data }));
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, { level: 'fatal', tags: { critical: true }, extra: data });
      }
    }
  },
};

export function requestLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  setRequestContext(req, { requestId, startTime });

  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    if (req.path !== '/health' && req.path !== '/api/health' && statusCode !== 304) {
      logger.info(`${req.method} ${req.path}`, {
        requestId,
        method: req.method,
        path: req.path,
        statusCode,
        durationMs: duration,
      });
    }

    if (duration > 1000) {
      logger.warn(`Slow: ${req.method} ${req.path}`, { durationMs: duration });
    }

    clearRequestContext(req);
    return originalJson(data);
  };

  next();
}

export function errorLogger(err, req, res, next) {
  const context = getRequestContext(req);
  let statusCode = err.statusCode || 500;
  
  if (err?.timeout || err?.name === 'FetchTimeoutError') statusCode = 504;

  logger.error(`${req.method} ${req.path}`, err, { statusCode, requestId: context.requestId });

  if (!res.headersSent) {
    res.status(statusCode).json({ error: 'Interner Fehler', requestId: context.requestId });
  }

  next(err);
}

export function initSentry(app) {
  if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: 'production', tracesSampleRate: 0.1 });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.errorHandler());
  }
}

export default logger;
