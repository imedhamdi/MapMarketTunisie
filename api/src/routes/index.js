import { Router } from 'express';

import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import adRoutes from './ad.routes.js';
import geocodeRoutes from './geocode.routes.js';

const router = Router();

// Version 1 de l'API
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/ads', adRoutes);
router.use('/geocode', geocodeRoutes);

export default router;
