import mongoose from 'mongoose';
import { BUSINESS_TYPES } from '../config/constants.js';

const merchantSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    businessType: { type: String, enum: BUSINESS_TYPES, required: true },
    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

merchantSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

export const Merchant = mongoose.model('Merchant', merchantSchema);
