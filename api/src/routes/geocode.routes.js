import { Router } from 'express';
import { reverseGeocode } from '../controllers/geocode.controller.js';

const router = Router();

router.get('/reverse', reverseGeocode);

export default router;
