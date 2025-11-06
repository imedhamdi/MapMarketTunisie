export function formatConversationForUser(conversation, userId) {
  if (!conversation) return null;
  const obj = conversation.toObject ? conversation.toObject() : conversation;
  const unread = conversation.getUnreadCount ? conversation.getUnreadCount(userId) : 0;
  return {
    id: obj._id?.toString?.() ?? obj.id,
    adId: obj.adId,
    participants: obj.participants,
    ownerId: obj.ownerId,
    buyerId: obj.buyerId,
    lastMessage: obj.lastMessage,
    lastMessageAt: obj.lastMessageAt,
    unreadCount: unread,
    isBlocked: obj.isBlocked,
    blockedBy: obj.blockedBy || null,
    hidden:
      Array.isArray(obj.hiddenFor) &&
      obj.hiddenFor.some((id) => id.toString() === userId.toString()),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
}
