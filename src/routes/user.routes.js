import { Router } from 'express';
import multer from 'multer';

import {
  updateMe,
  updateLocation,
  updateAvatar,
  updateFavorites,
  deleteMe,
  getUserStats,
  getUserAnalytics,
  changePassword,
  uploadAvatar,
  deactivateUser,
  getRecentlyViewed,
  addRecentlyViewed
} from '../controllers/user.controller.js';
import { authRequired } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
  updateMeSchema,
  updateLocationSchema,
  favoritesSchema
} from '../validators/user.schema.js';
import { uploadLimiter } from '../middlewares/rateLimit.js';
import { cacheUser, invalidateUserCache } from '../middlewares/cache.js';

const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMime.includes(file.mimetype)) {
      const error = new Error('Format d’image non supporté.');
      error.statusCode = 400;
      error.code = 'UNSUPPORTED_MEDIA_TYPE';
      return cb(error);
    }
    cb(null, true);
  }
});

const router = Router();

router.use(authRequired);

// Désactiver le compte utilisateur (admin ou self)
router.patch('/users/:id/deactivate', invalidateUserCache(), deactivateUser);

router.patch('/me', validate(updateMeSchema), invalidateUserCache(), updateMe);
router.post('/me/location', validate(updateLocationSchema), invalidateUserCache(), updateLocation);
router.patch(
  '/me/avatar',
  uploadLimiter,
  upload.single('avatar'),
  invalidateUserCache(),
  updateAvatar
);
router.post(
  '/me/avatar',
  uploadLimiter,
  upload.single('avatar'),
  invalidateUserCache(),
  uploadAvatar
);
router.post('/me/favorites', validate(favoritesSchema), invalidateUserCache(), updateFavorites);
router.get('/me/stats', cacheUser(300), getUserStats);
router.get('/me/analytics', cacheUser(300), getUserAnalytics);
router.post('/me/change-password', invalidateUserCache(), changePassword);
router.get('/me/recently-viewed', getRecentlyViewed);
router.post('/me/recently-viewed', invalidateUserCache(), addRecentlyViewed);
router.delete('/me', invalidateUserCache(), deleteMe);

export default router;
