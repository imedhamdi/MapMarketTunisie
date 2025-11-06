import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';
import { createError } from '../utils/asyncHandler.js';

function otherParticipant(conversation, userId) {
  return conversation.participants.find((p) => p.toString() !== userId.toString());
}

async function createMessage(
  conversationId,
  userId,
  text,
  { attachments = [], clientTempId = null } = {}
) {
  const convo = await Conversation.findById(conversationId);
  if (!convo) throw createError.notFound('Conversation introuvable');
  if (!convo.isParticipant(userId)) throw createError.forbidden('Non participant');
  if (convo.isBlocked && convo.blockedBy && convo.blockedBy.toString() !== userId.toString()) {
    throw createError.forbidden('Conversation bloquée');
  }
  const recipient = otherParticipant(convo, userId);
  const message = await Message.create({
    conversationId,
    sender: userId,
    recipient,
    text,
    attachments,
    clientTempId
  });
  // update conversation last message + unread count for recipient
  convo.lastMessage = { text, sender: userId, timestamp: new Date() };
  convo.lastMessageAt = new Date();
  convo.incrementUnread(recipient);
  await convo.save();
  return message;
}

async function getMessages(conversationId, userId, { limit = 50, before } = {}) {
  const convo = await Conversation.findById(conversationId);
  if (!convo) throw createError.notFound('Conversation introuvable');
  if (!convo.isParticipant(userId)) throw createError.forbidden('Non participant');
  const query = { conversationId };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }
  const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit);
  return {
    messages: messages.reverse(),
    hasMore: messages.length === limit
  };
}

async function markMessagesAsRead(conversationId, userId) {
  const convo = await Conversation.findById(conversationId);
  if (!convo) throw createError.notFound('Conversation introuvable');
  if (!convo.isParticipant(userId)) throw createError.forbidden('Non participant');
  const toMark = await Message.find({ conversationId, recipient: userId, status: { $ne: 'read' } });
  const messageIds = [];
  const now = new Date();
  for (const m of toMark) {
    m.markAsRead();
    await m.save();
    messageIds.push(m._id.toString());
  }
  convo.resetUnread(userId);
  convo.updateLastReadAt(userId, now);
  await convo.save();
  return { count: messageIds.length, messageIds, readAt: now };
}

async function reportMessage(messageId, userId, reason) {
  const message = await Message.findById(messageId);
  if (!message) throw createError.notFound('Message introuvable');
  if (message.sender.toString() === userId.toString()) {
    throw createError.forbidden('Impossible de signaler votre propre message');
  }
  message.isReported = true;
  message.reportReason = reason;
  message.reportedBy = userId;
  await message.save();
  return message;
}

export default {
  createMessage,
  getMessages,
  markMessagesAsRead,
  reportMessage
};
