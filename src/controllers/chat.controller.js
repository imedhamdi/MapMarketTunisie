import { asyncHandler, createError } from '../utils/asyncHandler.js';
import conversationService from '../services/conversation.service.js';
import messageService from '../services/message.service.js';
import { sendSuccess } from '../utils/responses.js';
import logger from '../config/logger.js';
import { formatConversationForUser } from '../utils/chat.js';

// (Pièces jointes & recherche: implémentations minimales ci-dessous)
import {
  storeAttachment,
  deleteAttachment as removeAttachment
} from '../chat/attachments.service.js';
import { searchUserMessages } from '../chat/search.service.js';

export const startConversation = asyncHandler(async (req, res) => {
  const { adId, text } = req.body;
  const userId = req.user._id;
  const result = await conversationService.startConversation(adId, userId, text);
  return sendSuccess(res, {
    statusCode: result.created ? 201 : 200,
    message: result.created ? 'Conversation créée' : 'Conversation existante',
    data: { conversation: result.conversation, created: result.created }
  });
});

export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { limit, skip } = req.query;
  const result = await conversationService.getUserConversations(userId, {
    limit: parseInt(limit, 10) || 20,
    skip: parseInt(skip, 10) || 0
  });
  return sendSuccess(res, { message: 'Conversations récupérées', data: result });
});

export const getConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const conversation = await conversationService.getConversationById(id, userId);
  const formattedConversation = formatConversationForUser(conversation, userId);
  return sendSuccess(res, {
    message: 'Conversation récupérée',
    data: { conversation: formattedConversation }
  });
});

export const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { limit, before } = req.query;
  const result = await messageService.getMessages(id, userId, {
    limit: parseInt(limit, 10) || 50,
    before
  });
  return sendSuccess(res, { message: 'Messages récupérés', data: result });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { text, attachments = [], clientTempId = null } = req.body;
  const message = await messageService.createMessage(id, userId, text, {
    attachments,
    clientTempId
  });
  return sendSuccess(res, { statusCode: 201, message: 'Message envoyé', data: { message } });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { count, messageIds, readAt } = await messageService.markMessagesAsRead(id, userId);
  logger.info('Messages marqués comme lus', { conversationId: id, userId, count });
  return sendSuccess(res, {
    message: `${count} message(s) marqué(s) comme lu(s)`,
    data: { count, messageIds, readAt }
  });
});

export const blockConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const conversation = await conversationService.blockConversation(id, userId);
  const formattedConversation = formatConversationForUser(conversation, userId);
  return sendSuccess(res, {
    message: 'Conversation bloquée',
    data: { conversation: formattedConversation }
  });
});

export const unblockConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const conversation = await conversationService.unblockConversation(id, userId);
  const formattedConversation = formatConversationForUser(conversation, userId);
  return sendSuccess(res, {
    message: 'Conversation débloquée',
    data: { conversation: formattedConversation }
  });
});

export const hideConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  await conversationService.hideConversation(id, userId);
  return sendSuccess(res, { message: 'Conversation masquée', data: { hidden: true } });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const count = await conversationService.getTotalUnreadCount(userId);
  return sendSuccess(res, { message: 'Nombre de non-lus récupéré', data: { count } });
});

export const reportMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;
  const { reason } = req.body;
  const message = await messageService.reportMessage(messageId, userId, reason);
  logger.warn('Message signalé', { messageId, userId, reason });
  return sendSuccess(res, { message: 'Message signalé', data: { message } });
});

export const uploadAttachment = asyncHandler(async (req, res) => {
  const file = req.file;
  const userId = req.user._id;
  if (!file) throw createError.badRequest('Aucun fichier fourni.');
  const attachment = await storeAttachment({
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalName: file.originalname,
    size: file.size,
    userId: userId.toString()
  });
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Pièce jointe téléchargée',
    data: { attachment }
  });
});

export const deleteAttachment = asyncHandler(async (req, res) => {
  const key = decodeURIComponent(req.params.key || '').trim();
  const userId = req.user._id;
  if (!key) throw createError.badRequest('Clé de pièce jointe manquante.');
  await removeAttachment(key, userId);
  return sendSuccess(res, { message: 'Pièce jointe supprimée', data: { removed: true } });
});

export const searchMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { q, conversationId, limit, cursor } = req.query;
  const result = await searchUserMessages(userId, {
    query: q,
    conversationId: conversationId || null,
    limit: limit ? Number(limit) : undefined,
    cursor: cursor || null
  });
  return sendSuccess(res, { message: 'Résultats de recherche', data: result });
});
