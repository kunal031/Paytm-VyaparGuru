import mongoose from 'mongoose';
import { EXPENSE_SOURCES } from '../config/constants.js';

const expenseSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    category: { type: String, required: true, trim: true },
    // Integer paise
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, index: true },
    source: { type: String, enum: EXPENSE_SOURCES, default: 'manual' },
    // Set when source === 'imported': the integration provider id
    provider: { type: String, default: null },
    isRecurring: { type: Boolean, default: false },
  },
  { timestamps: true }
);

expenseSchema.index({ merchantId: 1, date: -1 });

export const Expense = mongoose.model('Expense', expenseSchema);
