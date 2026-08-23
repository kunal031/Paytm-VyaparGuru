import { hasLlm, complete } from '@vyaparguru/agent/llm';
import { SKU } from '../models/SKU.js';
import { Customer } from '../models/Customer.js';
import { recordKhataPayment } from './billing.service.js';
import { logger } from '../utils/logger.js';

/**
 * Action layer for the voice assistant: turns imperative utterances
 * ("20 packet Parle-G aaye 30 rupaye wale", "Ramu ne 50 rupaye diye",
 * "naya customer Sunita add karo", "2 Maggi ka bill banao cash") into real
 * operations. Questions fall through to the Q&A copilot untouched.
 *
 * Safe operations (stock arrivals, new customers, khata payments — factual
 * records) execute immediately; money-creating operations (bills) come back
 * as a PROPOSAL the merchant confirms with one tap.
 */

// Cheap gate: only consult the LLM when the utterance smells imperative
const ACTION_HINT =
  /\b(add|create|new|record|receive[d]?|paid|gave|came|arrived|make|bill|banao|bana do|karo|kar do|likho|daal(o)?|jod(o)?|aaya|aaye|diya|diye|de diya|le lo)\b|जोड़|डाल|बनाओ|लिखो|दिया|दिये|आए|आया|कर दो|ऐड/i;

const EXTRACT_PROMPT = `You detect whether an Indian merchant's utterance is a COMMAND for their shop-management app, and extract its parameters. The utterance may be Hindi, English, Hinglish or another Indian language, possibly with speech-recognition errors (fix obvious ones: "parlay g" = Parle-G).

Actions:
- add_stock: new stock arrived / add products to inventory. Extract items: [{name, quantity, priceINR (selling price, null if unsaid), unit (packet/bottle/kg/pcs...)}]
- add_customer: add a new customer. Extract customerName, phone (null if unsaid).
- khata_payment: a customer paid back money on their khata/udhaar. Extract customerName, amountINR.
- create_bill: make a bill/invoice for a sale. Extract items: [{name, quantity}], paymentMode (Cash|QR|Card|Udhaar, default Cash), customerName (null if unsaid).
- none: it is a QUESTION or anything that is not clearly one of the commands above. When in doubt, choose none.

Respond with ONLY a JSON object: {"action": "...", ...params}. No prose, no fences.`;

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const toPaise = (inr) => (inr == null ? null : Math.round(Number(inr) * 100));

async function fuzzySku(merchantId, name) {
  const all = await SKU.find({ merchantId }).select('name price currentStock unit').lean();
  const q = name.toLowerCase();
  return (
    all.find((s) => s.name.toLowerCase() === q) ||
    all.find((s) => s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase().split(' ')[0].toLowerCase()))
  );
}

async function handleAddStock(merchantId, items) {
  const results = [];
  for (const item of items ?? []) {
    if (!item?.name) continue;
    const qty = Math.max(0, Math.round(item.quantity ?? 0));
    const price = toPaise(item.priceINR);
    const existing = await fuzzySku(merchantId, item.name);
    if (existing) {
      const update = { $inc: { currentStock: qty } };
      if (price != null) update.$set = { price };
      await SKU.updateOne({ _id: existing._id }, update);
      results.push(`${existing.name}: +${qty} (now ${existing.currentStock + qty} ${existing.unit})`);
    } else {
      await SKU.create({
        merchantId,
        name: String(item.name).slice(0, 120),
        category: 'Other',
        price: price ?? 0,
        costPrice: price != null ? Math.round(price * 0.8) : 0,
        currentStock: qty,
        unit: String(item.unit || 'pcs').slice(0, 20),
        createdVia: 'voice',
      });
      results.push(`${item.name}: new product, ${qty} ${item.unit || 'pcs'}${price != null ? ` @ ₹${item.priceINR}` : ''}`);
    }
  }
  if (!results.length) return null;
  return {
    executed: true,
    action: 'add_stock',
    answer: `✅ Stock updated:\n${results.map((r) => `• ${r}`).join('\n')}\n\nYou can fine-tune details in the Inventory tab.`,
  };
}

async function handleAddCustomer(merchantId, { customerName, phone }) {
  if (!customerName) return null;
  const existing = await Customer.findOne({ merchantId, name: new RegExp(`^${customerName.trim()}$`, 'i') });
  if (existing) {
    return { executed: true, action: 'add_customer', answer: `${existing.name} is already on your customer list.` };
  }
  await Customer.create({ merchantId, name: customerName.trim(), phone: phone || null });
  return {
    executed: true,
    action: 'add_customer',
    answer: `✅ Customer added: ${customerName.trim()}${phone ? ` (${phone})` : ''}. Tag them on bills and I'll track their patterns.`,
  };
}

async function handleKhataPayment(merchantId, { customerName, amountINR }) {
  const paise = toPaise(amountINR);
  if (!customerName || !paise || paise <= 0) return null;
  const customer = await Customer.findOne({ merchantId, name: new RegExp(customerName.trim(), 'i') });
  if (!customer) {
    return {
      executed: false,
      action: 'khata_payment',
      answer: `I couldn't find a customer named "${customerName}" on your khata. Check the name in the Customers tab.`,
    };
  }
  const updated = await recordKhataPayment(merchantId, customer._id, { amount: paise });
  return {
    executed: true,
    action: 'khata_payment',
    answer: `✅ Recorded ₹${Number(amountINR).toLocaleString('en-IN')} from ${customer.name}. Remaining udhaar: ₹${Math.max(0, Math.round(updated.udhaarBalance / 100)).toLocaleString('en-IN')}.`,
  };
}

async function proposeBill(merchantId, { items, paymentMode, customerName }) {
  const resolved = [];
  const missing = [];
  for (const item of items ?? []) {
    const sku = await fuzzySku(merchantId, item.name || '');
    const qty = Math.max(1, Math.round(item.quantity ?? 1));
    if (sku) resolved.push({ skuId: sku._id, name: sku.name, quantity: qty, price: sku.price });
    else missing.push(item.name);
  }
  if (!resolved.length) return null;
  const total = resolved.reduce((a, i) => a + i.price * i.quantity, 0);
  const mode = ['Cash', 'QR', 'Card', 'Udhaar'].includes(paymentMode) ? paymentMode : 'Cash';
  return {
    executed: false,
    action: 'create_bill',
    answer:
      `🧾 Ready to bill (${mode}${customerName ? `, ${customerName}` : ''}):\n` +
      resolved.map((i) => `• ${i.name} ×${i.quantity} — ₹${((i.price * i.quantity) / 100).toLocaleString('en-IN')}`).join('\n') +
      `\nTotal: ₹${(total / 100).toLocaleString('en-IN')}` +
      (missing.length ? `\n(Not found, skipped: ${missing.join(', ')})` : '') +
      `\n\nTap Confirm to create the bill.`,
    proposal: {
      kind: 'create_bill',
      payload: {
        items: resolved.map((i) => ({ skuId: String(i.skuId), quantity: i.quantity })),
        paymentMode: mode,
        customerName: customerName || undefined,
      },
    },
  };
}

/** Returns null when the utterance is not a command (falls through to Q&A). */
export async function tryHandleCommand(merchantId, text) {
  if (!text || !ACTION_HINT.test(text) || !hasLlm()) return null;

  let parsed;
  try {
    parsed = extractJson(await complete({ system: EXTRACT_PROMPT, user: text, maxTokens: 600 }));
  } catch {
    return null;
  }
  if (!parsed || parsed.action === 'none') return null;
  logger.info({ action: parsed.action }, 'Assistant command detected');

  try {
    switch (parsed.action) {
      case 'add_stock':
        return await handleAddStock(merchantId, parsed.items);
      case 'add_customer':
        return await handleAddCustomer(merchantId, parsed);
      case 'khata_payment':
        return await handleKhataPayment(merchantId, parsed);
      case 'create_bill':
        return await proposeBill(merchantId, parsed);
      default:
        return null;
    }
  } catch (err) {
    return { executed: false, action: parsed.action, answer: `⚠️ Couldn't complete that: ${err.message}` };
  }
}
