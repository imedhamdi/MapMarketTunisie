// api/src/routes/recentlyViewed.routes.js
import { Router } from 'express';
import { getRecentlyViewed, addRecentlyViewed } from '../controllers/recentlyViewed.controller.js';
import auth from '../middlewares/auth.js';

const router = Router();

// GET /api/recently_viewed?limit=20
router.get('/', auth.optional, getRecentlyViewed);
// POST /api/recently_viewed
router.post('/', auth.required, addRecentlyViewed);

export default router;
