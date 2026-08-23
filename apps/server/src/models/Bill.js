import mongoose from 'mongoose';
import { BILL_PAYMENT_MODES } from '../config/constants.js';

const billSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    billNo: { type: String, required: true },
    items: [
      {
        _id: false,
        skuId: { type: mongoose.Schema.Types.ObjectId, ref: 'SKU', default: null },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 }, // paise
        total: { type: Number, required: true, min: 0 }, // paise
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: BILL_PAYMENT_MODES, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, default: null },
    status: { type: String, enum: ['paid', 'udhaar', 'refunded', 'partial_refund'], required: true },
    returns: [
      {
        _id: false,
        amount: { type: Number, required: true, min: 0 },
        reason: { type: String, default: '' },
        at: { type: Date, default: Date.now },
      },
    ],
    // Who billed it (owner or a staff account)
    billedBy: { type: String, default: null },
  },
  { timestamps: true }
);

billSchema.index({ merchantId: 1, createdAt: -1 });
billSchema.index({ merchantId: 1, billNo: 1 }, { unique: true });

export const Bill = mongoose.model('Bill', billSchema);
