import mongoose from 'mongoose';
import { SKU_CREATED_VIA } from '../config/constants.js';

const skuSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    // Integer paise
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    currentStock: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: 'pcs', trim: true },
    createdVia: { type: String, enum: SKU_CREATED_VIA, default: 'manual' },
  },
  { timestamps: true }
);

skuSchema.index({ merchantId: 1, name: 1 }, { unique: true });

export const SKU = mongoose.model('SKU', skuSchema);
