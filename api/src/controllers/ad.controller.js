import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';

import Ad from '../models/ad.model.js';
import User from '../models/user.model.js';
import { sendSuccess, sendError } from '../utils/responses.js';
import { createAdSchema, updateAdSchema } from '../validators/ad.schema.js';

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
  if (typeof value !== 'string') return value;
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
  if (!def) return normalized;
  def.fields.forEach((field) => {
    const value = attributes[field.id];
    if (value == null || value === '') return;
    if (field.type === 'number') {
      const num = Number(value);
      if (!Number.isNaN(num)) normalized[`${field.id}_num`] = num;
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
    if (typeof value === 'string') sanitized[key] = stripTags(value);
    else sanitized[key] = value;
  });
  return sanitized;
}

export async function createAd(req, res, next) {
  try {
    const payload = await createAdSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
    const owner = req.user?._id;
    if (!owner) {
      return sendError(res, {
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentification requise.'
      });
    }
    const adData = {
      owner,
      title: stripTags(payload.title),
      description: stripTags(payload.description),
      category: payload.category,
      condition: payload.condition,
      price: payload.price,
      locationText: stripTags(payload.locationText),
      location: buildLocation(payload),
      attributes: sanitizeAttributes(payload.attributes || {}),
      attributesNormalized: buildNormalizedAttributes(payload.category, payload.attributes),
      images: Array.isArray(payload.images) ? payload.images.slice(0, 10) : [],
      status: 'active',
      views: 0,
      favoritesCount: 0
    };

    const ad = await Ad.create(adData);
    await ad.populate('owner', 'name email avatar memberSince createdAt');
    if (ad.owner?._id) {
      const total = await Ad.countDocuments({ owner, status: 'active' });
      if (ad.owner) ad.owner.activeAds = total;
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
      page = 1,
      limit = 20,
      category,
      owner,
      status,
      search,
      condition,
      minPrice,
      maxPrice,
      city
    } = req.query;
    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));

    const query = { status: status || 'active' }; // Par défaut, afficher seulement les annonces actives
    if (category) query.category = category;
    if (owner) query.owner = owner;
    if (condition) query.condition = condition;

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [{ title: regex }, { description: regex }, { locationText: regex }];
    }

    const priceConditions = {};
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (!Number.isNaN(min)) priceConditions.$gte = min;
    if (!Number.isNaN(max)) priceConditions.$lte = max;
    if (Object.keys(priceConditions).length) {
      query.price = priceConditions;
    }

    if (city && city.trim()) {
      const escapedCity = city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.locationText = new RegExp(escapedCity, 'i');
    }

    let sortOrder = { createdAt: -1 };
    if (req.query.sort === 'priceAsc') sortOrder = { price: 1 };
    else if (req.query.sort === 'priceDesc') sortOrder = { price: -1 };

    const [items, total] = await Promise.all([
      Ad.find(query)
        .sort(sortOrder)
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .populate('owner', 'name email avatar memberSince createdAt')
        .lean(),
      Ad.countDocuments(query)
    ]);

    const ownerIds = Array.from(
      new Set(
        items
          .map((item) => (item.owner && item.owner._id ? item.owner._id.toString() : null))
          .filter(Boolean)
      )
    );

    if (ownerIds.length) {
      const counts = await Ad.aggregate([
        { $match: { owner: { $in: ownerIds.map((id) => new mongoose.Types.ObjectId(id)) }, status: 'active' } },
        { $group: { _id: '$owner', total: { $sum: 1 } } }
      ]);
      const map = Object.fromEntries(counts.map((entry) => [entry._id.toString(), entry.total]));
      items.forEach((item) => {
        if (item.owner && item.owner._id) {
          item.owner.activeAds = map[item.owner._id.toString()] ?? 0;
        }
      });
    }

    return sendSuccess(res, {
      data: {
        items,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          pages: Math.ceil(total / parsedLimit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getAd(req, res, next) {
  try {
    const { id } = req.params;
    const ad = await Ad.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })
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
    const payload = await updateAdSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
    
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
        message: 'Seul l\'auteur peut modifier cette annonce.'
      });
    }

    if (payload.title) ad.title = stripTags(payload.title);
    if (payload.description) ad.description = stripTags(payload.description);
    if (payload.category) ad.category = payload.category;
    if (payload.condition) ad.condition = payload.condition;
    if (payload.price != null) ad.price = payload.price;
    if (payload.status) ad.status = payload.status;
    if (payload.locationText) ad.locationText = stripTags(payload.locationText);
    if (payload.latitude != null && payload.longitude != null) {
      ad.location = buildLocation({ latitude: payload.latitude, longitude: payload.longitude });
    }
    // Only update images if explicitly provided and not empty
    if (Array.isArray(payload.images) && payload.images.length > 0) {
      ad.images = payload.images.slice(0, 10);
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
        message: 'Seul l\'auteur peut supprimer cette annonce.'
      });
    }

    // Archiver l'annonce au lieu de la supprimer
    ad.status = 'archived';
    await ad.save();
    
    // Retirer l'annonce des favoris de tous les utilisateurs
    await User.updateMany(
      { favorites: id },
      { $pull: { favorites: id } }
    );
    
    return sendSuccess(res, { message: 'Annonce supprimée' });
  } catch (error) {
    next(error);
  }
}
