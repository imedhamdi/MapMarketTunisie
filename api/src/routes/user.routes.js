import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';

import {
  updateMe,
  updateLocation,
  updateAvatar,
  updateFavorites,
  deleteMe
} from '../controllers/user.controller.js';
import { authRequired } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { updateMeSchema, updateLocationSchema, favoritesSchema } from '../validators/user.schema.js';

const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve('uploads/avatars'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const userId = req.user?._id ?? 'anonymous';
    cb(null, `user-${userId}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
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

router.patch('/me', validate(updateMeSchema), updateMe);
router.post('/me/location', validate(updateLocationSchema), updateLocation);
router.patch('/me/avatar', upload.single('avatar'), updateAvatar);
router.post('/me/favorites', validate(favoritesSchema), updateFavorites);
router.delete('/me', deleteMe);

export default router;
