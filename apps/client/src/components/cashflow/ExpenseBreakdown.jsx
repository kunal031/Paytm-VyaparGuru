import { CHART } from '../../utils/chartTheme.js';
import { formatPaise } from '../../utils/format.js';

/**
 * Ranked single-hue bar list (one measure across categories — direct labels,
 * so no legend/palette needed). Top 6 + Other.
 */
export default function ExpenseBreakdown({ categories }) {
  if (!categories.length) {
    return <p className="py-6 text-center text-sm text-slate-400">No expenses recorded yet.</p>;
  }

  const top = categories.slice(0, 6);
  const rest = categories.slice(6);
  const rows = [...top];
  if (rest.length) {
    rows.push({
      category: `Other (${rest.length})`,
      total: rest.reduce((a, c) => a + c.total, 0),
      isRecurring: false,
    });
  }
  const max = Math.max(...rows.map((r) => r.total));

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.category}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium text-slate-700">
              {row.category}
              {row.isRecurring && (
                <span className="ml-2 rounded bg-brand-sky px-1.5 py-0.5 text-[10px] font-semibold text-brand-navy">
                  RECURRING
                </span>
              )}
            </span>
            <span className="shrink-0 tabular-nums text-slate-600">{formatPaise(row.total)}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full"
              style={{ width: `${Math.max(2, (row.total / max) * 100)}%`, background: CHART.series1 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
