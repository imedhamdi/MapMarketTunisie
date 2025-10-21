import mongoose, { Schema } from 'mongoose';

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
        validator(value) {
          if (!value || value.length === 0) return false;
          return value.length === 2 && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));
        },
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
    consent: { type: Boolean, default: false }
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
    avatar: { type: String },
    avatarUrl: { type: String },
    favorites: [{ type: Schema.Types.Mixed }],
    reviews: { type: Array, default: [] },
    location: {
      type: LocationSchema,
      default: () => ({ radiusKm: 10, consent: false })
    },
    memberSince: { type: Date, default: Date.now },
    resetTokenHash: { type: String, select: false },
    resetTokenExp: { type: Date, select: false }
  },
  { timestamps: true }
);

UserSchema.index({ 'location.coords': '2dsphere' });

function normalizeLocationValue(value) {
  if (!value || typeof value !== 'object') return null;

  const plain =
    typeof value.toObject === 'function'
      ? value.toObject({ depopulate: true })
      : { ...value };

  const coords = plain.coords;
  const coordinatesArray = Array.isArray(coords)
    ? coords
    : Array.isArray(coords?.coordinates)
    ? coords.coordinates
    : null;

  if (!coordinatesArray || coordinatesArray.length !== 2) {
    delete plain.coords;
    return plain;
  }

  const normalized = coordinatesArray.map((entry) => Number(entry));
  if (normalized.some((num) => Number.isNaN(num) || !Number.isFinite(num))) {
    delete plain.coords;
    return plain;
  }

  return {
    ...plain,
    coords: {
      type: 'Point',
      coordinates: normalized
    }
  };
}

UserSchema.pre('save', function normalizeLocationOnSave(next) {
  const current = this.get('location');
  if (!current) return next();
  const normalized = normalizeLocationValue(current);
  this.set('location', normalized || undefined);
  next();
});

UserSchema.pre(['findOneAndUpdate', 'updateOne', 'update'], function normalizeLocationOnUpdate(next) {
  const update = this.getUpdate();
  if (!update) return next();
  if (update.location) {
    update.location = normalizeLocationValue(update.location);
  }
  if (update.$set?.location) {
    update.$set.location = normalizeLocationValue(update.$set.location);
  }
  next();
});

export default mongoose.model('User', UserSchema);
