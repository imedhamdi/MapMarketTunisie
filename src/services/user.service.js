import User from '../models/user.model.js';
import { createError } from '../utils/asyncHandler.js';
import { hashPassword, comparePassword } from '../utils/crypto.js';
import logger from '../config/logger.js';

/**
 * Service de gestion des utilisateurs
 * Centralise toute la logique métier liée aux utilisateurs
 */
class UserService {
  /**
   * Normaliser les coordonnées géographiques
   */
  normalizeCoords(coords) {
    if (!coords) {
      return undefined;
    }

    if (Array.isArray(coords) && coords.length === 2) {
      const [lng, lat] = coords.map((n) => Number(n));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return [lng, lat];
      }
      return undefined;
    }

    if (typeof coords === 'object' && coords.lat != null && coords.lng != null) {
      const lat = Number(coords.lat);
      const lng = Number(coords.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return [lng, lat];
      }
    }

    return undefined;
  }

  /**
   * Appliquer les mises à jour de localisation
   */
  applyLocation(user, locationPayload = {}) {
    const { city, coords, radiusKm, consent } = locationPayload;
    const update = {};

    if (city !== undefined) {
      update.city = city;
    }

    if (coords !== undefined) {
      const normalized = this.normalizeCoords(coords);
      if (normalized) {
        update.coords = { type: 'Point', coordinates: normalized };
        update.lastUpdated = new Date();
      } else if (coords === null) {
        update.coords = undefined;
      }
    }

    if (radiusKm !== undefined) {
      update.radiusKm = radiusKm;
    }
    if (consent !== undefined) {
      update.consent = consent;
    }

    const existing =
      typeof user.location?.toObject === 'function'
        ? user.location.toObject()
        : (user.location ?? {});

    user.location = {
      ...existing,
      ...update
    };

    if (!user.location.coords?.coordinates?.length) {
      delete user.location.coords;
    }
  }

  /**
   * Créer un nouvel utilisateur
   */
  async createUser(userData) {
    const startTime = Date.now();

    // Vérifier si l'email existe déjà
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      throw createError.conflict('Un compte existe déjà avec cet email.');
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(userData.password);

    const user = await User.create({
      ...userData,
      password: hashedPassword,
      memberSince: new Date()
    });

    logger.logDB('createUser', 'users', Date.now() - startTime);
    logger.info('Utilisateur créé', { userId: user._id, email: user.email });

    return user;
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(userId) {
    const startTime = Date.now();

    const user = await User.findById(userId);

    if (!user) {
      throw createError.notFound('Utilisateur introuvable.');
    }

    logger.logDB('getUserById', 'users', Date.now() - startTime);

    return user;
  }

  /**
   * Récupérer un utilisateur par email
   */
  async getUserByEmail(email, includePassword = false) {
    const startTime = Date.now();

    const query = User.findOne({ email });

    if (includePassword) {
      query.select('+password');
    }

    const user = await query;

    logger.logDB('getUserByEmail', 'users', Date.now() - startTime);

    return user;
  }

  /**
   * Mettre à jour le profil d'un utilisateur
   */
  async updateProfile(userId, updates) {
    const startTime = Date.now();

    const user = await User.findById(userId);

    if (!user) {
      throw createError.notFound('Utilisateur introuvable.');
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (updates.email && updates.email !== user.email) {
      const emailExists = await User.findOne({
        email: updates.email,
        _id: { $ne: userId }
      });

      if (emailExists) {
        throw createError.conflict('Cet email est déjà utilisé.');
      }

      user.email = updates.email;
    }

    // Appliquer les autres mises à jour
    if (updates.name !== undefined) {
      user.name = updates.name;
    }

    if (updates.location !== undefined) {
      this.applyLocation(user, updates.location);
    }

    await user.save();

    logger.logDB('updateProfile', 'users', Date.now() - startTime);
    logger.info('Profil mis à jour', { userId });

    return user;
  }

  /**
   * Mettre à jour la localisation d'un utilisateur
   */
  async updateLocation(userId, locationData) {
    const startTime = Date.now();

    const user = await User.findById(userId);

    if (!user) {
      throw createError.notFound('Utilisateur introuvable.');
    }

    // Support pour les deux formats
    const { lat, lng, radiusKm } = locationData;

    if (lat != null && lng != null) {
      const locationUpdate = {
        coords: [Number(lng), Number(lat)],
        consent: true
      };

      if (radiusKm !== undefined) {
        locationUpdate.radiusKm = Number(radiusKm);
      }

      this.applyLocation(user, locationUpdate);
    } else {
      this.applyLocation(user, locationData);
    }

    await user.save();

    logger.logDB('updateLocation', 'users', Date.now() - startTime);
    logger.info('Localisation mise à jour', { userId });

    return user.location;
  }

  /**
   * Mettre à jour l'avatar d'un utilisateur
   */
  async updateAvatar(userId, filename) {
    const startTime = Date.now();

    const user = await User.findByIdAndUpdate(userId, { avatar: filename }, { new: true });

    if (!user) {
      throw createError.notFound('Utilisateur introuvable.');
    }

    logger.logDB('updateAvatar', 'users', Date.now() - startTime);
    logger.info('Avatar mis à jour', { userId, filename });

    return user;
  }

  /**
   * Mettre à jour les favoris d'un utilisateur
   */
  async updateFavorites(userId, adId, action) {
    const startTime = Date.now();

    const user = await User.findById(userId);

    if (!user) {
      throw createError.notFound('Utilisateur introuvable.');
    }

    const favorites = new Set(
      (user.favorites ?? []).map((id) =>
        id && typeof id.toString === 'function' ? id.toString() : String(id)
      )
    );

    const normalizedId = String(adId).trim();

    if (action === 'add') {
      favorites.add(normalizedId);
    } else {
      favorites.delete(normalizedId);
    }

    user.favorites = Array.from(favorites);
    await user.save();

    logger.logDB('updateFavorites', 'users', Date.now() - startTime);
    logger.info('Favoris mis à jour', { userId, adId, action });

    return user.favorites;
  }

  /**
   * Changer le mot de passe d'un utilisateur
   */
  async changePassword(userId, currentPassword, newPassword) {
    const startTime = Date.now();

    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw createError.notFound('Utilisateur introuvable.');
    }

    // Vérifier le mot de passe actuel
    const isMatch = await comparePassword(currentPassword, user.password);

    if (!isMatch) {
      throw createError.unauthorized('Mot de passe actuel incorrect.', 'INVALID_PASSWORD');
    }

    // Hasher et sauvegarder le nouveau mot de passe
    user.password = await hashPassword(newPassword);
    await user.save();

    logger.logDB('changePassword', 'users', Date.now() - startTime);
    logger.info('Mot de passe changé', { userId });

    return true;
  }

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(userId) {
    const startTime = Date.now();

    await User.findByIdAndDelete(userId);

    logger.logDB('deleteUser', 'users', Date.now() - startTime);
    logger.info('Utilisateur supprimé', { userId });

    return true;
  }

  /**
   * Définir le token de réinitialisation du mot de passe
   */
  async setResetToken(userId, tokenHash, expiresAt) {
    const startTime = Date.now();

    const user = await User.findById(userId);

    if (!user) {
      throw createError.notFound('Utilisateur introuvable.');
    }

    user.resetTokenHash = tokenHash;
    user.resetTokenExp = expiresAt;
    await user.save({ validateBeforeSave: false });

    logger.logDB('setResetToken', 'users', Date.now() - startTime);

    return user;
  }

  /**
   * Récupérer un utilisateur par token de réinitialisation
   */
  async getUserByResetToken(tokenHash) {
    const startTime = Date.now();

    const user = await User.findOne({
      resetTokenHash: tokenHash,
      resetTokenExp: { $gt: new Date() }
    }).select('+resetTokenHash +resetTokenExp');

    logger.logDB('getUserByResetToken', 'users', Date.now() - startTime);

    return user;
  }

  /**
   * Effacer le token de réinitialisation
   */
  async clearResetToken(userId) {
    const user = await User.findById(userId);

    if (!user) {
      return;
    }

    user.resetTokenHash = undefined;
    user.resetTokenExp = undefined;
    await user.save();
  }
}

export default new UserService();
