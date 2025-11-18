import mongoose, { Schema } from 'mongoose';

const NewsletterContactSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    }
  },
  {
    timestamps: {
      createdAt: 'addedAt',
      updatedAt: false
    }
  }
);

export default mongoose.model('NewsletterContact', NewsletterContactSchema);
