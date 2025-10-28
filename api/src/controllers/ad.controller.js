import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';

import Ad from '../models/ad.model.js';
import User from '../models/user.model.js';
import { sendSuccess, sendError } from '../utils/responses.js';
import { createAdSchema, updateAdSchema } from '../validators/ad.schema.js';
import { processAdImages } from '../services/image.service.js';
import adService from '../services/ad.service.js';

const categoryDefinitions = {
  auto: {
    fields: [
      { id: 'year', type: 'number' },
      { id: 'mileage', type: 'number' },
      { id: 'fuel', type: 'string' },
      { id: 'gearbox', type: 'string' }
    ]
  },
  immobilier: {
    fields: [
      { id: 'surface', type: 'number' },
      { id: 'rooms', type: 'number' },
      { id: 'dpe', type: 'string' },
      { id: 'furnished', type: 'boolean' },
      { id: 'floor', type: 'number' }
    ]
  },
  electroniques: {
    fields: [
      { id: 'storage', type: 'number' },
      { id: 'brand', type: 'string' },
      { id: 'grade', type: 'string' }
    ]
  },
  pieces: {
    fields: [
      { id: 'compatible', type: 'string' },
      { id: 'grade', type: 'string' },
      { id: 'reference', type: 'string' }
    ]
  },
  mode: {
    fields: [
      { id: 'gender', type: 'string' },
      { id: 'size', type: 'string' },
      { id: 'brand', type: 'string' }
    ]
  },
  loisirs: {
    fields: [
      { id: 'activity', type: 'string' },
      { id: 'brand', type: 'string' },
      { id: 'model', type: 'string' }
    ]
  }
};

function stripTags(value) {
  if (typeof value !== 'string') {
    return value;
  }
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {}
  }).trim();
}

function buildLocation({ latitude, longitude }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return {
    type: 'Point',
    coordinates: [lng, lat]
  };
}

function buildNormalizedAttributes(category, attributes = {}) {
  const normalized = {};
  const def = categoryDefinitions[category];
  if (!def) {
    return normalized;
  }
  def.fields.forEach((field) => {
    const value = attributes[field.id];
    if (value == null || value === '') {
      return;
    }
    if (field.type === 'number') {
      const num = Number(value);
      if (!Number.isNaN(num)) {
        normalized[`${field.id}_num`] = num;
      }
    } else if (field.type === 'boolean') {
      normalized[`${field.id}_bool`] = Boolean(value);
    } else if (field.type === 'string') {
      normalized[`${field.id}_lc`] = String(value).toLowerCase();
    }
  });
  return normalized;
}

function sanitizeAttributes(attributes = {}) {
  const sanitized = {};
  Object.entries(attributes).forEach(([key, value]) => {
    if (typeof value === 'string') {
      sanitized[key] = stripTags(value);
    } else {
      sanitized[key] = value;
    }
  });
  return sanitized;
}

export async function createAd(req, res, next) {
  try {
    const payload = await createAdSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    const owner = req.user?._id;
    if (!owner) {
      return sendError(res, {
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentification requise.'
      });
    }
    const rawImages = Array.isArray(payload.images) ? payload.images.slice(0, 10) : [];
    const {
      images: optimizedImages,
      previews,
      thumbnails,
      webpImages,
      webpPreviews,
      webpThumbnails
    } = await processAdImages(rawImages, {
      prefix: `ad-${typeof owner === 'object' && owner !== null ? owner.toString() : owner}`
    });

    const sanitizedAttributes = sanitizeAttributes(payload.attributes || {});

    const adData = {
      owner,
      title: stripTags(payload.title),
      description: stripTags(payload.description),
      category: payload.category,
      condition: payload.condition,
      price: payload.price,
      locationText: stripTags(payload.locationText),
      location: buildLocation(payload),
      attributes: sanitizedAttributes,
      attributesNormalized: buildNormalizedAttributes(payload.category, sanitizedAttributes),
      images: optimizedImages,
      previews,
      thumbnails,
      webpImages,
      webpPreviews,
      webpThumbnails,
      status: 'active',
      views: 0,
      favoritesCount: 0
    };

    const ad = await Ad.create(adData);
    await ad.populate('owner', 'name email avatar memberSince createdAt');
    if (ad.owner?._id) {
      const total = await Ad.countDocuments({ owner, status: 'active' });
      if (ad.owner) {
        ad.owner.activeAds = total;
      }
    }
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Annonce publiée avec succès',
      data: { ad }
    });
  } catch (error) {
    next(error);
  }
}

export async function listAds(req, res, next) {
  try {
    const {
      category,
      owner,
      status,
      search,
      condition,
      minPrice,
      maxPrice,
      city,
      sort,
      cursor,
      after,
      limit
    } = req.query;

    const filters = {
      category,
      owner,
      status,
      search,
      condition,
      minPrice,
      maxPrice,
      city,
      sort
    };

    const pagination = {
      limit,
      cursor,
      after
    };

    const result = await adService.listAds(filters, pagination);

    return sendSuccess(res, {
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function getAd(req, res, next) {
  try {
    const { id } = req.params;
    const { skipView } = req.query;
    
    // Incrémenter les vues seulement si skipView n'est pas défini
    const updateQuery = skipView === 'true' ? {} : { $inc: { views: 1 } };
    
    const ad = await Ad.findByIdAndUpdate(id, updateQuery, { new: true })
      .populate('owner', 'name email avatar memberSince createdAt')
      .lean();
    if (!ad) {
      return sendError(res, {
        statusCode: 404,
        code: 'AD_NOT_FOUND',
        message: 'Annonce introuvable.'
      });
    }
    if (ad.owner?._id) {
      const total = await Ad.countDocuments({ owner: ad.owner._id, status: 'active' });
      ad.owner.activeAds = total;
    }
    return sendSuccess(res, { data: { ad } });
  } catch (error) {
    next(error);
  }
}

export async function updateAd(req, res, next) {
  try {
    const { id } = req.params;
    const payload = await updateAdSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    const ad = await Ad.findById(id);
    if (!ad) {
      return sendError(res, {
        statusCode: 404,
        code: 'AD_NOT_FOUND',
        message: 'Annonce introuvable.'
      });
    }

    if (String(ad.owner) !== String(req.user?._id)) {
      return sendError(res, {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: "Seul l'auteur peut modifier cette annonce."
      });
    }

    if (payload.title) {
      ad.title = stripTags(payload.title);
    }
    if (payload.description) {
      ad.description = stripTags(payload.description);
    }
    if (payload.category) {
      ad.category = payload.category;
    }
    if (payload.condition) {
      ad.condition = payload.condition;
    }
    if (payload.price != null) {
      ad.price = payload.price;
    }
    if (payload.status) {
      ad.status = payload.status;
    }
    if (payload.locationText) {
      ad.locationText = stripTags(payload.locationText);
    }
    if (payload.latitude != null && payload.longitude != null) {
      ad.location = buildLocation({ latitude: payload.latitude, longitude: payload.longitude });
    }
    // Only update images if explicitly provided and not empty
    if (Array.isArray(payload.images) && payload.images.length > 0) {
      const rawImages = payload.images.slice(0, 10);
      const {
        images: optimizedImages,
        previews,
        thumbnails,
        webpImages,
        webpPreviews,
        webpThumbnails
      } = await processAdImages(rawImages, {
        prefix: `ad-${ad._id}`
      });
      if (optimizedImages.length) ad.images = optimizedImages;
      if (previews.length) ad.previews = previews;
      if (thumbnails.length) ad.thumbnails = thumbnails;
      if (webpImages.length) ad.webpImages = webpImages;
      if (webpPreviews.length) ad.webpPreviews = webpPreviews;
      if (webpThumbnails.length) ad.webpThumbnails = webpThumbnails;
    }
    if (payload.attributes) {
      ad.attributes = sanitizeAttributes(payload.attributes);
    }
    const categoryForNormalization = payload.category || ad.category;
    ad.attributesNormalized = buildNormalizedAttributes(categoryForNormalization, ad.attributes);

    await ad.save();

    await ad.populate('owner', 'name email avatar memberSince createdAt');
    if (ad.owner?._id) {
      const total = await Ad.countDocuments({ owner: ad.owner._id, status: 'active' });
      ad.owner.activeAds = total;
    }

    return sendSuccess(res, {
      message: 'Annonce mise à jour',
      data: { ad }
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAd(req, res, next) {
  try {
    const { id } = req.params;
    const ad = await Ad.findById(id);
    if (!ad) {
      return sendError(res, {
        statusCode: 404,
        code: 'AD_NOT_FOUND',
        message: 'Annonce introuvable.'
      });
    }
    if (String(ad.owner) !== String(req.user?._id)) {
      return sendError(res, {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: "Seul l'auteur peut supprimer cette annonce."
      });
    }

    // Archiver l'annonce au lieu de la supprimer
    ad.status = 'archived';
    await ad.save();

    // Retirer l'annonce des favoris de tous les utilisateurs
    await User.updateMany({ favorites: id }, { $pull: { favorites: id } });

    return sendSuccess(res, { message: 'Annonce supprimée' });
  } catch (error) {
    next(error);
  }
}
