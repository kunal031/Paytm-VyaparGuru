import { Customer } from '../models/Customer.js';
import { Merchant } from '../models/Merchant.js';
import { hasLlm, complete } from '@vyaparguru/agent/llm';
import { getCustomerProfile } from './customerInsights.service.js';
import { ApiError } from '../utils/ApiError.js';

const LANGUAGE_NAMES = {
  en: 'Hinglish (Hindi written in Latin script, mixed with English)',
  hi: 'Hindi',
  bn: 'Bengali',
  te: 'Telugu',
  mr: 'Marathi',
  ta: 'Tamil',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  or: 'Odia',
};

const inr = (paise) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(paise / 100))}`;

function templates(type, facts) {
  if (type === 'udhaar') {
    return (
      `Namaste ${facts.name} ji 🙏 ${facts.shop} se message hai. ` +
      `Aapka ${facts.balance} ka hisaab baaki hai. Jab suvidha ho, de dijiyega. ` +
      `Koi jaldi nahi — bas yaad dila rahe hain. Dhanyavaad! 😊`
    );
  }
  return (
    `Namaste ${facts.name} ji 🙏 Bahut din ho gaye, aap ${facts.shop} nahi aaye! ` +
    (facts.favorite ? `Aapka pasandida ${facts.favorite} abhi stock mein hai. ` : '') +
    `Aaiye, milte hain 😊`
  );
}

/**
 * Builds a personalized WhatsApp reminder for a customer.
 * type 'udhaar'  → polite payment reminder with the exact balance.
 * type 'winback' → warm re-engagement for at-risk/churned customers,
 *                  mentioning their favourite item and how long they've been away.
 * The message is grounded ONLY in real profile facts; money is pre-formatted.
 */
export async function generateReminder(merchantId, customerId, { type, language = 'en' }) {
  const customer = await Customer.findOne({ _id: customerId, merchantId }).lean();
  if (!customer) throw ApiError.badRequest('Customer not found');
  const merchant = await Merchant.findById(merchantId).lean();
  const profile = await getCustomerProfile(merchantId, customerId);

  const facts = {
    name: customer.name,
    shop: merchant.businessName,
    balance: inr(Math.max(0, customer.udhaarBalance || 0)),
    favorite: profile.stats.favorites[0]?.name ?? null,
    daysAway: profile.stats.daysSinceLastVisit,
    cadence: profile.stats.cadence,
  };

  if (type === 'udhaar' && (customer.udhaarBalance || 0) <= 0) {
    throw ApiError.badRequest(`${customer.name} has no outstanding udhaar`);
  }

  let message = templates(type, facts);
  let source = 'template';

  if (hasLlm()) {
    try {
      const languageName = LANGUAGE_NAMES[language] ?? LANGUAGE_NAMES.en;
      message = await complete({
        system: `You write short WhatsApp messages a small Indian shopkeeper sends to customers. Write in ${languageName}.
Rules:
- Warm, respectful, personal — like a neighbourhood shopkeeper, never corporate or pushy.
- 2-3 short sentences max, one or two fitting emoji.
- Use ONLY the facts provided. Money amounts are pre-formatted — copy them exactly.
- ${type === 'udhaar'
    ? 'Purpose: politely remind them of their outstanding khata balance, no pressure, thank them.'
    : 'Purpose: they have not visited in a while — warmly invite them back; mention their favourite item if given.'}
- Respond with ONLY the message text, nothing else.`,
        user: JSON.stringify(facts),
        maxTokens: 300,
      });
      source = 'llm';
    } catch {
      // keep template
    }
  }

  const digits = (customer.phone || '').replace(/\D/g, '');
  return {
    message,
    source,
    phone: digits ? (digits.length === 10 ? `91${digits}` : digits) : null,
    customer: { name: customer.name, udhaarBalance: customer.udhaarBalance },
  };
}
