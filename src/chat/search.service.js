import mongoose from 'mongoose';
import Message from '../models/message.model.js';
import { createError } from '../utils/asyncHandler.js';

export async function searchUserMessages(
  userId,
  { query, conversationId = null, limit = 20, cursor = null }
) {
  if (!query) throw createError.badRequest('Query manquante');
  const regex = new RegExp(query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
  const convoFilter = conversationId ? { conversationId } : {};
  const baseFilter = {
    ...convoFilter,
    $or: [{ sender: userId }, { recipient: userId }],
    text: regex
  };
  if (cursor) {
    let cursorId;
    try {
      cursorId = new mongoose.Types.ObjectId(cursor);
    } catch (_err) {
      throw createError.badRequest('Cursor invalide.');
    }
    baseFilter._id = { $lt: cursorId };
  }
  const messages = await Message.find(baseFilter)
    .sort({ _id: -1 })
    .limit(limit + 1);
  const hasMore = messages.length > limit;
  const slice = hasMore ? messages.slice(0, limit) : messages;
  return {
    query,
    messages: slice.map((m) => ({
      id: m._id.toString(),
      conversationId: m.conversationId.toString(),
      text: m.text,
      sender: m.sender,
      recipient: m.recipient,
      createdAt: m.createdAt,
      status: m.status
    })),
    nextCursor: hasMore ? slice[slice.length - 1]._id.toString() : null,
    hasMore
  };
}
