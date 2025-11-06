import mongoose, { Schema } from 'mongoose';
import { validateCoordinates } from '../utils/geoHelpers.js';

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
        validator: validateCoordinates,
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
    category: {
      type: String,
      enum: ['immobilier', 'auto', 'electroniques', 'pieces', 'mode', 'loisirs'],
      required: true,
      index: true
    },
    condition: { type: String, enum: ['new', 'very_good', 'good', 'fair'], required: true },
    price: { type: Number, required: true, min: 0.1, max: 9999999 },
    locationText: { type: String, required: true, trim: true },
    location: { type: CoordinatesSchema, required: true },
    attributes: { type: Schema.Types.Mixed, default: {} },
    attributesNormalized: { type: Schema.Types.Mixed, default: {} },
    images: { type: [String], default: [] },
    previews: { type: [String], default: [] },
    thumbnails: { type: [String], default: [] },
    webpImages: { type: [String], default: [] },
    webpPreviews: { type: [String], default: [] },
    webpThumbnails: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived', 'deleted'],
      default: 'active',
      index: true
    },
    views: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

AdSchema.index({ location: '2dsphere' });
AdSchema.index({ status: 1, createdAt: -1 });
AdSchema.index({ owner: 1, status: 1 });

export default mongoose.model('Ad', AdSchema);
