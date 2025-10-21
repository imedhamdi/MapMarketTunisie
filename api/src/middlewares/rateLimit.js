import rateLimit from 'express-rate-limit';

import { sendError } from '../utils/responses.js';

function onRateLimit(req, res) {
  return sendError(res, {
    statusCode: 429,
    code: 'RATE_LIMITED',
    message: 'Trop de tentatives, réessayez un peu plus tard.'
  });
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onRateLimit
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onRateLimit
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onRateLimit
});
