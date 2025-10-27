import multer from 'multer';

import env from '../config/env.js';
import logger from '../config/logger.js';
import { sendError } from '../utils/responses.js';
import { HTTP_STATUS } from '../config/constants.js';

export default function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  if (res.headersSent) {
    return next(err);
  }

  // Logger l'erreur avec contexte
  logger.logError(err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?._id
  });

  if (err.isJoi) {
    return sendError(res, {
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      code: 'VALIDATION_ERROR',
      message: err.details?.[0]?.message ?? 'Données invalides'
    });
  }

  if (err instanceof multer.MulterError) {
    return sendError(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: 'UPLOAD_ERROR',
      message: err.message
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    return sendError(res, {
      statusCode: HTTP_STATUS.CONFLICT,
      code: 'DUPLICATE_KEY',
      message: 'Cet email est déjà utilisé.'
    });
  }

  if (err.name === 'ValidationError') {
    return sendError(res, {
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      code: 'VALIDATION_ERROR',
      message: err.message
    });
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: 'TOKEN_EXPIRED',
      message: 'Session expirée, veuillez vous reconnecter.'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return sendError(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: 'TOKEN_INVALID',
      message: 'Jeton invalide.'
    });
  }

  // Erreur par défaut
  const statusCode = err.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const code = err.code ?? 'INTERNAL_ERROR';
  const message =
    env.isProd && statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR
      ? 'Erreur interne du serveur'
      : (err.message ?? 'Erreur interne du serveur');

  return sendError(res, { statusCode, code, message });
}
