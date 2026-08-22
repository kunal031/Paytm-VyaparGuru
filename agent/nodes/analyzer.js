/**
 * Node: pure-code analysis over retrieved data — week-over-week comparisons,
 * dip detection, and correlation with stockouts and the festival calendar.
 * No LLM here: every number the synthesizer sees is computed, not generated.
 */

const pct = (curr, prev) => (prev > 0 ? Number((((curr - prev) / prev) * 100).toFixed(1)) : null);

export async function analyze(state) {
  const r = state.retrieved || {};
  const analysis = {};

  // Week-over-week
  if (r.thisWeek && r.lastWeek) {
    analysis.weekOverWeek = {
      thisWeek: { revenue: r.thisWeek.totals.revenue, transactions: r.thisWeek.totals.transactions },
      lastWeek: { revenue: r.lastWeek.totals.revenue, transactions: r.lastWeek.totals.transactions },
      revenueChangePct: pct(r.thisWeek.totals.revenue, r.lastWeek.totals.revenue),
      transactionChangePct: pct(r.thisWeek.totals.transactions, r.lastWeek.totals.transactions),
    };
  }

  // Dip detection over the last 30 days + correlation with stockouts/festivals
  if (r.last30?.daily?.length) {
    const daily = r.last30.daily;
    const mean = daily.reduce((a, d) => a + d.revenue, 0) / daily.length;
    const dipDays = daily.filter((d) => d.revenue < mean * 0.5).map((d) => d.date);
    analysis.dailyMeanRevenue = Math.round(mean);
    analysis.dipDays = dipDays;

    if (r.stockouts?.gaps?.length) {
      const overlaps = [];
      for (const gap of r.stockouts.gaps) {
        const hit = dipDays.some((d) => d >= gap.from && d <= gap.to);
        if (hit) overlaps.push({ sku: gap.skuName, from: gap.from, to: gap.to });
      }
      analysis.dipStockoutOverlaps = overlaps;
    }
  }

  // Stockout summary: estimated lost revenue = gap days × SKU's daily revenue rate
  if (r.stockouts?.gaps?.length) {
    analysis.stockoutSummary = r.stockouts.gaps.map((g) => ({
      sku: g.skuName,
      from: g.from,
      to: g.to,
      days: g.days,
      estimatedLostRevenue: g.estimatedLostRevenue,
    }));
    analysis.totalEstimatedLostRevenue = r.stockouts.gaps.reduce(
      (a, g) => a + (g.estimatedLostRevenue || 0),
      0
    );
  }

  // Forecast highlights
  if (r.forecast?.points?.length) {
    const total = r.forecast.points.reduce((a, p) => a + p.yhat, 0);
    analysis.forecast = {
      horizonDays: r.forecast.points.length,
      projectedNet: total,
      upcomingFestivals: r.forecast.upcomingFestivals,
      model: r.forecast.model,
    };
  }

  // Inventory highlights
  if (r.inventory?.summary) {
    analysis.inventory = {
      dead: r.inventory.summary.dead,
      deadStockValue: r.inventory.summary.deadStockValue,
      stockoutAlerts: r.inventory.summary.stockoutAlerts,
      urgent: (r.inventory.skus || [])
        .filter((s) => s.daysUntilStockout !== null && s.daysUntilStockout <= 7)
        .map((s) => ({ name: s.name, daysUntilStockout: s.daysUntilStockout, reorderQty: s.suggestedReorderQty })),
    };
  }

  return { analysis };
}
