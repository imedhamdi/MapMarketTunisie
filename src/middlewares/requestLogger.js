import logger from '../config/logger.js';

/**
 * Middleware pour logger les requêtes HTTP
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Logger la requête entrante
  logger.debug('Requête HTTP entrante', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Capturer la réponse
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - startTime;

    // Logger la réponse
    logger.logRequest(req, res, duration);

    // Appeler la méthode originale
    return originalSend.call(this, data);
  };

  next();
}

export default requestLogger;
