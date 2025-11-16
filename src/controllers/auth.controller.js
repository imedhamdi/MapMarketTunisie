import jwt from 'jsonwebtoken';
import sanitizeHtml from 'sanitize-html';

import env from '../config/env.js';
import { sendTemporaryPasswordEmail, sendEmailVerificationEmail } from '../config/mailer.js';
import User from '../models/user.model.js';
import { finalizeEmailVerification } from '../services/emailVerification.service.js';
import { sendSuccess, sendError, formatUser } from '../utils/responses.js';
import {
  createVerificationToken,
  hashPassword,
  comparePassword,
  generateTemporaryPassword
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
  const { token, hash, expiresAt } = createVerificationToken();
  const user = await User.create({
    name: cleanName,
    email,
    password: hashedPassword,
    memberSince: new Date(),
    emailVerified: false,
    emailVerificationTokenHash: hash,
    emailVerificationTokenExp: expiresAt
  });

  try {
    await sendEmailVerificationEmail(user.email, token, cleanName);
  } catch (error) {
    console.error("Erreur envoi email d'activation", error);
  }

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Compte créé. Vérifiez votre email pour activer votre accès ✉️',
    data: { user: formatUser(user), requiresVerification: true }
  });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select(
    '+password +emailVerificationTokenHash +emailVerificationTokenExp'
  );
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

  if (user.emailVerificationTokenHash) {
    return sendError(res, {
      statusCode: 403,
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Veuillez activer votre compte via le lien reçu par email.'
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
  const user = await User.findOne({ email }).select('+password');

  if (user) {
    const temporaryPassword = generateTemporaryPassword(8);
    user.password = await hashPassword(temporaryPassword);
    await user.save({ validateBeforeSave: false });

    try {
      await sendTemporaryPasswordEmail(user.email, temporaryPassword, user.name);
    } catch (error) {
      console.error('Erreur envoi email mot de passe temporaire', error);
    }
  }

  return sendSuccess(res, {
    message: 'Si un compte existe, un mot de passe temporaire a été envoyé ✉️'
  });
}

export async function verifyEmail(req, res) {
  const { token } = req.body;

  try {
    const { user, tokens } = await finalizeEmailVerification(token);
    setAuthCookies(res, tokens);

    return sendSuccess(res, {
      message: 'Email confirmé 🎉',
      data: { user: formatUser(user) }
    });
  } catch (error) {
    if (error?.code === 'VERIFICATION_TOKEN_INVALID') {
      return sendError(res, {
        statusCode: error.statusCode ?? 400,
        code: error.code,
        message: error.message
      });
    }
    throw error;
  }
}

export async function resendVerification(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email }).select(
    '+emailVerificationTokenHash +emailVerificationTokenExp'
  );

  if (!user || !user.emailVerificationTokenHash) {
    return sendSuccess(res, {
      message: "Si un compte existe ou est déjà actif, aucun email supplémentaire n'est nécessaire."
    });
  }

  const { token, hash, expiresAt } = createVerificationToken();
  user.emailVerificationTokenHash = hash;
  user.emailVerificationTokenExp = expiresAt;
  await user.save({ validateBeforeSave: false });

  try {
    await sendEmailVerificationEmail(user.email, token, user.name);
  } catch (error) {
    console.error('Erreur renvoi email de vérification', error);
  }

  return sendSuccess(res, {
    message: 'Nouveau lien de confirmation envoyé si le compte existe.'
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
