import express from 'express';
import { healthCheck, readinessCheck, metricsCheck } from '../controllers/health.controller.js';

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
 * @desc Métriques système
 * @access Public (à protéger en production)
 */
router.get('/metrics', metricsCheck);

export default router;
