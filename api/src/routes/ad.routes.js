import { Router } from 'express';

import { authRequired } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { createAdSchema, updateAdSchema } from '../validators/ad.schema.js';
import { createAd, listAds, getAd, updateAd, deleteAd } from '../controllers/ad.controller.js';
import {
  cacheAds,
  cacheAd,
  invalidateAdsCache,
  invalidateAdCache,
  setCacheHeaders
} from '../middlewares/cache.js';
import { createAdLimiter } from '../middlewares/rateLimit.js';

const router = Router();

// Cache public pour la liste (5 minutes)
router.get('/', cacheAds(300), setCacheHeaders(300), listAds);

// Cache public pour une annonce (10 minutes)
router.get('/:id', cacheAd(600), setCacheHeaders(600), getAd);

// Invalider le cache lors de la création/modification/suppression
router.post(
  '/',
  authRequired,
  createAdLimiter,
  validate(createAdSchema),
  invalidateAdsCache(),
  createAd
);
router.patch(
  '/:id',
  authRequired,
  validate(updateAdSchema),
  invalidateAdsCache(),
  invalidateAdCache(),
  updateAd
);
router.delete('/:id', authRequired, invalidateAdsCache(), invalidateAdCache(), deleteAd);

export default router;
