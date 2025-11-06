// Désactiver le compte utilisateur (isActive = false)
export async function deactivateUser(req, res) {
  try {
    const userId = req.params.id;
    // Seul l'utilisateur lui-même ou un admin peut désactiver
    if (!req.user || (req.user._id.toString() !== userId && req.user.role !== 'admin')) {
      return sendError(res, {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Non autorisé à désactiver ce compte.'
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, {
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur introuvable.'
      });
    }
    user.isActive = false;
    await user.save();
    return sendSuccess(res, {
      message: 'Compte désactivé avec succès',
      data: { user: formatUser(user) }
    });
  } catch (error) {
    logger.error('Erreur lors de la désactivation du compte', error);
    return sendError(res, {
      statusCode: 500,
      code: 'SERVER_ERROR',
      message: 'Erreur lors de la désactivation du compte.'
    });
  }
}
import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';

import User from '../models/user.model.js';
import Ad from '../models/ad.model.js';
import logger from '../config/logger.js';
import { sendSuccess, sendError, formatUser } from '../utils/responses.js';
import { clearAuthCookies } from '../utils/generateTokens.js';
import { optimizeAvatar } from '../services/image.service.js';
import userService from '../services/user.service.js';

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

/**
 * Calcule la distance entre deux points en kilomètres (formule de Haversine)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Rayon de la Terre en km
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Récupère le nom de la ville via géocodage inverse (Nominatim)
 */
async function getCityFromCoords(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'fr',
          'User-Agent': 'MapMarketTunisie/1.0'
        }
      }
    );

    if (!response.ok) {
      logger.warn(`Échec du géocodage inverse pour ${lat},${lng}`);
      return null;
    }

    const data = await response.json();
    const address = data.address || {};
    
    // Extraire le nom de la ville (priorité: city > town > village > municipality > county)
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state ||
      null;

    return city;
  } catch (error) {
    logger.error('Erreur lors du géocodage inverse:', error);
    return null;
  }
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
    const newLat = Number(lat);
    const newLng = Number(lng);

    // Vérifier si les coordonnées ont vraiment changé (distance > 0.01 km = 10 mètres)
    let shouldUpdate = true;
    if (user.location?.coords?.coordinates?.length === 2) {
      const [oldLng, oldLat] = user.location.coords.coordinates;
      const distance = calculateDistance(oldLat, oldLng, newLat, newLng);
      
      // Ne pas mettre à jour si la distance est inférieure à 10 mètres
      if (distance < 0.01) {
        shouldUpdate = false;
      }
    }

    if (shouldUpdate) {
      // Récupérer automatiquement le nom de la ville via géocodage inverse
      const city = await getCityFromCoords(newLat, newLng);

      const locationUpdate = {
        coords: [newLng, newLat],
        consent: true
      };

      // Ajouter la ville si elle a été trouvée
      if (city) {
        locationUpdate.city = city;
      }

      if (radiusKm !== undefined) {
        locationUpdate.radiusKm = Number(radiusKm);
      }

      applyLocation(user, locationUpdate);
      await user.save();

      return sendSuccess(res, {
        message: city ? `Localisation enregistrée: ${city}` : 'Localisation enregistrée',
        data: { location: user.location }
      });
    } else {
      // Les coordonnées n'ont pas changé de manière significative
      // Mettre à jour uniquement le radiusKm si fourni
      if (radiusKm !== undefined) {
        user.location.radiusKm = Number(radiusKm);
        await user.save();
      }

      return sendSuccess(res, {
        message: 'Localisation inchangée',
        data: { location: user.location }
      });
    }
  } else {
    // Ancien format (support legacy)
    applyLocation(user, req.body);
    await user.save();

    return sendSuccess(res, {
      message: 'Localisation enregistrée',
      data: { location: user.location }
    });
  }
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
      message: "Erreur lors de l'optimisation de l'avatar."
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

  let updatedFavoritesCount = null;

  if (mongoose.isValidObjectId(normalizedId)) {
    try {
      const adDoc = await Ad.findById(normalizedId);
      if (adDoc) {
        const increment = action === 'add' ? 1 : -1;
        const nextCount = Math.max(0, (adDoc.favoritesCount || 0) + increment);
        adDoc.favoritesCount = nextCount;
        await adDoc.save();
        updatedFavoritesCount = nextCount;
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
      ),
      adId: normalizedId,
      favoritesCount: updatedFavoritesCount
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

    const userAds = await Ad.find({ owner: userId })
      .select(
        'title status price views favoritesCount thumbnails previews images locationText createdAt updatedAt'
      )
      .lean();

    const totals = {
      total: userAds.length,
      active: 0,
      draft: 0,
      archived: 0,
      deleted: 0
    };

    let totalViews = 0;
    let totalFavorites = 0;
    let totalValue = 0;
    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = Number.NEGATIVE_INFINITY;

    userAds.forEach((ad) => {
      totals[ad.status] = (totals[ad.status] || 0) + 1;
      const views = Number(ad.views) || 0;
      const favs = Number(ad.favoritesCount) || 0;
      const price = Number(ad.price) || 0;

      totalViews += views;
      totalFavorites += favs;
      totalValue += price;
      if (price > 0) {
        minPrice = Math.min(minPrice, price);
        maxPrice = Math.max(maxPrice, price);
      }
    });

    if (!Number.isFinite(minPrice)) {
      minPrice = 0;
    }
    if (!Number.isFinite(maxPrice)) {
      maxPrice = 0;
    }

    const totalAds = Math.max(totals.total, 1);
    const stats = {
      summary: {
        totalAds: totals.total,
        activeAds: totals.active || 0,
        draftAds: totals.draft || 0,
        archivedAds: totals.archived || 0,
        totalViews,
        totalFavorites,
        inventoryValue: Number(totalValue.toFixed(2)),
        averagePrice: Number((totalValue / totalAds).toFixed(2))
      },
      engagement: {
        averageViews: Number((totalViews / totalAds).toFixed(1)),
        averageFavorites: Number((totalFavorites / totalAds).toFixed(1)),
        activeRate: totals.total
          ? Number((((totals.active || 0) / totals.total) * 100).toFixed(1))
          : 0
      },
      price: {
        min: minPrice,
        max: maxPrice,
        average: Number((totalValue / totalAds).toFixed(2)),
        total: Number(totalValue.toFixed(2))
      },
      recentActivity: userAds
        .slice()
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 6)
        .map((ad) => ({
          id: ad._id,
          title: ad.title,
          status: ad.status,
          views: Number(ad.views) || 0,
          favorites: Number(ad.favoritesCount) || 0,
          price: Number(ad.price) || 0,
          createdAt: ad.createdAt,
          updatedAt: ad.updatedAt,
          thumbnail:
            (ad.previews && ad.previews[0]) ||
            (ad.thumbnails && ad.thumbnails[0]) ||
            (ad.images && ad.images[0]) ||
            null
        }))
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
    const userAds = await Ad.find({ owner: userId })
      .select(
        'title status price views favoritesCount thumbnails previews images locationText location.category category createdAt updatedAt'
      )
      .lean();

    if (userAds.length === 0) {
      return sendSuccess(res, {
        message: 'Analytics récupérées',
        data: { analytics: null }
      });
    }

    const totalViews = userAds.reduce((sum, ad) => sum + (Number(ad.views) || 0), 0);
    const totalFavorites = userAds.reduce((sum, ad) => sum + (Number(ad.favoritesCount) || 0), 0);
    const totalValue = userAds.reduce((sum, ad) => sum + (Number(ad.price) || 0), 0);

    const statusMap = new Map();
    const categoryMap = new Map();
    const locationMap = new Map();

    userAds.forEach((ad) => {
      const status = ad.status || 'unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);

      const category = ad.category || 'Autres';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, views: 0, favorites: 0, totalPrice: 0 });
      }
      const catEntry = categoryMap.get(category);
      catEntry.count += 1;
      catEntry.views += Number(ad.views) || 0;
      catEntry.favorites += Number(ad.favoritesCount) || 0;
      catEntry.totalPrice += Number(ad.price) || 0;

      const city = ad.locationText || ad.location?.city || 'Non spécifié';
      if (!locationMap.has(city)) {
        locationMap.set(city, { count: 0, views: 0 });
      }
      const cityEntry = locationMap.get(city);
      cityEntry.count += 1;
      cityEntry.views += Number(ad.views) || 0;
    });

    const priceBuckets = [
      { label: '0 - 50€', min: 0, max: 50, count: 0 },
      { label: '50 - 200€', min: 50, max: 200, count: 0 },
      { label: '200 - 500€', min: 200, max: 500, count: 0 },
      { label: '500 - 1 000€', min: 500, max: 1000, count: 0 },
      { label: '1 000€ et plus', min: 1000, max: Infinity, count: 0 }
    ];

    userAds.forEach((ad) => {
      const price = Number(ad.price) || 0;
      const bucket = priceBuckets.find((b) => price >= b.min && price < b.max);
      if (bucket) {
        bucket.count += 1;
      }
    });

    const topAds = userAds
      .slice()
      .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
      .slice(0, 5)
      .map((ad) => ({
        id: ad._id,
        title: ad.title,
        category: ad.category || 'Autres',
        status: ad.status,
        views: Number(ad.views) || 0,
        favorites: Number(ad.favoritesCount) || 0,
        price: Number(ad.price) || 0,
        thumbnail:
          (ad.previews && ad.previews[0]) ||
          (ad.thumbnails && ad.thumbnails[0]) ||
          (ad.images && ad.images[0]) ||
          null
      }));

    const averageViews = Number((totalViews / userAds.length).toFixed(1));
    const averageFavorites = Number((totalFavorites / userAds.length).toFixed(1));

    const analytics = {
      overview: {
        totalViews,
        totalFavorites,
        averageViews,
        averageFavorites,
        inventoryValue: Number(totalValue.toFixed(2))
      },
      statusBreakdown: Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count
      })),
      categoryPerformance: Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          count: data.count,
          views: data.views,
          favorites: data.favorites,
          averagePrice: data.count ? Number((data.totalPrice / data.count).toFixed(2)) : 0
        }))
        .sort((a, b) => b.views - a.views),
      priceDistribution: priceBuckets,
      locationDistribution: Array.from(locationMap.entries())
        .map(([city, data]) => ({ city, count: data.count, views: data.views }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topPerformingAds: topAds,
      insights: buildAnalyticsInsights({ totals: statusMap, averageViews, averageFavorites })
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

function buildAnalyticsInsights({ totals, averageViews, averageFavorites }) {
  const insights = [];
  const active = totals.get('active') || 0;
  const draft = totals.get('draft') || 0;
  const archived = totals.get('archived') || 0;
  const total = Array.from(totals.values()).reduce((sum, value) => sum + value, 0) || 1;

  if (active === 0 && draft > 0) {
    insights.push('Vous avez des brouillons en attente. Publiez-les pour gagner en visibilité.');
  }

  if (archived > active) {
    insights.push('Votre catalogue semble calme. Réactivez des annonces pour rester visible.');
  }

  if (averageViews < 10) {
    insights.push(
      'Boostez vos annonces avec des photos de qualité et des descriptions détaillées.'
    );
  }

  if (averageFavorites === 0 && active > 0) {
    insights.push('Ajoutez des promotions ou réductions pour attirer plus de favoris.');
  }

  const activeRate = Number(((active / total) * 100).toFixed(1));
  insights.push(`Taux d'annonces actives : ${activeRate}%`);

  return insights.slice(0, 4);
}

export const changePassword = async (req, res) => {
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

    // Utiliser le service pour changer le mot de passe
    await userService.changePassword(req.user._id, currentPassword, newPassword);

    return sendSuccess(res, {
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    logger.error('Erreur lors du changement de mot de passe', { error: error.message });

    // Gérer les erreurs spécifiques du service
    if (error.statusCode === 401 || error.code === 'INVALID_PASSWORD') {
      return sendError(res, {
        statusCode: 401,
        code: 'INVALID_PASSWORD',
        message: 'Mot de passe actuel incorrect.'
      });
    }

    if (error.statusCode === 404) {
      return sendError(res, {
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur introuvable.'
      });
    }

    return sendError(res, {
      statusCode: 500,
      code: 'SERVER_ERROR',
      message: 'Erreur lors du changement de mot de passe.'
    });
  }
};

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
