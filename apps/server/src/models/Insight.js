import mongoose from 'mongoose';
import { INSIGHT_TYPES } from '../config/constants.js';

const insightSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    type: { type: String, enum: INSIGHT_TYPES, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    generatedAt: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

insightSchema.index({ merchantId: 1, generatedAt: -1 });

export const Insight = mongoose.model('Insight', insightSchema);
