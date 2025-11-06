import { Router } from 'express';

import { generateSitemap, generateRobotsTxt } from '../controllers/seo.controller.js';
import { setCacheHeaders } from '../middlewares/cache.js';

const router = Router();

// Sitemap XML - cache 1 heure
router.get('/sitemap.xml', setCacheHeaders(3600), generateSitemap);

// Robots.txt - cache 24 heures
router.get('/robots.txt', setCacheHeaders(86400, { immutable: true }), generateRobotsTxt);

export default router;
