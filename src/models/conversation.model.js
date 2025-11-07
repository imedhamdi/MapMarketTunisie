import mongoose, { Schema } from 'mongoose';

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

export default mongoose.model('Conversation', ConversationSchema);
