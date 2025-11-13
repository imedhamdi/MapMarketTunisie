import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';

import * as chatController from '../controllers/chat.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { sanitizeMiddleware } from '../middlewares/sanitize.js';
import validate from '../middlewares/validate.js';
import {
  startConversationSchema,
  sendMessageSchema,
  getMessagesSchema,
  getConversationsSchema,
  conversationIdSchema,
  reportMessageParamsSchema,
  reportMessageBodySchema,
  searchMessagesSchema,
  callConsentSchema
} from '../validators/chat.schema.js';
import { sendError } from '../utils/responses.js';
import logger from '../config/logger.js';
import { uploadLimiter } from '../middlewares/rateLimit.js';

const router = Router();

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  handler: (req, res) => {
    logger.warn("Rate limit dépassé pour l'envoi de messages", {
      userId: req.user?._id,
      ip: req.ip
    });
    return sendError(res, {
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: 'Trop de messages envoyés. Veuillez patienter avant de continuer.'
    });
  }
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  handler: (req, res) => {
    return sendError(res, {
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: 'Trop de requêtes. Veuillez patienter.'
    });
  }
});

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Format de fichier non supporté (JPEG, PNG ou WEBP uniquement).');
      error.statusCode = 400;
      error.code = 'UNSUPPORTED_MEDIA_TYPE';
      return cb(error);
    }
    return cb(null, true);
  }
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'audio/webm',
      'audio/ogg',
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/x-m4a'
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Format audio non supporté (webm, ogg, mp3, mp4 ou m4a uniquement).');
      error.statusCode = 400;
      error.code = 'UNSUPPORTED_MEDIA_TYPE';
      return cb(error);
    }
    return cb(null, true);
  }
});

router.use(authRequired);

router.post(
  '/start',
  chatLimiter,
  sanitizeMiddleware,
  validate(startConversationSchema),
  chatController.startConversation
);
router.get(
  '/conversations',
  chatLimiter,
  validate(getConversationsSchema, 'query'),
  chatController.getConversations
);
router.get(
  '/conversations/:id',
  chatLimiter,
  validate(conversationIdSchema, 'params'),
  chatController.getConversation
);
router.get(
  '/conversations/:id/messages',
  chatLimiter,
  validate(conversationIdSchema, 'params'),
  validate(getMessagesSchema, 'query'),
  chatController.getMessages
);
router.get(
  '/search',
  chatLimiter,
  validate(searchMessagesSchema, 'query'),
  chatController.searchMessages
);
router.post(
  '/conversations/:id/messages',
  messageLimiter,
  sanitizeMiddleware,
  validate(conversationIdSchema, 'params'),
  validate(sendMessageSchema),
  chatController.sendMessage
);
router.post(
  '/attachments',
  uploadLimiter,
  attachmentUpload.single('file'),
  chatController.uploadAttachment
);
router.post('/audio', uploadLimiter, audioUpload.single('file'), chatController.uploadAudioMessage);
router.delete('/attachments/:key', chatLimiter, chatController.deleteAttachment);
router.post(
  '/conversations/:id/read',
  chatLimiter,
  validate(conversationIdSchema, 'params'),
  chatController.markAsRead
);
router.post(
  '/conversations/:id/block',
  chatLimiter,
  validate(conversationIdSchema, 'params'),
  chatController.blockConversation
);
router.post(
  '/conversations/:id/unblock',
  chatLimiter,
  validate(conversationIdSchema, 'params'),
  chatController.unblockConversation
);
router.post(
  '/conversations/:id/call-consent',
  chatLimiter,
  validate(conversationIdSchema, 'params'),
  validate(callConsentSchema),
  chatController.updateCallConsent
);
router.post(
  '/conversations/:id/hide',
  chatLimiter,
  validate(conversationIdSchema, 'params'),
  chatController.hideConversation
);
router.get('/unread-count', chatLimiter, chatController.getUnreadCount);
router.post(
  '/messages/:messageId/report',
  chatLimiter,
  sanitizeMiddleware,
  validate(reportMessageParamsSchema, 'params'),
  validate(reportMessageBodySchema),
  chatController.reportMessage
);

export default router;
