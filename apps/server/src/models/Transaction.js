import mongoose from 'mongoose';
import { PAYMENT_MODES } from '../config/constants.js';

const transactionSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    // All monetary values stored as integer paise
    amount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: PAYMENT_MODES, required: true },
    // Where this transaction came from: 'paytm' (native) or an integration
    // provider id like 'khatabook', 'zoho-books', ...
    source: { type: String, default: 'paytm', index: true },
    timestamp: { type: Date, required: true, index: true },
    attributedSKUs: [
      {
        _id: false,
        skuId: { type: mongoose.Schema.Types.ObjectId, ref: 'SKU' },
        quantity: { type: Number, default: 1, min: 1 },
        confidence: { type: Number, min: 0, max: 1 },
      },
    ],
    rawPayload: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

transactionSchema.index({ merchantId: 1, timestamp: -1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
