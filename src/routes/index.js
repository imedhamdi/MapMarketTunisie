import { Router } from 'express';

import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import adRoutes from './ad.routes.js';
import geocodeRoutes from './geocode.routes.js';
import chatRoutes from './chat.routes.js';

const router = Router();

// Version 1 de l'API
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/ads', adRoutes);
router.use('/geocode', geocodeRoutes);
router.use('/chat', chatRoutes);

export default router;
