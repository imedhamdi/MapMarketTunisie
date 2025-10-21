import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';

import User from '../models/user.model.js';
import Ad from '../models/ad.model.js';
import { sendSuccess, sendError, formatUser } from '../utils/responses.js';
import { clearAuthCookies } from '../utils/generateTokens.js';

const sanitize = (value) =>
  typeof value === 'string'
    ? sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {}
      }).trim()
    : value;

function normalizeCoords(coords) {
  if (!coords) return undefined;
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
    } else if (coords === null) {
      update.coords = undefined;
    }
  }
  if (radiusKm !== undefined) update.radiusKm = radiusKm;
  if (consent !== undefined) update.consent = consent;

  const existing =
    typeof user.location?.toObject === 'function'
      ? user.location.toObject()
      : user.location ?? {};

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

  applyLocation(user, req.body);
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

  const user = await User.findByIdAndUpdate(req.user._id, { avatar: req.file.filename }, { new: true });
  if (!user) {
    return sendError(res, {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
      message: 'Utilisateur introuvable.'
    });
  }

  return sendSuccess(res, {
    message: 'Avatar mis à jour',
    data: { avatar: user.avatar }
  });
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

  const favorites = new Set((user.favorites ?? []).map((id) => (id && typeof id.toString === 'function' ? id.toString() : String(id))));
  if (action === 'add') {
    favorites.add(normalizedId);
  } else {
    favorites.delete(normalizedId);
  }
  user.favorites = Array.from(favorites).map((id) => (mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id));
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
      console.warn('Unable to sync favorites count', error);
    }
  }

  return sendSuccess(res, {
    message: 'Favoris mis à jour',
    data: { favorites: user.favorites.map((value) => (value && value.toString ? value.toString() : String(value))) }
  });
}

export async function deleteMe(req, res) {
  await User.findByIdAndDelete(req.user._id);
  clearAuthCookies(res);

  return sendSuccess(res, {
    message: 'Compte supprimé'
  });
}
