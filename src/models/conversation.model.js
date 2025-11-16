import mongoose, { Schema } from 'mongoose';

const VoiceCallConsentSchema = new Schema(
  {
    allowed: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { _id: false }
);

const LastMessageCallSchema = new Schema(
  {
    callId: { type: Schema.Types.ObjectId, ref: 'Call', default: null },
    status: {
      type: String,
      enum: ['completed', 'cancelled', 'rejected', 'missed', 'failed', null],
      default: null
    },
    duration: { type: Number, default: null },
    reason: { type: String, default: null },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    initiator: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: ['audio', 'video', null], default: null }
  },
  { _id: false }
);

/**
 * Modèle de conversation - Une conversation par annonce et par paire d'utilisateurs
 */
const ConversationSchema = new Schema(
  {
    adId: {
      type: Schema.Types.ObjectId,
      ref: 'Ad',
      required: true,
      index: true
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    lastMessage: {
      text: { type: String, default: '' },
      type: {
        type: String,
        enum: ['text', 'audio', 'call'],
        default: 'text'
      },
      audioDuration: { type: Number, default: null },
      call: { type: LastMessageCallSchema, default: null },
      sender: { type: Schema.Types.ObjectId, ref: 'User' },
      timestamp: { type: Date, default: Date.now }
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map()
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    blockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    hiddenFor: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    lastReadAt: {
      type: Map,
      of: Date,
      default: new Map()
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    voiceCallConsent: {
      type: Map,
      of: VoiceCallConsentSchema,
      default: () => new Map()
    }
  },
  { timestamps: true }
);

ConversationSchema.index({ adId: 1, buyerId: 1, ownerId: 1 }, { unique: true });
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

ConversationSchema.methods.incrementUnread = function (userId) {
  const currentCount = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), currentCount + 1);
};
ConversationSchema.methods.resetUnread = function (userId) {
  this.unreadCount.set(userId.toString(), 0);
};
ConversationSchema.methods.getUnreadCount = function (userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};
ConversationSchema.methods.updateLastReadAt = function (userId, date = new Date()) {
  this.lastReadAt.set(userId.toString(), date);
};
ConversationSchema.methods.getLastReadAt = function (userId) {
  return this.lastReadAt.get(userId.toString()) || null;
};
ConversationSchema.methods.isParticipant = function (userId) {
  const expected = userId?.toString();
  if (!expected) return false;
  return this.participants.some((p) => {
    const participantId = p && typeof p === 'object' && p._id ? p._id : p;
    return participantId?.toString() === expected;
  });
};
ConversationSchema.methods.isBlockedForUser = function (_userId) {
  if (!this.isBlocked) return false;
  return true; // simple: considéré bloqué pour tous sauf l'auteur du blocage
};
ConversationSchema.methods.hideForUser = function (userId) {
  const expected = userId?.toString();
  if (!expected) return;
  const alreadyHidden = this.hiddenFor.some((id) => id?.toString() === expected);
  if (!alreadyHidden) {
    this.hiddenFor.push(userId);
  }
};
ConversationSchema.methods.unhideForUser = function (userId) {
  this.hiddenFor = this.hiddenFor.filter((id) => id.toString() !== userId.toString());
};

ConversationSchema.methods.getVoiceCallConsent = function (userId) {
  if (!userId) return null;
  const key = userId.toString();
  const store = this.voiceCallConsent;
  if (!store) return null;
  if (typeof store.get === 'function') {
    return store.get(key) || store.get(userId) || null;
  }
  if (typeof store === 'object') {
    return store[key] || store[userId] || null;
  }
  return null;
};

ConversationSchema.methods.setVoiceCallConsent = function (userId, allowed, updatedBy) {
  if (!userId) return null;
  const key = userId.toString();
  if (!this.voiceCallConsent || typeof this.voiceCallConsent.set !== 'function') {
    this.voiceCallConsent = new Map();
  }
  const entry = {
    allowed: Boolean(allowed),
    updatedAt: new Date(),
    updatedBy: updatedBy || userId
  };
  this.voiceCallConsent.set(key, entry);
  if (typeof this.markModified === 'function') {
    this.markModified('voiceCallConsent');
  }
  return entry;
};

ConversationSchema.methods.hasVoiceCallConsent = function (userId) {
  const entry = this.getVoiceCallConsent(userId);
  return Boolean(entry?.allowed);
};

export default mongoose.model('Conversation', ConversationSchema);
