import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import logger from '../config/logger.js';
import redis from '../config/redis.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import { createError } from '../utils/asyncHandler.js';
import User from '../models/user.model.js';
import Joi from 'joi';
import callService from '../services/call.service.js';

// --- Presence simple ---
const onlineUsers = new Map(); // userId -> { sockets: Set<socketId>, lastSeenAt }
function goOnline(userId, socketId) {
  const entry = onlineUsers.get(userId) || { sockets: new Set(), lastSeenAt: null };
  entry.sockets.add(socketId);
  onlineUsers.set(userId, entry);
  return { state: 'online', lastSeenAt: null, changed: true };
}
function goOffline(userId, socketId) {
  const entry = onlineUsers.get(userId);
  if (!entry) return { state: 'offline', lastSeenAt: new Date(), changed: true };
  entry.sockets.delete(socketId);
  if (entry.sockets.size === 0) {
    onlineUsers.delete(userId);
    return { state: 'offline', lastSeenAt: new Date(), changed: true };
  }
  return { state: 'online', lastSeenAt: null, changed: false };
}

// --- Rate limiter basique ---
class SocketRateLimiter {
  constructor({ capacity, refillIntervalMs }) {
    this.capacity = capacity;
    this.refillIntervalMs = refillIntervalMs;
    this.tokens = new Map(); // userId -> { count, resetAt }
  }
  consume(userId) {
    const now = Date.now();
    const entry = this.tokens.get(userId) || { count: 0, resetAt: now + this.refillIntervalMs };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + this.refillIntervalMs;
    }
    if (entry.count >= this.capacity) {
      return { allowed: false, retryAfterMs: entry.resetAt - now };
    }
    entry.count += 1;
    this.tokens.set(userId, entry);
    return { allowed: true };
  }
}

const messageRateLimiter = new SocketRateLimiter({
  capacity: env.chat.rateLimit.messagesPerMinute,
  refillIntervalMs: 60_000
});
const typingRateLimiter = new SocketRateLimiter({
  capacity: env.chat.rateLimit.typingPerTenSeconds,
  refillIntervalMs: 10_000
});

// --- Validation ---
const conversationJoinSchema = Joi.object({
  conversationId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required(),
  markAsRead: Joi.boolean().optional()
});
const messageAttachmentSchema = Joi.object({
  key: Joi.string().required(),
  url: Joi.string().uri({ allowRelative: true }).allow(null),
  thumbnailUrl: Joi.string().uri({ allowRelative: true }).allow(null),
  mime: Joi.string().required(),
  size: Joi.number().min(0).required(),
  width: Joi.number().allow(null),
  height: Joi.number().allow(null)
});
const messageAudioSchema = Joi.object({
  key: Joi.string().required(),
  url: Joi.string().uri({ allowRelative: true }).required(),
  mime: Joi.string().required(),
  size: Joi.number().min(1).required(),
  duration: Joi.number().min(0).max(600).optional().allow(null),
  waveform: Joi.array().items(Joi.number().min(0).max(1)).max(120).optional()
});
const messageSendSchema = Joi.object({
  conversationId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required(),
  text: Joi.string().allow('').trim().max(2000).optional(),
  attachments: Joi.array().items(messageAttachmentSchema).max(5).optional(),
  clientTempId: Joi.string().allow(null).optional(),
  type: Joi.string().valid('text', 'audio').default('text'),
  audio: messageAudioSchema.when('type', {
    is: 'audio',
    then: Joi.required(),
    otherwise: Joi.forbidden().allow(null)
  })
}).custom((value, helpers) => {
  const hasAudio = value.type === 'audio' && value.audio;
  const hasText = typeof value.text === 'string' && value.text.trim().length > 0;
  const hasAttachments = Array.isArray(value.attachments) && value.attachments.length > 0;
  if (!hasText && !hasAttachments && !hasAudio) {
    return helpers.error('any.invalid');
  }
  return value;
});
const messageReceivedSchema = Joi.object({
  conversationId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required(),
  messageId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
});
const markReadSchema = Joi.object({
  conversationId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required(),
  messageIds: Joi.array()
    .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required()
});
const typingSchema = Joi.object({
  conversationId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
});

function emitValidationError(socket, error) {
  const details = error?.details?.map((d) => d.message) ?? [];
  socket.emit('error', {
    code: 'VALIDATION_ERROR',
    message: 'Payload invalide',
    details: details.length ? details : undefined
  });
}
function emitRateLimitError(socket, retryAfterMs) {
  socket.emit('error', {
    code: 'RATE_LIMITED',
    message: 'Trop de requêtes. Veuillez patienter.',
    retryAfter: Math.ceil(retryAfterMs / 1000)
  });
}

async function emitPresenceUpdate(io, userId, state) {
  // Diffuser seulement à partenaires (simplifié: tous les utilisateurs connectés)
  io.emit('presence:update', {
    userId,
    state: state.state,
    lastSeenAt: state.lastSeenAt ? state.lastSeenAt.toISOString() : null
  });
}

export async function initChatSocket(httpServer) {
  if (!env.socketIoEnabled) {
    logger.info('Socket.IO désactivé');
    return null;
  }
  const io = new Server(httpServer, {
    path: env.socketIoPath,
    cors: { origin: env.socketIoCorsOrigins, credentials: true },
    transports: ['websocket', 'polling']
  });

  if (env.redisEnabled && redis.client) {
    try {
      // Optionnel: adapter redis (simplifié, pas d'initialisation si indisponible)
    } catch (e) {
      logger.warn('Redis adapter Socket.IO indisponible', { error: e.message });
    }
  }

  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token && socket.handshake.headers?.authorization) {
        token = socket.handshake.headers.authorization.replace('Bearer ', '');
      }

      // Si pas de token dans auth/query/header, essayer de lire depuis les cookies
      if (!token && socket.handshake.headers?.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});
        // Cookie défini côté HTTP comme 'access_token'
        token = cookies.access_token || cookies.accessToken || token;
      }

      if (!token) return next(new Error('Token manquant'));
      const decoded = jwt.verify(token, env.jwtAccessSecret);
      const user = await User.findById(decoded.sub);
      if (!user) return next(new Error('Utilisateur introuvable'));
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (e) {
      logger.error('Erreur auth Socket.IO', { error: e.message });
      next(new Error('Authentification échouée'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info('Client connecté chat', { socketId: socket.id, userId });
    socket.join(`user:${userId}`);
    const presenceState = goOnline(userId, socket.id);
    emitPresenceUpdate(io, userId, presenceState);

    socket.on('conversation:join', async (raw = {}) => {
      const { value, error } = conversationJoinSchema.validate(raw, { abortEarly: false });
      if (error) return emitValidationError(socket, error);
      const { conversationId, markAsRead } = value;
      try {
        const convo = await Conversation.findById(conversationId);
        if (!convo) throw createError.notFound('Conversation introuvable');
        if (!convo.isParticipant(userId)) throw createError.forbidden('Non participant');
        socket.join(`conversation:${conversationId}`);
        if (markAsRead) {
          const unread = await Message.find({
            conversationId,
            recipient: userId,
            status: { $ne: 'read' }
          });
          for (const m of unread) {
            m.markAsRead();
            await m.save();
          }
          convo.resetUnread(userId);
          convo.updateLastReadAt(userId);
          await convo.save();
          io.to(`conversation:${conversationId}`).emit('message:read', {
            conversationId,
            messageIds: unread.map((m) => m._id.toString()),
            readerId: userId,
            readAt: new Date().toISOString()
          });
        }
      } catch (e) {
        socket.emit('error', { code: e.code || 'JOIN_FAILED', message: e.message });
      }
    });

    socket.on('message:send', async (raw = {}) => {
      const rate = messageRateLimiter.consume(userId);
      if (!rate.allowed) return emitRateLimitError(socket, rate.retryAfterMs);
      const { value, error } = messageSendSchema.validate(raw, { abortEarly: false });
      if (error) return emitValidationError(socket, error);
      const {
        conversationId,
        text,
        attachments = [],
        clientTempId = null,
        type = 'text',
        audio = null
      } = value;
      try {
        const convo = await Conversation.findById(conversationId);
        if (!convo) throw createError.notFound('Conversation introuvable');
        if (!convo.isParticipant(userId)) throw createError.forbidden('Non participant');
        if (
          convo.isBlocked &&
          convo.blockedBy &&
          convo.blockedBy.toString() !== userId.toString()
        ) {
          throw createError.forbidden('Conversation bloquée');
        }
        if (type === 'audio' && !audio) {
          throw createError.badRequest('Métadonnées audio manquantes');
        }
        const recipient = convo.participants.find((p) => p.toString() !== userId.toString());
        const message = await Message.create({
          conversationId,
          sender: userId,
          recipient,
          text: text || '',
          attachments,
          clientTempId,
          type,
          audio: type === 'audio' ? audio : null
        });
        convo.lastMessage = {
          text: text || '',
          sender: userId,
          timestamp: new Date(),
          type,
          audioDuration: type === 'audio' ? (audio?.duration ?? null) : null
        };
        convo.lastMessageAt = new Date();
        convo.incrementUnread(recipient);
        await convo.save();
        io.to(`conversation:${conversationId}`).emit('message:new', { conversationId, message });
      } catch (e) {
        socket.emit('error', { code: e.code || 'SEND_FAILED', message: e.message });
      }
    });

    socket.on('message:received', async (raw = {}) => {
      const { value, error } = messageReceivedSchema.validate(raw, { abortEarly: false });
      if (error) return emitValidationError(socket, error);
      const { conversationId, messageId } = value;
      try {
        const msg = await Message.findById(messageId);
        if (!msg || msg.conversationId.toString() !== conversationId) {
          throw createError.notFound('Message introuvable');
        }
        if (msg.recipient.toString() !== userId.toString()) return; // Seul destinataire ack
        msg.markAsDelivered();
        await msg.save();
        io.to(`conversation:${conversationId}`).emit('message:delivered', {
          conversationId,
          messageId,
          deliveredAt: msg.deliveredAt
        });
      } catch (e) {
        socket.emit('error', { code: e.code || 'DELIVER_FAILED', message: e.message });
      }
    });

    socket.on('messages:markRead', async (raw = {}) => {
      const { value, error } = markReadSchema.validate(raw, { abortEarly: false });
      if (error) return emitValidationError(socket, error);
      const { conversationId, messageIds } = value;
      try {
        const convo = await Conversation.findById(conversationId);
        if (!convo) throw createError.notFound('Conversation introuvable');
        if (!convo.isParticipant(userId)) throw createError.forbidden('Non participant');
        const now = new Date();
        const messages = await Message.find({ _id: { $in: messageIds }, recipient: userId });
        const readIds = [];
        for (const m of messages) {
          m.markAsRead();
          await m.save();
          readIds.push(m._id.toString());
        }
        convo.resetUnread(userId);
        convo.updateLastReadAt(userId, now);
        await convo.save();
        io.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId,
          messageIds: readIds,
          readerId: userId,
          readAt: now
        });
      } catch (e) {
        socket.emit('error', { code: e.code || 'READ_FAILED', message: e.message });
      }
    });

    socket.on('typing:start', (raw = {}) => {
      const rate = typingRateLimiter.consume(userId);
      if (!rate.allowed) return emitRateLimitError(socket, rate.retryAfterMs);
      const { value, error } = typingSchema.validate(raw, { abortEarly: false });
      if (error) return emitValidationError(socket, error);
      io.to(`conversation:${value.conversationId}`).emit('typing:start', {
        conversationId: value.conversationId,
        userId
      });
    });
    socket.on('typing:stop', (raw = {}) => {
      const { value, error } = typingSchema.validate(raw, { abortEarly: false });
      if (error) return emitValidationError(socket, error);
      io.to(`conversation:${value.conversationId}`).emit('typing:stop', {
        conversationId: value.conversationId,
        userId
      });
    });

    // ==================== APPELS VOCAUX / WEBRTC ====================

    /**
     * Initier un appel vocal
     */
    socket.on('call:initiate', async (raw = {}) => {
      try {
        const { conversationId, type = 'audio' } = raw;

        // Vérifier que la conversation existe et que l'utilisateur y participe
        const convo = await Conversation.findById(conversationId);
        if (!convo) {
          return socket.emit('error', {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation introuvable'
          });
        }
        if (!convo.isParticipant(userId)) {
          return socket.emit('error', { code: 'NOT_PARTICIPANT', message: 'Non autorisé' });
        }

        // Créer l'enregistrement de l'appel
        const call = await callService.createCall({
          conversationId,
          initiatorId: userId,
          type
        });

        // Notifier l'autre participant directement via sa room user
        const otherParticipantId = convo.participants
          .find((p) => p.toString() !== userId.toString())
          .toString();

        // Envoyer la notification d'appel entrant à l'utilisateur spécifique
        io.to(`user:${otherParticipantId}`).emit('call:incoming', {
          callId: call._id.toString(),
          conversationId,
          initiatorId: userId,
          type,
          timestamp: call.createdAt
        });

        logger.info('Appel initié', {
          callId: call._id,
          conversationId,
          initiatorId: userId,
          recipientId: otherParticipantId
        });
      } catch (error) {
        logger.error('call:initiate error:', error);
        socket.emit('error', { code: 'CALL_INITIATE_FAILED', message: error.message });
      }
    });

    /**
     * Envoyer une offre WebRTC
     */
    socket.on('call:offer', async (raw = {}) => {
      try {
        const { callId, conversationId, offer } = raw;

        if (!callId || !conversationId || !offer) {
          return socket.emit('error', { code: 'INVALID_OFFER', message: 'Données invalides' });
        }

        // Mettre à jour le statut de l'appel
        await callService.updateCallStatus(callId, 'ringing');

        // Transmettre l'offre à l'autre participant
        socket.to(`conversation:${conversationId}`).emit('call:offer', {
          callId,
          conversationId,
          offer,
          initiatorId: userId
        });

        logger.info('Offre WebRTC envoyée', { callId, conversationId });
      } catch (error) {
        logger.error('call:offer error:', error);
        socket.emit('error', { code: 'OFFER_FAILED', message: error.message });
      }
    });

    /**
     * Envoyer une réponse WebRTC
     */
    socket.on('call:answer', async (raw = {}) => {
      try {
        const { callId, conversationId, answer } = raw;

        if (!callId || !conversationId || !answer) {
          return socket.emit('error', { code: 'INVALID_ANSWER', message: 'Données invalides' });
        }

        // Mettre à jour le statut de l'appel comme répondu
        await callService.updateCallStatus(callId, 'answered', { startedAt: new Date() });

        // Transmettre la réponse à l'initiateur
        socket.to(`conversation:${conversationId}`).emit('call:answer', {
          callId,
          conversationId,
          answer,
          responderId: userId
        });

        logger.info('Réponse WebRTC envoyée', { callId, conversationId });
      } catch (error) {
        logger.error('call:answer error:', error);
        socket.emit('error', { code: 'ANSWER_FAILED', message: error.message });
      }
    });

    /**
     * Échanger des candidats ICE pour la connexion peer-to-peer
     */
    socket.on('call:ice-candidate', (raw = {}) => {
      try {
        const { callId, conversationId, candidate } = raw;

        if (!conversationId || !candidate) {
          return socket.emit('error', { code: 'INVALID_ICE', message: 'Données invalides' });
        }

        // Transmettre le candidat ICE à l'autre participant
        socket.to(`conversation:${conversationId}`).emit('call:ice-candidate', {
          callId,
          conversationId,
          candidate,
          senderId: userId
        });
      } catch (error) {
        logger.error('call:ice-candidate error:', error);
        socket.emit('error', { code: 'ICE_FAILED', message: error.message });
      }
    });

    /**
     * Terminer un appel
     */
    socket.on('call:end', async (raw = {}) => {
      try {
        const { callId, conversationId, reason = 'completed' } = raw;

        if (!callId) {
          return socket.emit('error', { code: 'INVALID_CALL_ID', message: "ID d'appel invalide" });
        }

        // Terminer l'appel dans la base de données
        await callService.endCall(callId, reason);

        // Notifier tous les participants
        io.to(`conversation:${conversationId}`).emit('call:ended', {
          callId,
          conversationId,
          endedBy: userId,
          reason
        });

        logger.info('Appel terminé', { callId, conversationId, reason });
      } catch (error) {
        logger.error('call:end error:', error);
        socket.emit('error', { code: 'END_FAILED', message: error.message });
      }
    });

    /**
     * Rejeter un appel entrant
     */
    socket.on('call:reject', async (raw = {}) => {
      try {
        const { callId, conversationId } = raw;

        if (!callId) {
          return socket.emit('error', { code: 'INVALID_CALL_ID', message: "ID d'appel invalide" });
        }

        // Marquer l'appel comme rejeté
        await callService.rejectCall(callId);

        // Notifier l'initiateur
        io.to(`conversation:${conversationId}`).emit('call:rejected', {
          callId,
          conversationId,
          rejectedBy: userId
        });

        logger.info('Appel rejeté', { callId, conversationId });
      } catch (error) {
        logger.error('call:reject error:', error);
        socket.emit('error', { code: 'REJECT_FAILED', message: error.message });
      }
    });

    /**
     * Annuler un appel avant qu'il ne soit répondu
     */
    socket.on('call:cancel', async (raw = {}) => {
      try {
        const { callId, conversationId } = raw;

        if (!callId) {
          return socket.emit('error', { code: 'INVALID_CALL_ID', message: "ID d'appel invalide" });
        }

        // Terminer l'appel avec raison "cancelled"
        await callService.endCall(callId, 'cancelled');

        // Notifier l'autre participant
        io.to(`conversation:${conversationId}`).emit('call:cancelled', {
          callId,
          conversationId,
          cancelledBy: userId
        });

        logger.info('Appel annulé', { callId, conversationId });
      } catch (error) {
        logger.error('call:cancel error:', error);
        socket.emit('error', { code: 'CANCEL_FAILED', message: error.message });
      }
    });

    // ==================== FIN APPELS VOCAUX ====================

    socket.on('disconnect', () => {
      const presenceState = goOffline(userId, socket.id);
      if (presenceState.changed) emitPresenceUpdate(io, userId, presenceState);
      logger.info('Client déconnecté chat', { socketId: socket.id, userId });
    });
  });

  return io;
}
