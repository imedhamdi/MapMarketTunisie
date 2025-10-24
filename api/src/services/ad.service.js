import mongoose from 'mongoose';

import Ad from '../models/ad.model.js';
import { CATEGORY_ATTRIBUTES, AD_STATUS, PAGINATION } from '../config/constants.js';
import { createError } from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

/**
 * Service de gestion des annonces
 * Centralise toute la logique métier liée aux annonces
 */
class AdService {
  /**
   * Construire un objet location GeoJSON
   */
  buildLocation({ latitude, longitude }) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw createError.badRequest('Coordonnées géographiques invalides');
    }
    
    return {
      type: 'Point',
      coordinates: [lng, lat]
    };
  }

  /**
   * Normaliser les attributs spécifiques à une catégorie
   */
  buildNormalizedAttributes(category, attributes = {}) {
    const normalized = {};
    const definition = CATEGORY_ATTRIBUTES[category];
    
    if (!definition) return normalized;
    
    definition.fields.forEach((field) => {
      const value = attributes[field.id];
      if (value == null || value === '') return;
      
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

  /**
   * Créer une nouvelle annonce
   */
  async createAd(userId, adData) {
    const startTime = Date.now();
    
    const ad = await Ad.create({
      owner: userId,
      ...adData,
      status: AD_STATUS.ACTIVE,
      views: 0,
      favoritesCount: 0
    });
    
    await ad.populate('owner', 'name email avatar memberSince createdAt');
    
    // Enrichir avec le compteur d'annonces actives
    if (ad.owner?._id) {
      const total = await Ad.countDocuments({ 
        owner: ad.owner._id, 
        status: AD_STATUS.ACTIVE 
      });
      ad.owner.activeAds = total;
    }
    
    logger.logDB('createAd', 'ads', Date.now() - startTime);
    logger.info('Annonce créée', { adId: ad._id, userId, category: ad.category });
    
    return ad;
  }

  /**
   * Construire la query MongoDB pour la recherche d'annonces
   */
  buildSearchQuery(filters = {}) {
    const {
      category,
      owner,
      status,
      search,
      condition,
      minPrice,
      maxPrice,
      city
    } = filters;
    
    const query = { status: status || AD_STATUS.ACTIVE };
    
    if (category) query.category = category;
    if (owner) query.owner = owner;
    if (condition) query.condition = condition;
    
    // Recherche textuelle
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { locationText: regex }
      ];
    }
    
    // Filtres de prix
    const priceConditions = {};
    const min = Number(minPrice);
    const max = Number(maxPrice);
    
    if (!Number.isNaN(min)) priceConditions.$gte = min;
    if (!Number.isNaN(max)) priceConditions.$lte = max;
    
    if (Object.keys(priceConditions).length) {
      query.price = priceConditions;
    }
    
    // Filtre par ville
    if (city && city.trim()) {
      const escapedCity = city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.locationText = new RegExp(escapedCity, 'i');
    }
    
    return query;
  }

  /**
   * Déterminer l'ordre de tri
   */
  getSortOrder(sortParam) {
    switch (sortParam) {
      case 'priceAsc':
        return { price: 1 };
      case 'priceDesc':
        return { price: -1 };
      case 'views':
        return { views: -1 };
      default:
        return { createdAt: -1 };
    }
  }

  /**
   * Enrichir les annonces avec le compteur d'annonces actives des propriétaires
   */
  async enrichWithOwnerStats(ads) {
    const ownerIds = Array.from(
      new Set(
        ads
          .map((ad) => ad.owner?._id?.toString())
          .filter(Boolean)
      )
    );
    
    if (ownerIds.length === 0) return ads;
    
    const counts = await Ad.aggregate([
      {
        $match: {
          owner: { $in: ownerIds.map((id) => new mongoose.Types.ObjectId(id)) },
          status: AD_STATUS.ACTIVE
        }
      },
      {
        $group: {
          _id: '$owner',
          total: { $sum: 1 }
        }
      }
    ]);
    
    const countsMap = Object.fromEntries(
      counts.map((entry) => [entry._id.toString(), entry.total])
    );
    
    ads.forEach((ad) => {
      if (ad.owner?._id) {
        ad.owner.activeAds = countsMap[ad.owner._id.toString()] ?? 0;
      }
    });
    
    return ads;
  }

  /**
   * Lister les annonces avec pagination et filtres
   */
  async listAds(filters = {}, pagination = {}) {
    const startTime = Date.now();
    
    const page = Math.max(PAGINATION.DEFAULT_PAGE, Number(pagination.page) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(PAGINATION.MIN_LIMIT, Number(pagination.limit) || PAGINATION.DEFAULT_LIMIT)
    );
    
    const query = this.buildSearchQuery(filters);
    const sortOrder = this.getSortOrder(filters.sort);
    
    const [items, total] = await Promise.all([
      Ad.find(query)
        .sort(sortOrder)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('owner', 'name email avatar memberSince createdAt')
        .lean(),
      Ad.countDocuments(query)
    ]);
    
    // Enrichir avec les stats des propriétaires
    await this.enrichWithOwnerStats(items);
    
    logger.logDB('listAds', 'ads', Date.now() - startTime);
    
    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Récupérer une annonce par ID et incrémenter les vues
   */
  async getAdById(adId) {
    const startTime = Date.now();
    
    const ad = await Ad.findByIdAndUpdate(
      adId,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('owner', 'name email avatar memberSince createdAt')
      .lean();
    
    if (!ad) {
      throw createError.notFound('Annonce introuvable.');
    }
    
    // Enrichir avec les stats du propriétaire
    if (ad.owner?._id) {
      const total = await Ad.countDocuments({
        owner: ad.owner._id,
        status: AD_STATUS.ACTIVE
      });
      ad.owner.activeAds = total;
    }
    
    logger.logDB('getAdById', 'ads', Date.now() - startTime);
    
    return ad;
  }

  /**
   * Mettre à jour une annonce
   */
  async updateAd(adId, userId, updates) {
    const startTime = Date.now();
    
    const ad = await Ad.findById(adId);
    
    if (!ad) {
      throw createError.notFound('Annonce introuvable.');
    }
    
    if (String(ad.owner) !== String(userId)) {
      throw createError.forbidden('Seul l\'auteur peut modifier cette annonce.');
    }
    
    // Appliquer les mises à jour
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        ad[key] = value;
      }
    });
    
    await ad.save();
    await ad.populate('owner', 'name email avatar memberSince createdAt');
    
    // Enrichir avec les stats
    if (ad.owner?._id) {
      const total = await Ad.countDocuments({
        owner: ad.owner._id,
        status: AD_STATUS.ACTIVE
      });
      ad.owner.activeAds = total;
    }
    
    logger.logDB('updateAd', 'ads', Date.now() - startTime);
    logger.info('Annonce mise à jour', { adId, userId });
    
    return ad;
  }

  /**
   * Supprimer une annonce
   */
  async deleteAd(adId, userId) {
    const startTime = Date.now();
    
    const ad = await Ad.findById(adId);
    
    if (!ad) {
      throw createError.notFound('Annonce introuvable.');
    }
    
    if (String(ad.owner) !== String(userId)) {
      throw createError.forbidden('Seul l\'auteur peut supprimer cette annonce.');
    }
    
    await ad.deleteOne();
    
    logger.logDB('deleteAd', 'ads', Date.now() - startTime);
    logger.info('Annonce supprimée', { adId, userId });
    
    return ad;
  }

  /**
   * Mettre à jour le compteur de favoris d'une annonce
   */
  async updateFavoritesCount(adId, increment) {
    if (!mongoose.isValidObjectId(adId)) return;
    
    const ad = await Ad.findById(adId);
    if (!ad) return;
    
    const nextCount = Math.max(0, (ad.favoritesCount || 0) + increment);
    ad.favoritesCount = nextCount;
    await ad.save();
    
    logger.debug('Compteur favoris mis à jour', { adId, count: nextCount });
  }
}

export default new AdService();
