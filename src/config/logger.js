import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'node:path';

import env from './env.js';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Format personnalisé pour les logs en mode développement
const devFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Ajouter les métadonnées si présentes
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  // Ajouter la stack trace pour les erreurs
  if (stack) {
    msg += `\n${stack}`;
  }

  return msg;
});

// Configuration des transports
const transports = [];

// Console transport (toujours actif)
if (env.isDev) {
  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        devFormat
      )
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: combine(timestamp(), errors({ stack: true }), json())
    })
  );
}

// File transports (rotation quotidienne)
if (env.isProd || process.env.ENABLE_FILE_LOGS === 'true') {
  const logsDir = path.resolve('logs');

  // Logs d'erreur
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(timestamp(), errors({ stack: true }), json())
    })
  );

  // Tous les logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(timestamp(), errors({ stack: true }), json())
    })
  );
}

// Créer le logger
const logger = winston.createLogger({
  level: env.isDev ? 'debug' : 'info',
  transports,
  // Ne pas quitter sur les erreurs non gérées
  exitOnError: false
});

// Ajouter des méthodes utilitaires
logger.logRequest = (req, res, duration) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
};

logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    ...context,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode
  });
};

logger.logDB = (operation, collection, duration) => {
  logger.debug('DB Operation', {
    operation,
    collection,
    duration: `${duration}ms`
  });
};

export default logger;
