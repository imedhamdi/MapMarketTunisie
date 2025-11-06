import jwt from 'jsonwebtoken';
import sanitizeHtml from 'sanitize-html';

import env from '../config/env.js';
import { sendResetPasswordEmail } from '../config/mailer.js';
import User from '../models/user.model.js';
import { sendSuccess, sendError, formatUser } from '../utils/responses.js';
import {
  createResetToken,
  hashResetToken,
  hashPassword,
  comparePassword
} from '../utils/crypto.js';
import { generateAuthTokens, setAuthCookies, clearAuthCookies } from '../utils/generateTokens.js';

function sanitize(value) {
  if (typeof value !== 'string') {
    return value;
  }
  const cleaned = sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {}
  });
  return cleaned.trim();
}

export async function signup(req, res) {
  const { name, email, password } = req.body;
  const cleanName = sanitize(name);

  const existing = await User.findOne({ email });
  if (existing) {
    return sendError(res, {
      statusCode: 409,
      code: 'EMAIL_EXISTS',
      message: 'Un compte existe déjà avec cet email.'
    });
  }

  const hashedPassword = await hashPassword(password);
  const user = await User.create({
    name: cleanName,
    email,
    password: hashedPassword,
    memberSince: new Date()
  });

  const tokens = generateAuthTokens(user);
  setAuthCookies(res, tokens);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Compte créé. Bienvenue 👋',
    data: { user: formatUser(user) }
  });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return sendError(res, {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email ou mot de passe incorrect'
    });
  }
  const passwordMatch = await comparePassword(password, user.password);
  if (!passwordMatch) {
    return sendError(res, {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email ou mot de passe incorrect'
    });
  }

  const tokens = generateAuthTokens(user);
  setAuthCookies(res, tokens);

  return sendSuccess(res, {
    message: 'Connexion réussie.',
    data: { user: formatUser(user) }
  });
}

export async function refresh(req, res) {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    return sendError(res, {
      statusCode: 401,
      code: 'NO_REFRESH_TOKEN',
      message: 'Reconnexion requise.'
    });
  }

  try {
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
    const user = await User.findById(payload.sub);
    if (!user) {
      return sendError(res, {
        statusCode: 401,
        code: 'INVALID_SESSION',
        message: 'Session invalide.'
      });
    }

    const tokens = generateAuthTokens(user);
    setAuthCookies(res, tokens);

    return sendSuccess(res, {
      message: 'Session prolongée ✨',
      data: { user: formatUser(user) }
    });
  } catch (error) {
    return sendError(res, {
      statusCode: 401,
      code: 'INVALID_REFRESH',
      message: 'Session expirée, veuillez vous reconnecter.'
    });
  }
}

export async function logout(_req, res) {
  clearAuthCookies(res);
  return sendSuccess(res, {
    message: 'Déconnecté'
  });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email }).select('+resetTokenHash +resetTokenExp');

  if (user) {
    const { token, hash, expiresAt } = createResetToken();
    user.resetTokenHash = hash;
    user.resetTokenExp = expiresAt;
    await user.save({ validateBeforeSave: false });

    try {
      await sendResetPasswordEmail(user.email, token);
    } catch (error) {
      console.error('Erreur envoi email reset', error);
    }
  }

  return sendSuccess(res, {
    message: 'Si un compte existe, un lien a été envoyé ✉️'
  });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;
  const hashedToken = hashResetToken(token);

  const user = await User.findOne({
    resetTokenHash: hashedToken,
    resetTokenExp: { $gt: new Date() }
  }).select('+resetTokenHash +resetTokenExp');

  if (!user) {
    return sendError(res, {
      statusCode: 400,
      code: 'RESET_TOKEN_INVALID',
      message: 'Lien invalide ou expiré.'
    });
  }

  user.password = await hashPassword(password);
  user.resetTokenHash = undefined;
  user.resetTokenExp = undefined;
  await user.save();

  const tokens = generateAuthTokens(user);
  setAuthCookies(res, tokens);

  return sendSuccess(res, {
    message: 'Mot de passe mis à jour 🔐',
    data: { user: formatUser(user) }
  });
}

export async function getMe(req, res) {
  if (!req.user) {
    return sendSuccess(res, {
      message: 'Session inactive',
      data: { user: null }
    });
  }

  const user = await User.findById(req.user.id ?? req.user._id);
  if (!user) {
    return sendSuccess(res, {
      message: 'Session inactive',
      data: { user: null }
    });
  }

  return sendSuccess(res, {
    data: { user: formatUser(user) }
  });
}
