import mongoose, { Schema } from 'mongoose';

const AudioMetadataSchema = new Schema(
  {
    key: { type: String, required: true },
    url: { type: String, default: null },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    duration: { type: Number, default: null },
    waveform: {
      type: [Number],
      default: undefined
    }
  },
  { _id: false }
);

const CallSummarySchema = new Schema(
  {
    callId: { type: Schema.Types.ObjectId, ref: 'Call' },
    type: { type: String, enum: ['audio', 'video'], default: 'audio' },
    status: {
      type: String,
      enum: ['completed', 'cancelled', 'rejected', 'missed', 'failed']
    },
    reason: { type: String, default: null },
    duration: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    initiator: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['text', 'audio', 'call'],
      default: 'text',
      index: true
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ''
    },
    clientTempId: {
      type: String,
      default: null,
      index: true
    },
    attachments: {
      type: [
        {
          key: { type: String, required: true },
          url: { type: String, default: null },
          thumbnailUrl: { type: String, default: null },
          mime: { type: String, required: true },
          size: { type: Number, required: true },
          width: { type: Number, default: null },
          height: { type: Number, default: null }
        }
      ],
      default: []
    },
    audio: {
      type: AudioMetadataSchema,
      default: null
    },
    call: { type: CallSummarySchema, default: null },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
      index: true
    },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    isReported: { type: Boolean, default: false },
    reportReason: { type: String, default: null },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ recipient: 1, status: 1 });
MessageSchema.index({ text: 'text' });

MessageSchema.methods.markAsDelivered = function () {
  if (this.status === 'sent') {
    this.status = 'delivered';
    this.deliveredAt = new Date();
  }
};
MessageSchema.methods.markAsRead = function () {
  if (this.status !== 'read') {
    this.status = 'read';
    this.readAt = new Date();
  }
};

export default mongoose.model('Message', MessageSchema);
