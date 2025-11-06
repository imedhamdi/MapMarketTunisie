import rateLimit from 'express-rate-limit';

import { sendError } from '../utils/responses.js';
import logger from '../config/logger.js';

function onRateLimit(req, res) {
  logger.warn('Rate limit atteint', {
    ip: req.ip,
    path: req.path,
    userAgent: req.get('user-agent')
  });

  return sendError(res, {
    statusCode: 429,
    code: 'RATE_LIMITED',
    message: 'Trop de tentatives, réessayez un peu plus tard.'
  });
}

// General - 500 requêtes / 15 min par IP (dev-friendly)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onRateLimit,
  skip: (req) => {
    // Skip pour les fichiers statiques et health checks
    const staticPaths = ['/health', '/', '/css/', '/js/', '/icons/', '/uploads/', '/favicon'];
    return staticPaths.some(path => req.path.startsWith(path));
  }
});

// Auth - 10 tentatives / minute par IP (réduit de 50)
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onRateLimit,
  keyGenerator: (req) => {
    // Rate limit par IP
    return req.ip;
  }
});

// Forgot password - 3 tentatives / 15 min par IP (réduit de 10)
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onRateLimit
});

// Upload - 10 uploads / heure par IP
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onRateLimit,
  keyGenerator: (req) => {
    // Rate limit par IP pour les uploads
    return req.ip;
  },
  skip: (req) => {
    // Permettre plus d'uploads pour les utilisateurs authentifiés
    return false;
  }
});

// Create Ad - 5 annonces / heure par utilisateur
export const createAdLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onRateLimit,
  keyGenerator: (req) => {
    // Rate limit par userId si authentifié, sinon par IP
    return req.user?._id?.toString() || req.ip;
  }
});

// API calls - 50 requêtes / minute par IP (protection DDoS)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onRateLimit
});

// Strict limiter pour endpoints sensibles
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.error('Rate limit strict atteint', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent')
    });

    return sendError(res, {
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de tentatives. Compte temporairement bloqué.'
    });
  }
});
