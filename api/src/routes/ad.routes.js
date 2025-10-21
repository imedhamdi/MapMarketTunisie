import { Router } from 'express';

import { authRequired } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { createAdSchema, updateAdSchema } from '../validators/ad.schema.js';
import { createAd, listAds, getAd, updateAd, deleteAd } from '../controllers/ad.controller.js';

const router = Router();

router.get('/', listAds);
router.get('/:id', getAd);
router.post('/', authRequired, validate(createAdSchema), createAd);
router.patch('/:id', authRequired, validate(updateAdSchema), updateAd);
router.delete('/:id', authRequired, deleteAd);

export default router;
