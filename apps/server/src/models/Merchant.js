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
    // Authorization: owners manage the business; staff accounts (created by an
    // owner) share the owner's business data with restricted permissions
    role: { type: String, enum: ['owner', 'staff'], default: 'owner' },
    staffOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', default: null },
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
