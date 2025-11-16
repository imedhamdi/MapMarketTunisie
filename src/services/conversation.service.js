import Conversation from '../models/conversation.model.js';
import Ad from '../models/ad.model.js';
import { createError } from '../utils/asyncHandler.js';
import { formatConversationForUser } from '../utils/chat.js';
import messageService from './message.service.js';

const AD_SUMMARY_FIELDS =
  'title price locationText owner thumbnails previews images photos pictures media cover coverUrl previewUrl status';

function normalizeId(id) {
  return typeof id === 'object' && id !== null ? id.toString() : id;
}

async function startConversation(adId, userId, initialText) {
  const ad = await Ad.findById(adId);
  if (!ad) throw createError.notFound('Annonce introuvable.');
  if (normalizeId(ad.owner) === normalizeId(userId)) {
    throw createError.forbidden(
      "Le propriétaire de l'annonce ne peut pas démarrer une conversation avec lui-même."
    );
  }
  let conversation = await Conversation.findOne({ adId, buyerId: userId, ownerId: ad.owner });
  let created = false;
  const sanitizedText = typeof initialText === 'string' ? initialText.trim().slice(0, 2000) : '';
  const hasInitialMessage = sanitizedText.length > 0;
  if (!conversation) {
    conversation = await Conversation.create({
      adId,
      participants: [ad.owner, userId],
      ownerId: ad.owner,
      buyerId: userId,
      lastMessage: hasInitialMessage
        ? { text: sanitizedText, sender: userId, timestamp: new Date(), type: 'text' }
        : { text: '', sender: null, timestamp: new Date(), type: 'text' },
      lastMessageAt: new Date()
    });
    created = true;
  }
  if (hasInitialMessage) {
    await messageService.createMessage(conversation._id, userId, sanitizedText);
  }
  // Rafraîchir la conversation pour renvoyer les dernières informations (dernier message, unread…)
  conversation = await Conversation.findById(conversation._id)
    .populate({
      path: 'adId',
      select: AD_SUMMARY_FIELDS,
      populate: { path: 'owner', select: 'name' }
    })
    .populate({ path: 'participants', select: 'name avatar avatarUrl' });
  return { conversation: formatConversationForUser(conversation, userId), created };
}

async function getUserConversations(userId, { limit = 20, skip = 0 } = {}) {
  const query = {
    participants: userId,
    hiddenFor: { $ne: userId }
  };
  const conversations = await Conversation.find(query)
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'adId',
      select: AD_SUMMARY_FIELDS,
      populate: { path: 'owner', select: 'name' }
    })
    .populate({ path: 'participants', select: 'name avatar avatarUrl' });
  return conversations.map((c) => formatConversationForUser(c, userId));
}

async function getConversationById(id, userId) {
  const convo = await Conversation.findById(id)
    .populate({
      path: 'adId',
      select: AD_SUMMARY_FIELDS,
      populate: { path: 'owner', select: 'name' }
    })
    .populate({ path: 'participants', select: 'name avatar avatarUrl' });
  if (!convo) throw createError.notFound('Conversation introuvable');
  if (!convo.isParticipant(userId)) throw createError.forbidden('Accès à la conversation refusé');
  return convo;
}

async function blockConversation(id, userId) {
  const convo = await getConversationById(id, userId);
  convo.isBlocked = true;
  convo.blockedBy = userId;
  await convo.save();
  return convo;
}

async function unblockConversation(id, userId) {
  const convo = await getConversationById(id, userId);
  if (convo.blockedBy && convo.blockedBy.toString() !== userId.toString()) {
    throw createError.forbidden('Seul l’utilisateur ayant bloqué peut débloquer');
  }
  convo.isBlocked = false;
  convo.blockedBy = null;
  await convo.save();
  return convo;
}

async function hideConversation(id, userId) {
  const convo = await getConversationById(id, userId);
  convo.hideForUser(userId);
  await convo.save();
}

async function getTotalUnreadCount(userId) {
  const conversations = await Conversation.find({
    participants: userId,
    hiddenFor: { $ne: userId }
  }).select('unreadCount hiddenFor');
  return conversations.reduce((acc, convo) => {
    const unread = convo.getUnreadCount ? convo.getUnreadCount(userId) : 0;
    return unread > 0 ? acc + 1 : acc;
  }, 0);
}

async function updateVoiceCallConsent(id, userId, allowCalls) {
  const convo = await getConversationById(id, userId);
  convo.setVoiceCallConsent(userId, Boolean(allowCalls), userId);
  await convo.save();
  return convo;
}

export default {
  startConversation,
  getUserConversations,
  getConversationById,
  blockConversation,
  unblockConversation,
  hideConversation,
  getTotalUnreadCount,
  updateVoiceCallConsent
};
