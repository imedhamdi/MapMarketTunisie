import jwt from 'jsonwebtoken';

import env from '../config/env.js';
import { sendResetPasswordEmail } from '../config/mailer.js';
import userService from './user.service.js';
import { createResetToken, hashResetToken } from '../utils/crypto.js';
import { generateAuthTokens } from '../utils/generateTokens.js';
import { createError } from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

/**
 * Service d'authentification
 * Centralise toute la logique métier liée à l'authentification
 */
class AuthService {
  /**
   * Inscription d'un nouvel utilisateur
   */
  async signup(userData) {
    const user = await userService.createUser(userData);
    const tokens = generateAuthTokens(user);

    logger.info('Utilisateur inscrit', { userId: user._id, email: user.email });

    return { user, tokens };
  }

  /**
   * Connexion d'un utilisateur
   */
  async login(email, password) {
    const user = await userService.getUserByEmail(email, true);

    if (!user) {
      throw createError.unauthorized('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS');
    }

    const passwordMatch =
      (await userService.constructor.prototype.comparePassword?.(password, user.password)) ??
      (await import('../utils/crypto.js')).comparePassword(password, user.password);

    if (!passwordMatch) {
      throw createError.unauthorized('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS');
    }

    const tokens = generateAuthTokens(user);

    logger.info('Utilisateur connecté', { userId: user._id, email: user.email });

    return { user, tokens };
  }

  /**
   * Rafraîchir les tokens d'authentification
   */
  async refresh(refreshToken) {
    if (!refreshToken) {
      throw createError.unauthorized('Reconnexion requise.', 'NO_REFRESH_TOKEN');
    }

    try {
      const payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
      const user = await userService.getUserById(payload.sub);

      const tokens = generateAuthTokens(user);

      logger.debug('Session prolongée', { userId: user._id });

      return { user, tokens };
    } catch (error) {
      throw createError.unauthorized(
        'Session expirée, veuillez vous reconnecter.',
        'INVALID_REFRESH'
      );
    }
  }

  /**
   * Demande de réinitialisation de mot de passe
   */
  async forgotPassword(email) {
    const user = await userService.getUserByEmail(email, false);

    if (user) {
      const { token, hash, expiresAt } = createResetToken();
      await userService.setResetToken(user._id, hash, expiresAt);

      try {
        await sendResetPasswordEmail(user.email, token);
        logger.info('Email de réinitialisation envoyé', { userId: user._id, email: user.email });
      } catch (error) {
        logger.error('Erreur envoi email reset', { error: error.message, email: user.email });
      }
    }

    // Toujours retourner le même message pour des raisons de sécurité
    return true;
  }

  /**
   * Réinitialisation du mot de passe
   */
  async resetPassword(token, newPassword) {
    const hashedToken = hashResetToken(token);
    const user = await userService.getUserByResetToken(hashedToken);

    if (!user) {
      throw createError.badRequest('Lien invalide ou expiré.', 'RESET_TOKEN_INVALID');
    }

    await userService.changePassword(user._id, null, newPassword);
    await userService.clearResetToken(user._id);

    // Générer de nouveaux tokens
    const tokens = generateAuthTokens(user);

    logger.info('Mot de passe réinitialisé', { userId: user._id });

    return { user, tokens };
  }

  /**
   * Vérifier un token d'accès et récupérer l'utilisateur
   */
  async verifyAccessToken(token) {
    try {
      const payload = jwt.verify(token, env.jwtAccessSecret);
      const user = await userService.getUserById(payload.sub);

      return user;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw createError.unauthorized('Session expirée.', 'TOKEN_EXPIRED');
      }
      throw createError.unauthorized('Jeton invalide.', 'TOKEN_INVALID');
    }
  }
}

export default new AuthService();
