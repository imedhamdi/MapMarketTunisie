import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';

import User from '../models/user.model.js';
import Ad from '../models/ad.model.js';
import logger from '../config/logger.js';
import { sendSuccess, sendError, formatUser } from '../utils/responses.js';
import { clearAuthCookies } from '../utils/generateTokens.js';
import { optimizeAvatar } from '../services/image.service.js';

const sanitize = (value) =>
  typeof value === 'string'
    ? sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {}
      }).trim()
    : value;

function normalizeCoords(coords) {
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

function applyLocation(user, locationPayload = {}) {
  const { city, coords, radiusKm, consent } = locationPayload;
  const update = {};
  if (city !== undefined) {
    update.city = sanitize(city);
  }
  if (coords !== undefined) {
    const normalized = normalizeCoords(coords);
    if (normalized) {
      update.coords = { type: 'Point', coordinates: normalized };
      update.lastUpdated = new Date(); // Mise à jour de la date quand les coords changent
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

export async function updateMe(req, res) {
  const { name, email, location } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    return sendError(res, {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
      message: 'Utilisateur introuvable.'
    });
  }

  if (name !== undefined) {
    user.name = sanitize(name);
  }

  if (email !== undefined && email !== user.email) {
    const exists = await User.findOne({ email, _id: { $ne: user._id } });
    if (exists) {
      return sendError(res, {
        statusCode: 409,
        code: 'EMAIL_EXISTS',
        message: 'Cet email est déjà utilisé.'
      });
    }
    user.email = email;
  }

  if (location !== undefined) {
    applyLocation(user, location);
  }

  await user.save();

  return sendSuccess(res, {
    message: 'Profil mis à jour',
    data: { user: formatUser(user) }
  });
}

export async function updateLocation(req, res) {
  const user = await User.findById(req.user._id);
  if (!user) {
    return sendError(res, {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
      message: 'Utilisateur introuvable.'
    });
  }

  // Support pour les deux formats: { lat, lng, radiusKm } et l'ancien format { coords, city, ... }
  const { lat, lng, radiusKm } = req.body;

  if (lat != null && lng != null) {
    // Nouveau format simplifié
    const locationUpdate = {
      coords: [Number(lng), Number(lat)],
      consent: true
    };

    if (radiusKm !== undefined) {
      locationUpdate.radiusKm = Number(radiusKm);
    }

    applyLocation(user, locationUpdate);
  } else {
    // Ancien format (support legacy)
    applyLocation(user, req.body);
  }

  await user.save();

  return sendSuccess(res, {
    message: 'Localisation enregistrée',
    data: { location: user.location }
  });
}

export async function updateAvatar(req, res) {
  if (!req.file) {
    return sendError(res, {
      statusCode: 400,
      code: 'NO_FILE',
      message: 'Aucun fichier reçu.'
    });
  }

  try {
    // Optimiser l'avatar avec Sharp
    const avatarDir = 'uploads/avatars';
    const optimized = await optimizeAvatar(req.file.path, avatarDir, req.user._id);

    // Mettre à jour l'utilisateur avec les URLs
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        avatar: optimized.sizes.standard,
        avatarUrl: optimized.sizes.standard
      },
      { new: true }
    );

    if (!user) {
      return sendError(res, {
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur introuvable.'
      });
    }

    logger.info('Avatar optimisé et sauvegardé', {
      userId: user._id,
      sizes: optimized.sizes
    });

    return sendSuccess(res, {
      message: 'Avatar mis à jour',
      data: {
        avatar: user.avatar,
        avatarUrl: user.avatarUrl,
        sizes: optimized.sizes
      }
    });
  } catch (error) {
    logger.error('Erreur mise à jour avatar', { error: error.message });
    return sendError(res, {
      statusCode: 500,
      code: 'AVATAR_OPTIMIZATION_ERROR',
      message: 'Erreur lors de l\'optimisation de l\'avatar.'
    });
  }
}

export async function updateFavorites(req, res) {
  const { adId, action } = req.body;
  const normalizedId = String(adId).trim();
  const isObjectId = mongoose.isValidObjectId(normalizedId);
  const isNumericId = /^\d+$/.test(normalizedId);
  if (!isObjectId && !isNumericId) {
    return sendError(res, {
      statusCode: 400,
      code: 'INVALID_AD_ID',
      message: 'Identifiant d’annonce invalide.'
    });
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    return sendError(res, {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
      message: 'Utilisateur introuvable.'
    });
  }

  const favorites = new Set(
    (user.favorites ?? []).map((id) =>
      id && typeof id.toString === 'function' ? id.toString() : String(id)
    )
  );
  if (action === 'add') {
    favorites.add(normalizedId);
  } else {
    favorites.delete(normalizedId);
  }
  user.favorites = Array.from(favorites).map((id) =>
    mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id
  );
  await user.save();

  if (mongoose.isValidObjectId(normalizedId)) {
    try {
      const adDoc = await Ad.findById(normalizedId);
      if (adDoc) {
        const increment = action === 'add' ? 1 : -1;
        const nextCount = Math.max(0, (adDoc.favoritesCount || 0) + increment);
        adDoc.favoritesCount = nextCount;
        await adDoc.save();
      }
    } catch (error) {
      logger.warn('Impossible de synchroniser le compteur de favoris', {
        error: error.message,
        adId: normalizedId
      });
    }
  }

  return sendSuccess(res, {
    message: 'Favoris mis à jour',
    data: {
      favorites: user.favorites.map((value) =>
        value && value.toString ? value.toString() : String(value)
      )
    }
  });
}

export async function deleteMe(req, res) {
  await User.findByIdAndDelete(req.user._id);
  clearAuthCookies(res);

  return sendSuccess(res, {
    message: 'Compte supprimé'
  });
}

export async function getUserStats(req, res) {
  try {
    const userId = req.user._id;

    // Récupérer toutes les annonces de l'utilisateur
    const userAds = await Ad.find({ owner: userId });

    // Calculer les statistiques
    const stats = {
      total: userAds.length,
      active: userAds.filter((ad) => ad.status === 'active').length,
      draft: userAds.filter((ad) => ad.status === 'draft').length,
      archived: userAds.filter((ad) => ad.status === 'archived').length,
      totalViews: userAds.reduce((sum, ad) => sum + (ad.views || 0), 0),
      totalFavorites: userAds.reduce((sum, ad) => sum + (ad.favoritesCount || 0), 0)
    };

    return sendSuccess(res, {
      message: 'Statistiques récupérées',
      data: { stats }
    });
  } catch (error) {
    return sendError(res, {
      statusCode: 500,
      code: 'SERVER_ERROR',
      message: 'Erreur lors de la récupération des statistiques.'
    });
  }
}

export async function getUserAnalytics(req, res) {
  try {
    const userId = req.user._id;

    // Récupérer toutes les annonces de l'utilisateur
    const userAds = await Ad.find({ owner: userId });

    if (userAds.length === 0) {
      return sendSuccess(res, {
        message: 'Analytics récupérées',
        data: { analytics: null }
      });
    }

    // Calculer les métriques
    const totalViews = userAds.reduce((sum, ad) => sum + (ad.views || 0), 0);
    const totalFavorites = userAds.reduce((sum, ad) => sum + (ad.favoritesCount || 0), 0);
    const totalContacts = userAds.reduce((sum, ad) => sum + (ad.contacts || 0), 0);

    // Taux d'engagement (favoris / vues * 100)
    const engagementRate = totalViews > 0 ? ((totalFavorites / totalViews) * 100).toFixed(1) : 0;

    // Taux de conversion (contacts / vues * 100)
    const conversionRate = totalViews > 0 ? ((totalContacts / totalViews) * 100).toFixed(1) : 0;

    // Top performing ads (top 5 par vues)
    const topAds = [...userAds]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map((ad) => ({
        id: ad._id,
        title: ad.title,
        category: ad.category,
        city: ad.city,
        views: ad.views || 0,
        favorites: ad.favoritesCount || 0,
        contacts: ad.contacts || 0
      }));

    // Analytics par catégorie
    const categoryStats = {};
    userAds.forEach((ad) => {
      const cat = ad.category || 'Non catégorisé';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, views: 0, favorites: 0 };
      }
      categoryStats[cat].count++;
      categoryStats[cat].views += ad.views || 0;
      categoryStats[cat].favorites += ad.favoritesCount || 0;
    });

    // Analytics par ville
    const cityStats = {};
    userAds.forEach((ad) => {
      const city = ad.city || 'Non spécifié';
      if (!cityStats[city]) {
        cityStats[city] = { count: 0, views: 0 };
      }
      cityStats[city].count++;
      cityStats[city].views += ad.views || 0;
    });

    const analytics = {
      overview: {
        totalViews,
        totalFavorites,
        totalContacts,
        engagementRate: parseFloat(engagementRate),
        conversionRate: parseFloat(conversionRate)
      },
      topPerformingAds: topAds,
      categoryStats,
      cityStats,
      averages: {
        viewsPerAd: userAds.length > 0 ? (totalViews / userAds.length).toFixed(1) : 0,
        favoritesPerAd: userAds.length > 0 ? (totalFavorites / userAds.length).toFixed(1) : 0
      }
    };

    return sendSuccess(res, {
      message: 'Analytics récupérées',
      data: { analytics }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des analytics', { error: error.message });
    return sendError(res, {
      statusCode: 500,
      code: 'SERVER_ERROR',
      message: 'Erreur lors de la récupération des analytics.'
    });
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, {
        statusCode: 400,
        code: 'MISSING_FIELDS',
        message: 'Tous les champs sont requis.'
      });
    }

    if (newPassword.length < 8) {
      return sendError(res, {
        statusCode: 400,
        code: 'INVALID_PASSWORD',
        message: 'Le mot de passe doit contenir au moins 8 caractères.'
      });
    }

    // Récupérer l'utilisateur avec le mot de passe
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return sendError(res, {
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur introuvable.'
      });
    }

    // Vérifier le mot de passe actuel
    const bcrypt = await import('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return sendError(res, {
        statusCode: 401,
        code: 'INVALID_PASSWORD',
        message: 'Mot de passe actuel incorrect.'
      });
    }

    // Hasher et sauvegarder le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return sendSuccess(res, {
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    logger.error('Erreur lors du changement de mot de passe', { error: error.message });
    return sendError(res, {
      statusCode: 500,
      code: 'SERVER_ERROR',
      message: 'Erreur lors du changement de mot de passe.'
    });
  }
}

/**
 * Upload/update user avatar
 */
export async function uploadAvatar(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return sendError(res, {
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Non authentifié'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return sendError(res, {
        statusCode: 400,
        code: 'NO_FILE',
        message: 'Aucun fichier fourni'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, {
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé'
      });
    }

    // Update user avatar with the filename
    user.avatar = req.file.filename;
    await user.save();

    return sendSuccess(res, {
      message: 'Avatar mis à jour avec succès',
      data: {
        avatar: user.avatar
      }
    });
  } catch (error) {
    logger.error("Erreur lors de l'upload de l'avatar", { error: error.message });
    return sendError(res, {
      statusCode: 500,
      code: 'SERVER_ERROR',
      message: "Erreur lors de l'upload de l'avatar"
    });
  }
}
