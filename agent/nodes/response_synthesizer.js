import { hasLlm, complete } from './llm.js';
import { SYNTHESIS_SYSTEM_PROMPT } from '../prompts/prompts.js';

const inr = (paise) => {
  const r = paise / 100;
  if (Math.abs(r) >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  return `₹${new Intl.NumberFormat('en-IN').format(Math.round(r))}`;
};

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

/** Node: turn retrieved data + analysis into a merchant-friendly answer. */
export async function synthesizeResponse(state) {
  if (hasLlm()) {
    try {
      const answer = await complete({
        system: SYNTHESIS_SYSTEM_PROMPT,
        user: JSON.stringify({
          question: state.questionEnglish || state.question,
          intent: state.intent,
          retrieved: state.retrieved,
          analysis: state.analysis,
        }),
        maxTokens: 700,
      });
      return { answer, answerSource: 'claude' };
    } catch {
      // fall through to template
    }
  }
  return { answer: templateAnswer(state), answerSource: 'template' };
}
