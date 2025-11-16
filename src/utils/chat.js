function normalizeIdValue(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value?._id) return value._id.toString();
  if (typeof value.toString === 'function') return value.toString();
  return null;
}

function extractConsentEntry(store, userId) {
  if (!store || !userId) return null;
  const key = userId.toString();
  if (typeof store.get === 'function') {
    return store.get(key) || store.get(userId) || null;
  }
  if (typeof store === 'object') {
    return store[key] || store[userId] || null;
  }
  return null;
}

function formatConsentEntry(entry) {
  if (!entry) {
    return { allowed: false, updatedAt: null, updatedBy: null };
  }
  return {
    allowed: Boolean(entry.allowed),
    updatedAt: entry.updatedAt || null,
    updatedBy: normalizeIdValue(entry.updatedBy)
  };
}

function isAdStatusUnavailable(status) {
  if (!status) return false;
  const normalized = typeof status === 'string' ? status.toLowerCase() : status;
  return normalized && normalized !== 'active';
}

export function formatConversationForUser(conversation, userId) {
  if (!conversation) return null;
  const obj = conversation.toObject ? conversation.toObject() : conversation;
  const unread = conversation.getUnreadCount ? conversation.getUnreadCount(userId) : 0;
  const adDoc = obj.adId && obj.adId._id ? obj.adId : obj.ad && obj.ad._id ? obj.ad : null;
  const adIdValue =
    adDoc?._id?.toString?.() ?? (typeof obj.adId === 'string' ? obj.adId : obj.adId?.toString?.());
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
    const status = adDoc.status || null;
    const isDeleted = isAdStatusUnavailable(status);
    ad = {
      id: adDoc._id?.toString?.() ?? null,
      title: adDoc.title || '',
      price: adDoc.price ?? null,
      locationText: adDoc.locationText || '',
      ownerName: adDoc.owner?.name || '',
      status,
      isDeleted,
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

  // Build otherParticipant object (the user opposite of current userId)
  let otherParticipant = null;
  if (Array.isArray(obj.participants)) {
    const rawOther = obj.participants.find((p) => {
      const pid = p && (p._id?.toString?.() ?? p.toString?.() ?? p.id);
      return pid && pid.toString() !== userId.toString();
    });
    if (rawOther) {
      const pid = rawOther._id?.toString?.() ?? rawOther.id?.toString?.() ?? rawOther.toString?.();
      otherParticipant = {
        id: pid,
        name: rawOther.name || null,
        avatar: rawOther.avatarUrl || rawOther.avatar || null
      };
    }
  }

  const otherParticipantId = otherParticipant?.id || null;
  const meConsentEntry = conversation.getVoiceCallConsent
    ? conversation.getVoiceCallConsent(userId)
    : extractConsentEntry(obj.voiceCallConsent, userId);
  const otherConsentEntry =
    otherParticipantId && conversation.getVoiceCallConsent
      ? conversation.getVoiceCallConsent(otherParticipantId)
      : extractConsentEntry(obj.voiceCallConsent, otherParticipantId);
  const meConsent = formatConsentEntry(meConsentEntry);
  const otherConsent = formatConsentEntry(otherConsentEntry);
  const voiceCallConsent = {
    me: meConsent,
    other: otherConsent,
    ready: Boolean(meConsent.allowed && otherConsent.allowed)
  };

  const rawLastMessage = obj.lastMessage || null;
  const lastMessage = rawLastMessage
    ? {
        ...rawLastMessage,
        type: rawLastMessage.type || 'text',
        audioDuration:
          typeof rawLastMessage.audioDuration === 'number' ? rawLastMessage.audioDuration : null,
        audio:
          (rawLastMessage.type || 'text') === 'audio'
            ? rawLastMessage.audio
              ? {
                  ...rawLastMessage.audio,
                  duration:
                    typeof rawLastMessage.audio.duration === 'number'
                      ? rawLastMessage.audio.duration
                      : (rawLastMessage.audioDuration ?? null)
                }
              : { duration: rawLastMessage.audioDuration ?? null }
            : null
      }
    : null;

  return {
    id: obj._id?.toString?.() ?? obj.id,
    adId: adIdValue,
    ad,
    participants: obj.participants,
    otherParticipant,
    ownerId: obj.ownerId,
    buyerId: obj.buyerId,
    lastMessage,
    lastMessageAt: obj.lastMessageAt,
    unreadCount: unread,
    isBlocked: obj.isBlocked,
    blockedBy: obj.blockedBy || null,
    hidden:
      Array.isArray(obj.hiddenFor) &&
      obj.hiddenFor.some((id) => id.toString() === userId.toString()),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    voiceCallConsent
  };
}
