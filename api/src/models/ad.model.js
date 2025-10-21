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
          return Array.isArray(value) && value.length === 2 && value.every((num) => typeof num === 'number' && Number.isFinite(num));
        },
        message: 'Les coordonnées doivent être un tableau [longitude, latitude] numérique.'
      }
    }
  },
  { _id: false }
);

const AdSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 80 },
    description: { type: String, required: true, trim: true, minlength: 30, maxlength: 2000 },
    category: { type: String, enum: ['immobilier', 'auto', 'electroniques', 'pieces', 'mode', 'loisirs'], required: true, index: true },
    condition: { type: String, enum: ['new', 'very_good', 'good', 'fair'], required: true },
    price: { type: Number, required: true, min: 0.1, max: 9999999 },
    locationText: { type: String, required: true, trim: true },
    location: { type: CoordinatesSchema, required: true },
    attributes: { type: Schema.Types.Mixed, default: {} },
    attributesNormalized: { type: Schema.Types.Mixed, default: {} },
    images: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'active', index: true },
    views: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

AdSchema.index({ 'location': '2dsphere' });

export default mongoose.model('Ad', AdSchema);
