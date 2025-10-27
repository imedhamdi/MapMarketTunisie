import express from 'express';
import { healthCheck, readinessCheck, metricsCheck } from '../controllers/health.controller.js';
import { secureMonitoring } from '../middlewares/monitoringAuth.js';

const router = express.Router();

/**
 * @route GET /health
 * @desc Health check basique
 * @access Public
 */
router.get('/health', healthCheck);

/**
 * @route GET /ready
 * @desc Readiness check (pour orchestrateurs)
 * @access Public
 */
router.get('/ready', readinessCheck);

/**
 * @route GET /metrics
 * @desc Métriques système (informations sensibles)
 * @access Protected - Requiert X-Monitoring-Token header
 * @security
 *   - Token via header X-Monitoring-Token
 *   - Restriction IP optionnelle (MONITORING_ALLOWED_IPS)
 */
router.get('/metrics', secureMonitoring, metricsCheck);

export default router;
