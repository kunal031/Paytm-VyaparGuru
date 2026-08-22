import mongoose from 'mongoose';
import { PROVIDER_IDS } from '../config/integrations.catalog.js';

const integrationSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    provider: { type: String, enum: PROVIDER_IDS, required: true },
    status: { type: String, enum: ['connected', 'disconnected'], default: 'connected' },
    connectedAt: { type: Date, default: Date.now },
    lastImportAt: { type: Date, default: null },
    // Lifetime import counters for this provider
    imported: {
      transactions: { type: Number, default: 0 },
      expenses: { type: Number, default: 0 },
      skus: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

integrationSchema.index({ merchantId: 1, provider: 1 }, { unique: true });

export const Integration = mongoose.model('Integration', integrationSchema);
