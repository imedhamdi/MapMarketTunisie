import { Router } from 'express';

import {
  signup,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe
} from '../controllers/auth.controller.js';
import { optionalAuth } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { authLimiter, forgotPasswordLimiter } from '../middlewares/rateLimit.js';
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validators/auth.schema.js';

const router = Router();

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', optionalAuth, getMe);

export default router;
