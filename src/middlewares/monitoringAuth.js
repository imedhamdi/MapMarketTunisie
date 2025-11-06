import crypto from 'crypto';

import env from '../config/env.js';
import { sendError } from '../utils/responses.js';

/**
 * Middleware pour protéger les endpoints de monitoring
 * Requiert un token spécifique via header X-Monitoring-Token
 * ou paramètre d'URL token
 */
export function monitoringAuth(req, res, next) {
  // En développement, on peut désactiver la protection si configuré
  if (env.isDev && !env.monitoringTokenRequired) {
    return next();
  }

  // Extraire le token depuis le header ou query param
  const token = req.headers['x-monitoring-token'] || req.query.token;

  if (!token) {
    return sendError(res, {
      statusCode: 401,
      code: 'MONITORING_AUTH_REQUIRED',
      message: 'Token de monitoring requis. Utilisez le header X-Monitoring-Token.'
    });
  }

  // Vérifier le token via comparaison sécurisée (timing-safe)
  const expectedToken = env.monitoringToken;

  if (!expectedToken) {
    return sendError(res, {
      statusCode: 500,
      code: 'MONITORING_NOT_CONFIGURED',
      message: "Le monitoring n'est pas configuré correctement."
    });
  }

  // Comparaison timing-safe pour éviter les timing attacks
  // D'abord vérifier la longueur pour éviter les erreurs de buffer
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);

  if (tokenBuffer.length !== expectedBuffer.length) {
    return sendError(res, {
      statusCode: 403,
      code: 'INVALID_MONITORING_TOKEN',
      message: 'Token de monitoring invalide.'
    });
  }

  const isValid = crypto.timingSafeEqual(tokenBuffer, expectedBuffer);

  if (!isValid) {
    return sendError(res, {
      statusCode: 403,
      code: 'INVALID_MONITORING_TOKEN',
      message: 'Token de monitoring invalide.'
    });
  }

  next();
}

/**
 * Middleware pour restreindre l'accès aux IPs autorisées
 * Optionnel, à utiliser en complément du token
 */
export function monitoringIpRestriction(req, res, next) {
  // Si pas d'IPs configurées, on skip
  if (!env.monitoringAllowedIps || env.monitoringAllowedIps.length === 0) {
    return next();
  }

  // Extraire l'IP du client (compatible avec reverse proxy)
  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress;

  // Vérifier si l'IP est dans la liste autorisée
  const isAllowed = env.monitoringAllowedIps.some((allowedIp) => {
    // Support des ranges CIDR basique
    if (allowedIp.includes('/')) {
      // Pour une implémentation complète, utiliser une lib comme 'ipaddr.js'
      // Ici on fait une vérification simple pour localhost
      return clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
    }
    return clientIp === allowedIp;
  });

  if (!isAllowed) {
    return sendError(res, {
      statusCode: 403,
      code: 'IP_NOT_ALLOWED',
      message: 'Accès refusé depuis cette IP.'
    });
  }

  next();
}

/**
 * Middleware combiné : Token + IP restriction
 */
export function secureMonitoring(req, res, next) {
  monitoringAuth(req, res, (err) => {
    if (err) {
      return next(err);
    }
    monitoringIpRestriction(req, res, next);
  });
}
