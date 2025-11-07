export function formatConversationForUser(conversation, userId) {
  if (!conversation) return null;
  const obj = conversation.toObject ? conversation.toObject() : conversation;
  const unread = conversation.getUnreadCount ? conversation.getUnreadCount(userId) : 0;
  const adDoc = obj.adId && obj.adId._id ? obj.adId : obj.ad && obj.ad._id ? obj.ad : null;
  let ad = null;
  if (adDoc) {
    const thumbnails = Array.isArray(adDoc.thumbnails) ? adDoc.thumbnails : [];
    const photos = Array.isArray(adDoc.photos) ? adDoc.photos : [];
    const images = Array.isArray(adDoc.images) ? adDoc.images : [];
    const previews = Array.isArray(adDoc.previews) ? adDoc.previews : [];
    const pictures = Array.isArray(adDoc.pictures) ? adDoc.pictures : [];
    const media = Array.isArray(adDoc.media) ? adDoc.media : [];
    const candidateCover =
      adDoc.cover ||
      adDoc.coverUrl ||
      adDoc.preview ||
      adDoc.previewUrl ||
      thumbnails[0] ||
      photos[0] ||
      images[0] ||
      previews[0] ||
      pictures[0] ||
      media[0] ||
      null;
    let cover = null;
    if (typeof candidateCover === 'string' && candidateCover.trim()) {
      cover = candidateCover.trim();
    } else if (candidateCover && typeof candidateCover === 'object' && candidateCover.url) {
      cover = candidateCover.url;
    }
    ad = {
      id: adDoc._id?.toString?.() ?? null,
      title: adDoc.title || '',
      price: adDoc.price ?? null,
      thumbnail: cover,
      cover,
      thumbnails,
      photos,
      images,
      previews,
      pictures,
      media
    };
  }
  const adIdValue =
    adDoc?._id?.toString?.() ?? (typeof obj.adId === 'string' ? obj.adId : obj.adId?.toString?.());

  return {
    id: obj._id?.toString?.() ?? obj.id,
    adId: adIdValue,
    ad,
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
