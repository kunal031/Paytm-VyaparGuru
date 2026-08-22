import { formatDate } from '../../utils/format.js';

/** Stockout alert cards: SKUs running out within a week, with reorder advice. */
export default function AlertCards({ skus }) {
  const alerts = skus
    .filter((s) => s.daysUntilStockout !== null && s.daysUntilStockout <= 7)
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
    .slice(0, 6);

  if (!alerts.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {alerts.map((sku) => (
        <div
          key={sku._id}
          className="rounded-xl border border-red-200 bg-red-50 p-4"
          role="alert"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-slate-800">{sku.name}</p>
            <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
              {sku.daysUntilStockout}d left
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {sku.currentStock} {sku.unit} left · selling {sku.velocityPerDay}/day
            {sku.stockoutDate && <> · out by {formatDate(sku.stockoutDate)}</>}
          </p>
          {sku.festivalAhead && (
            <p className="mt-1 text-xs font-medium text-amber-700">
              🎉 {sku.festivalAhead} demand ahead
            </p>
          )}
          <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-brand-navy">
            Reorder ~{sku.suggestedReorderQty} {sku.unit}
          </p>
        </div>
      ))}
    </div>
  );
}
