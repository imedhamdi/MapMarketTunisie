import jwt from 'jsonwebtoken';

import env from '../config/env.js';
import User from '../models/user.model.js';
import { sendError } from '../utils/responses.js';

function extractAccessToken(req) {
  const cookieToken = req.cookies?.access_token;
  if (cookieToken) return cookieToken;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

async function loadUser(userId) {
  if (!userId) return null;
  return User.findById(userId);
}

export async function authRequired(req, res, next) {
  try {
    const token = extractAccessToken(req);
    if (!token) {
      return sendError(res, {
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentification requise.'
      });
    }
    const decoded = jwt.verify(token, env.jwtAccessSecret);
    const user = await loadUser(decoded.sub);
    if (!user) {
      return sendError(res, {
        statusCode: 401,
        code: 'INVALID_SESSION',
        message: 'Session invalide, veuillez vous reconnecter.'
      });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = extractAccessToken(req);
    if (!token) return next();
    const decoded = jwt.verify(token, env.jwtAccessSecret);
    const user = await loadUser(decoded.sub);
    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    next();
  }
}
