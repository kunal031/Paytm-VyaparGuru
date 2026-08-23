import { hasLlm, complete } from './llm.js';
import { SYNTHESIS_SYSTEM_PROMPT, APP_GUIDE } from '../prompts/prompts.js';

const inr = (paise) => {
  const r = paise / 100;
  if (Math.abs(r) >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  return `₹${new Intl.NumberFormat('en-IN').format(Math.round(r))}`;
};

// Paise-valued fields in retrieved/analysis payloads. Converted to formatted ₹
// strings BEFORE the LLM sees them — models must never do currency arithmetic.
const MONEY_KEYS = new Set([
  'revenue', 'amount', 'price', 'costPrice', 'estimatedLostRevenue',
  'totalEstimatedLostRevenue', 'deadStockValue', 'projectedNet', 'yhat',
  'yhatLower', 'yhatUpper', 'avgTicketRecent', 'avgTicketPrior', 'stockValue',
  'dailyMeanRevenue', 'net', 'expenses', 'cogs', 'profit',
  // customer & billing fields
  'totalSpend', 'avgTicket', 'udhaarBalance', 'totalOutstandingUdhaar',
  'grossSales', 'netCollected', 'udhaarGiven', 'khataReceived', 'refunds', 'subtotal',
]);

function formatMoneyDeep(value, key) {
  if (typeof value === 'number' && MONEY_KEYS.has(key)) return inr(value);
  if (Array.isArray(value)) return value.map((v) => formatMoneyDeep(v, null));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, formatMoneyDeep(v, k)])
    );
  }
  return value;
}

/** Template answers used when no ANTHROPIC_API_KEY is configured. */
function templateAnswer(state) {
  const a = state.analysis || {};
  const r = state.retrieved || {};

  switch (state.intent) {
    case 'sales_trend': {
      const w = a.weekOverWeek;
      if (!w) return "I couldn't retrieve your sales data right now — please try again.";
      const dir = w.revenueChangePct === null ? '' : w.revenueChangePct >= 0 ? `up ${w.revenueChangePct}%` : `down ${Math.abs(w.revenueChangePct)}%`;
      return (
        `This week you made ${inr(w.thisWeek.revenue)} from ${w.thisWeek.transactions} transactions — ` +
        `${dir} vs last week's ${inr(w.lastWeek.revenue)} (${w.lastWeek.transactions} transactions).` +
        (a.inventory?.urgent?.length ? ` Watch out: ${a.inventory.urgent[0].name} is close to stockout.` : '')
      );
    }
    case 'sales_drop_diagnosis': {
      const w = a.weekOverWeek;
      let msg = w
        ? `This week: ${inr(w.thisWeek.revenue)} vs last week: ${inr(w.lastWeek.revenue)} (${w.revenueChangePct ?? 0}% change).`
        : '';
      if (a.dipStockoutOverlaps?.length) {
        const o = a.dipStockoutOverlaps[0];
        msg += ` A big reason: ${o.sku} was out of stock from ${o.from} to ${o.to}, and your low-sales days line up with that gap.`;
      } else if (a.stockoutSummary?.length) {
        msg += ` You had ${a.stockoutSummary.length} stockout gap(s) recently costing roughly ${inr(a.totalEstimatedLostRevenue)} in missed sales.`;
      } else if (msg) {
        msg += ' No stockout gaps found in this window — the dip looks demand-driven, not supply-driven.';
      }
      return msg || "I couldn't retrieve enough data to diagnose the drop.";
    }
    case 'top_products': {
      const top = r.topSkus?.byRevenue?.slice(0, 3);
      if (!top?.length) return 'No attributed sales found yet to rank your products.';
      const lines = top.map((t, i) => `${i + 1}. ${t.name} — ${inr(t.revenue)} (${t.units} units)`);
      return `Your top products over the last 30 days:\n${lines.join('\n')}`;
    }
    case 'worst_products': {
      const worst = r.topSkus?.worstByUnits?.slice(0, 3);
      if (!worst?.length) return 'No sales data available yet to rank your products.';
      const lines = worst.map((t, i) =>
        `${i + 1}. ${t.name} — ${t.units === 0 ? 'zero sales' : `only ${t.units} units (${inr(t.revenue)})`} in 30 days`
      );
      const dead = a.inventory;
      const deadNote =
        dead?.dead > 0
          ? `\n\nYou have ${dead.dead} dead-stock item(s) tying up ${inr(dead.deadStockValue)} — consider a clearance offer or bundling them with fast movers.`
          : '';
      return `Your worst sellers over the last 30 days:\n${lines.join('\n')}${deadNote}`;
    }
    case 'new_products': {
      const added = a.newProducts;
      if (!added?.length) {
        return 'No new products have been added since your catalog was set up. Add stock via photo, voice, or manual entry on the Inventory page and they will show up here.';
      }
      const lines = added.slice(0, 5).map(
        (p) => `• ${p.name} (${p.category}) — ${inr(p.price)}, ${p.currentStock} ${p.unit}, added ${p.addedOn} via ${p.addedVia}`
      );
      return `Products you added recently:\n${lines.join('\n')}`;
    }
    case 'customers': {
      const ci = r.customers;
      if (!ci?.customers?.length) {
        return 'No customer data yet — tag customers on bills at the Billing counter and I will start tracking regulars, VIPs and churn risk automatically.';
      }
      const top = ci.customers.slice(0, 3);
      const seg = ci.summary.bySegment;
      const lines = top.map(
        (c, i) => `${i + 1}. ${c.name} — ${inr(c.totalSpend)} over ${c.visits} visits (${c.segment})`
      );
      const risk = (seg.at_risk || 0) + (seg.churned || 0);
      return (
        `Your top customers:\n${lines.join('\n')}\n\n` +
        `${ci.summary.total} customers · ${ci.summary.repeatRate}% come back for repeat purchases.` +
        (risk > 0 ? ` ⚠️ ${seg.at_risk || 0} at risk and ${seg.churned || 0} churned — check the Customers tab for the reasons.` : '')
      );
    }
    case 'app_help':
      return (
        'VyaparGuru turns your Paytm transactions into insights:\n' +
        '• Home — today/week revenue, forecast, urgent stock alerts\n' +
        '• Cash Flow — profit charts, hidden charges, 30-day forecast\n' +
        '• Inventory — fast/slow/dead stock, stockout predictions; add stock by photo, voice or typing\n' +
        '• Copilot — ask business questions in 11 Indian languages\n' +
        '• Integrations — import data from KhataBook, Zoho, Tally, Shopify & more\n' +
        '• Team — owners can add staff logins\n' +
        'Use the 🌐 button to change the app language, and this 🎙️ assistant from any screen.'
      );
    case 'stockout_history': {
      if (!a.stockoutSummary?.length) return 'Good news — no stockout gaps detected in the last 90 days.';
      const lines = a.stockoutSummary
        .slice(0, 4)
        .map((g) => `• ${g.sku}: ${g.from} → ${g.to} (${g.days} days, ~${inr(g.estimatedLostRevenue)} missed)`);
      return `Stockouts I found in your history:\n${lines.join('\n')}\nEstimated total missed sales: ${inr(a.totalEstimatedLostRevenue)}.`;
    }
    case 'discount_impact':
      return r.discounts?.available
        ? `Average ticket size recently: ${inr(r.discounts.avgTicketRecent)} vs earlier: ${inr(r.discounts.avgTicketPrior)}.`
        : "Your Paytm transactions don't carry discount tags yet, so I can't measure discount impact honestly. Start recording offer periods in the app and I'll track it.";
    case 'forecast': {
      const f = a.forecast;
      if (!f) return "I couldn't compute a forecast right now — please try again.";
      const fest = f.upcomingFestivals?.length
        ? ` Festivals ahead: ${[...new Set(f.upcomingFestivals.map((x) => x.name))].join(', ')} — stock up your fast movers early.`
        : '';
      return `Over the next ${f.horizonDays} days I project about ${inr(f.projectedNet)} net cash flow.${fest}`;
    }
    default: {
      const w = r.thisWeek?.totals;
      // Pure greeting (no data retrieved)
      if (!r.topSkus) {
        return `Namaste! I'm your Sales & Growth Copilot. Ask me things like "How were my sales this week?", "Why did sales drop?", or "What's not selling?"`;
      }
      // Unmatched question: be honest, but still give a grounded snapshot
      const top = r.topSkus?.byRevenue?.[0];
      const worst = r.topSkus?.worstByUnits?.[0];
      const parts = [];
      if (w) parts.push(`this week you've made ${inr(w.revenue)} from ${w.transactions} transactions`);
      if (top) parts.push(`your best seller is ${top.name} (${inr(top.revenue)} in 30 days)`);
      if (worst) parts.push(`your weakest is ${worst.name} (${worst.units === 0 ? 'zero sales' : `${worst.units} units`})`);
      const deadNote =
        a.inventory?.dead > 0 ? ` ${a.inventory.dead} item(s) are dead stock worth ${inr(a.inventory.deadStockValue)}.` : '';
      return (
        `I don't have a specific answer for that question yet — I can dig into sales trends, top/worst products, stockouts, discounts and forecasts. ` +
        `Meanwhile, a quick snapshot: ${parts.join('; ')}.${deadNote}`
      );
    }
  }
}

const LANGUAGE_NAMES = {
  en: 'English',
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

/**
 * Node: turn retrieved data + analysis into a merchant-friendly answer,
 * written directly in the merchant's language (one LLM call — no separate
 * translation round-trips).
 */
export async function synthesizeResponse(state) {
  if (hasLlm()) {
    try {
      const answer = await complete({
        system: SYNTHESIS_SYSTEM_PROMPT,
        user: JSON.stringify({
          question: state.question,
          intent: state.intent,
          responseLanguage: LANGUAGE_NAMES[state.language] || 'English',
          ...(state.intent === 'app_help' || state.intent === 'general'
            ? { appGuide: APP_GUIDE }
            : {}),
          retrieved: formatMoneyDeep(state.retrieved, null),
          analysis: formatMoneyDeep(state.analysis, null),
        }),
        maxTokens: 700,
      });
      return { answer, answerSource: 'llm' };
    } catch {
      // fall through to template
    }
  }
  let answer = templateAnswer(state);
  if (state.language && state.language !== 'en') {
    answer += `\n\n(${LANGUAGE_NAMES[state.language]} replies need an AI API key configured — answering in English for now.)`;
  }
  return { answer, answerSource: 'template' };
}
