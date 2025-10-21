import multer from 'multer';

import env from '../config/env.js';
import { sendError } from '../utils/responses.js';

export default function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (res.headersSent) {
    return next(err);
  }

  if (env.isDev) {
    console.error('🚨', err);
  }

  if (err.isJoi) {
    return sendError(res, {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: err.details?.[0]?.message ?? 'Données invalides'
    });
  }

  if (err instanceof multer.MulterError) {
    return sendError(res, {
      statusCode: 400,
      code: 'UPLOAD_ERROR',
      message: err.message
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    return sendError(res, {
      statusCode: 409,
      code: 'DUPLICATE_KEY',
      message: 'Cet email est déjà utilisé.'
    });
  }

  if (err.name === 'ValidationError') {
    return sendError(res, {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: err.message
    });
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, {
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Session expirée, veuillez vous reconnecter.'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return sendError(res, {
      statusCode: 401,
      code: 'TOKEN_INVALID',
      message: 'Jeton invalide.'
    });
  }

  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  const message = err.message ?? 'Erreur interne du serveur';

  return sendError(res, { statusCode, code, message });
}
