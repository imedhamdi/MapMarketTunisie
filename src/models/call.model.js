import mongoose from 'mongoose';

const callSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['audio', 'video'],
      default: 'audio',
      required: true
    },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'answered', 'ended', 'missed', 'rejected', 'failed'],
      default: 'initiated',
      required: true,
      index: true
    },
    startedAt: {
      type: Date,
      default: null
    },
    endedAt: {
      type: Date,
      default: null
    },
    duration: {
      type: Number, // durée en secondes
      default: 0
    },
    endReason: {
      type: String,
      enum: ['completed', 'cancelled', 'rejected', 'timeout', 'error', 'network'],
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index composé pour les requêtes fréquentes
callSchema.index({ conversation: 1, createdAt: -1 });
callSchema.index({ initiator: 1, createdAt: -1 });
callSchema.index({ participants: 1, createdAt: -1 });

// Calcul automatique de la durée si non définie
callSchema.pre('save', function (next) {
  if (this.startedAt && this.endedAt && !this.duration) {
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  next();
});

const Call = mongoose.model('Call', callSchema);

export default Call;
