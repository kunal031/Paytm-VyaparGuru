import mongoose from 'mongoose';

/** Per-merchant sequences (e.g. invoice numbers). */
const counterSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  name: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.index({ merchantId: 1, name: 1 }, { unique: true });

counterSchema.statics.next = async function next(merchantId, name) {
  const doc = await this.findOneAndUpdate(
    { merchantId, name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
};

export const Counter = mongoose.model('Counter', counterSchema);
