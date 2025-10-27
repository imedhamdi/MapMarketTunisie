/**
 * Client Redis pour le caching
 * Gère la connexion et les opérations de cache
 */

import { createClient } from 'redis';

import env from './env.js';
import logger from './logger.js';

let redisClient = null;
let isConnected = false;

/**
 * Connecte le client Redis
 */
async function connectRedis() {
  if (!env.redisEnabled) {
    logger.info('Redis désactivé via configuration');
    return null;
  }

  try {
    redisClient = createClient({
      url: env.redisUrl,
      password: env.redisPassword,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Trop de tentatives de reconnexion');
            return new Error('Redis reconnexion échouée');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error', { error: err.message });
      isConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('🔄 Redis connexion en cours...');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis connecté et prêt');
      isConnected = true;
    });

    redisClient.on('reconnecting', () => {
      logger.warn('⚠️  Redis reconnexion...');
      isConnected = false;
    });

    redisClient.on('end', () => {
      logger.warn('Redis connexion fermée');
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Erreur connexion Redis', { error: error.message });
    return null;
  }
}

/**
 * Déconnecte le client Redis
 */
async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    logger.info('Redis déconnecté');
  }
}

/**
 * Obtient une valeur du cache
 * @param {string} key - Clé du cache
 * @returns {Promise<any>} - Valeur ou null
 */
async function get(key) {
  if (!isConnected || !redisClient) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (value) {
      logger.debug('Cache hit', { key });
      return JSON.parse(value);
    }
    logger.debug('Cache miss', { key });
    return null;
  } catch (error) {
    logger.error('Erreur lecture cache', { key, error: error.message });
    return null;
  }
}

/**
 * Définit une valeur dans le cache
 * @param {string} key - Clé du cache
 * @param {any} value - Valeur à cacher
 * @param {number} ttl - Time to live en secondes (défaut: 1 heure)
 * @returns {Promise<boolean>} - Succès
 */
async function set(key, value, ttl = 3600) {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    logger.debug('Cache set', { key, ttl });
    return true;
  } catch (error) {
    logger.error('Erreur écriture cache', { key, error: error.message });
    return false;
  }
}

/**
 * Supprime une clé du cache
 * @param {string} key - Clé à supprimer
 * @returns {Promise<boolean>} - Succès
 */
async function del(key) {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    await redisClient.del(key);
    logger.debug('Cache deleted', { key });
    return true;
  } catch (error) {
    logger.error('Erreur suppression cache', { key, error: error.message });
    return false;
  }
}

/**
 * Supprime toutes les clés correspondant à un pattern
 * @param {string} pattern - Pattern (ex: 'user:*')
 * @returns {Promise<number>} - Nombre de clés supprimées
 */
async function delPattern(pattern) {
  if (!isConnected || !redisClient) {
    return 0;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    await redisClient.del(keys);
    logger.debug('Cache pattern deleted', { pattern, count: keys.length });
    return keys.length;
  } catch (error) {
    logger.error('Erreur suppression pattern', { pattern, error: error.message });
    return 0;
  }
}

/**
 * Vérifie si une clé existe
 * @param {string} key - Clé à vérifier
 * @returns {Promise<boolean>}
 */
async function exists(key) {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Erreur vérification existence', { key, error: error.message });
    return false;
  }
}

/**
 * Flush tout le cache (⚠️ À utiliser avec précaution)
 * @returns {Promise<boolean>}
 */
async function flushAll() {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    await redisClient.flushAll();
    logger.warn('Cache entièrement vidé');
    return true;
  } catch (error) {
    logger.error('Erreur flush cache', { error: error.message });
    return false;
  }
}

export default {
  connect: connectRedis,
  disconnect: disconnectRedis,
  get,
  set,
  del,
  delPattern,
  exists,
  flushAll,
  get isConnected() {
    return isConnected;
  },
  get client() {
    return redisClient;
  }
};
