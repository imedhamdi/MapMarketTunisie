import mongoose, { Schema } from 'mongoose';
import { normalizeLocationValue, validateNonEmptyCoordinates } from '../utils/geoHelpers.js';

const CoordinatesSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: validateNonEmptyCoordinates,
        message: 'Les coordonnées doivent être un tableau [longitude, latitude] numérique.'
      }
    }
  },
  { _id: false }
);

const LocationSchema = new Schema(
  {
    city: { type: String, trim: true },
    coords: {
      type: CoordinatesSchema,
      default: undefined
    },
    radiusKm: { type: Number, default: 10 },
    consent: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: null }
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: true },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationTokenExp: { type: Date, select: false },
    avatar: { type: String },
    avatarUrl: { type: String },
    favorites: [{ type: Schema.Types.Mixed }],
    reviews: { type: Array, default: [] },
    location: {
      type: LocationSchema,
      default: () => ({ radiusKm: 10, consent: false })
    },
    recentlyViewed: [
      {
        adId: { type: Schema.Types.ObjectId, ref: 'Ad' },
        viewedAt: { type: Date, default: Date.now }
      }
    ],
    memberSince: { type: Date, default: Date.now },
    resetTokenHash: { type: String, select: false },
    resetTokenExp: { type: Date, select: false }
  },
  { timestamps: true }
);

UserSchema.index({ 'location.coords': '2dsphere' });

UserSchema.pre('save', function normalizeLocationOnSave(next) {
  const current = this.get('location');
  if (!current) {
    return next();
  }
  const normalized = normalizeLocationValue(current);
  this.set('location', normalized || undefined);
  return next();
});

UserSchema.pre(
  ['findOneAndUpdate', 'updateOne', 'update'],
  function normalizeLocationOnUpdate(next) {
    const update = this.getUpdate();
    if (!update) {
      return next();
    }
    if (update.location) {
      update.location = normalizeLocationValue(update.location);
    }
    if (update.$set?.location) {
      update.$set.location = normalizeLocationValue(update.$set.location);
    }
    return next();
  }
);

export default mongoose.model('User', UserSchema);
