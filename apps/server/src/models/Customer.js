import mongoose from 'mongoose';

/** A khata customer: someone the merchant extends credit (udhaar) to. */
const customerSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: null, trim: true },
    // Outstanding udhaar in paise (positive = customer owes the merchant)
    udhaarBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

customerSchema.index({ merchantId: 1, name: 1 });

export const Customer = mongoose.model('Customer', customerSchema);
