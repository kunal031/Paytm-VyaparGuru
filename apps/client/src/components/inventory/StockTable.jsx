import StockBadge from './StockBadge.jsx';
import { formatPaise } from '../../utils/format.js';

export default function StockTable({ skus }) {
  if (!skus.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No SKUs match this filter.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-4">SKU</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Price</th>
            <th className="py-2 pr-4">Stock</th>
            <th className="py-2 pr-4">Sold (30d)</th>
            <th className="py-2 pr-4">Velocity/day</th>
            <th className="py-2">Stockout in</th>
          </tr>
        </thead>
        <tbody>
          {skus.map((sku) => (
            <tr key={sku._id} className="border-b border-slate-100 last:border-0">
              <td className="py-2.5 pr-4">
                <p className="font-medium text-slate-800">{sku.name}</p>
                <p className="text-xs text-slate-400">{sku.category}</p>
              </td>
              <td className="py-2.5 pr-4">
                <StockBadge classification={sku.classification} />
              </td>
              <td className="py-2.5 pr-4">{formatPaise(sku.price)}</td>
              <td className="py-2.5 pr-4">
                {sku.currentStock} {sku.unit}
              </td>
              <td className="py-2.5 pr-4">{sku.soldLast30}</td>
              <td className="py-2.5 pr-4 tabular-nums">{sku.velocityPerDay}</td>
              <td className="py-2.5">
                {sku.daysUntilStockout !== null ? (
                  <span
                    className={
                      sku.daysUntilStockout <= 7 ? 'font-semibold text-red-600' : 'text-slate-600'
                    }
                  >
                    {sku.daysUntilStockout}d
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
