import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../utils/responses.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * Endpoint de health check basique
 * Indique si le serveur répond
 */
export async function healthCheck(req, res) {
  return sendSuccess(res, {
    message: 'Service opérationnel',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
}

/**
 * Endpoint de readiness check
 * Vérifie que toutes les dépendances sont disponibles
 */
export async function readinessCheck(req, res) {
  const checks = {
    server: 'healthy',
    database: 'unknown',
    memory: 'unknown'
  };
  
  let isReady = true;
  
  // Vérifier la connexion MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      checks.database = 'healthy';
    } else {
      checks.database = 'unhealthy';
      isReady = false;
    }
  } catch (error) {
    checks.database = 'unhealthy';
    isReady = false;
  }
  
  // Vérifier la mémoire
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };
  
  // Alerte si utilisation > 90% du heap
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (heapUsagePercent > 90) {
    checks.memory = 'warning';
  } else {
    checks.memory = 'healthy';
  }
  
  if (isReady) {
    return sendSuccess(res, {
      message: 'Service prêt',
      data: {
        status: 'ready',
        checks,
        memory: memUsageMB,
        timestamp: new Date().toISOString()
      }
    });
  } else {
    return sendError(res, {
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: 'SERVICE_NOT_READY',
      message: 'Service non prêt'
    });
  }
}

/**
 * Endpoint de métriques système
 */
export async function metricsCheck(req, res) {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return sendSuccess(res, {
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform
      }
    }
  });
}
