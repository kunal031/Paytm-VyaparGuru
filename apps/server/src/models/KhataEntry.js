import mongoose from 'mongoose';

/** One line in a customer's khata: udhaar given (bill on credit) or payment received. */
const khataEntrySchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    type: { type: String, enum: ['udhaar', 'payment'], required: true },
    amount: { type: Number, required: true, min: 0 }, // paise
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

khataEntrySchema.index({ merchantId: 1, customerId: 1, createdAt: -1 });

export const KhataEntry = mongoose.model('KhataEntry', khataEntrySchema);
