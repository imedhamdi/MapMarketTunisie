/**
 * Middleware de cache pour les routes API
 * Utilise Redis pour mettre en cache les réponses
 */

import redis from '../config/redis.js';
import logger from '../config/logger.js';

/**
 * Middleware de cache pour GET requests
 * @param {number} ttl - Time to live en secondes (défaut: 5 minutes)
 * @param {Function} keyGenerator - Fonction pour générer la clé de cache
 * @returns {Function} - Middleware Express
 */
function cacheMiddleware(ttl = 300, keyGenerator = null) {
  return async (req, res, next) => {
    // Seulement pour GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Si Redis n'est pas connecté, skip le cache
    if (!redis.isConnected) {
      return next();
    }

    try {
      // Générer la clé de cache
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : `cache:${req.originalUrl || req.url}:${JSON.stringify(req.query)}`;

      // Vérifier si la réponse est en cache
      const cachedResponse = await redis.get(cacheKey);

      if (cachedResponse) {
        logger.debug('Réponse servie depuis le cache', { key: cacheKey });
        return res.json(cachedResponse);
      }

      // Intercepter la méthode res.json pour cacher la réponse
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Cacher uniquement les réponses réussies (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.set(cacheKey, data, ttl).catch((err) => {
            logger.error('Erreur mise en cache', { error: err.message });
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Erreur middleware cache', { error: error.message });
      next();
    }
  };
}

/**
 * Middleware pour invalider le cache
 * @param {string|Function} pattern - Pattern de clés à invalider ou fonction
 * @returns {Function} - Middleware Express
 */
function invalidateCache(pattern) {
  return async (req, res, next) => {
    if (!redis.isConnected) {
      return next();
    }

    try {
      const patternStr = typeof pattern === 'function' ? pattern(req) : pattern;

      // Attacher une fonction pour invalider après la réponse
      res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await redis.delPattern(patternStr);
          logger.debug('Cache invalidé', { pattern: patternStr });
        }
      });

      next();
    } catch (error) {
      logger.error('Erreur invalidation cache', { error: error.message });
      next();
    }
  };
}

/**
 * Cache spécifique pour les annonces
 * @param {number} ttl - Time to live (défaut: 5 minutes)
 */
export function cacheAds(ttl = 300) {
  return cacheMiddleware(ttl, (req) => {
    const {
      cursor = 'start',
      limit = 20,
      category,
      owner,
      status,
      sort,
      search,
      minPrice,
      maxPrice,
      city,
      condition
    } = req.query;

    return [
      'cache',
      'ads',
      `cursor:${cursor || 'start'}`,
      `limit:${limit}`,
      `category:${category || 'all'}`,
      `owner:${owner || 'all'}`,
      `status:${status || 'all'}`,
      `sort:${sort || 'createdAt'}`,
      `search:${search || 'none'}`,
      `condition:${condition || 'all'}`,
      `min:${minPrice || 'none'}`,
      `max:${maxPrice || 'none'}`,
      `city:${city || 'all'}`
    ].join(':');
  });
}

/**
 * Cache spécifique pour une annonce unique
 * @param {number} ttl - Time to live (défaut: 10 minutes)
 */
export function cacheAd(ttl = 600) {
  const middleware = cacheMiddleware(ttl, (req) => {
    const skipView = req.query.skipView === 'true';
    return `cache:ad:${req.params.id}:${skipView ? 'skip' : 'view'}`;
  });

  return (req, res, next) => {
    // Ne pas mettre en cache les requêtes qui doivent incrémenter les vues
    if (req.query.skipView !== 'true') {
      return next();
    }
    return middleware(req, res, next);
  };
}

/**
 * Cache spécifique pour les profils utilisateurs
 * @param {number} ttl - Time to live (défaut: 15 minutes)
 */
export function cacheUser(ttl = 900) {
  return cacheMiddleware(ttl, (req) => `cache:user:${req.user?._id || 'anonymous'}`);
}

/**
 * Invalide le cache des annonces
 */
export function invalidateAdsCache() {
  return invalidateCache('cache:ads:*');
}

/**
 * Invalide le cache d'une annonce spécifique
 */
export function invalidateAdCache() {
  return invalidateCache((req) => `cache:ad:${req.params.id}:*`);
}

/**
 * Invalide le cache utilisateur
 */
export function invalidateUserCache() {
  return invalidateCache((req) => `cache:user:${req.user?._id}`);
}

/**
 * Headers HTTP pour le cache côté client
 * @param {number} maxAge - Durée en secondes
 * @param {Object} options - Options additionnelles
 */
export function setCacheHeaders(maxAge = 300, options = {}) {
  return (req, res, next) => {
    const {
      private: isPrivate = false,
      mustRevalidate = false,
      noTransform = true,
      immutable = false
    } = options;

    const directives = [];

    if (isPrivate) {
      directives.push('private');
    } else {
      directives.push('public');
    }

    directives.push(`max-age=${maxAge}`);

    if (mustRevalidate) {
      directives.push('must-revalidate');
    }

    if (noTransform) {
      directives.push('no-transform');
    }

    if (immutable) {
      directives.push('immutable');
    }

    res.setHeader('Cache-Control', directives.join(', '));
    next();
  };
}
