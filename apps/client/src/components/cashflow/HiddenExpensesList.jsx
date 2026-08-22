import { formatPaise } from '../../utils/format.js';
import { formatDate } from '../../utils/format.js';

export default function HiddenExpensesList({ findings }) {
  if (!findings.length) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        No recurring charge patterns detected. Nice and clean!
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {findings.map((f) => (
        <li key={`${f.label}-${f.amount}`} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{f.label}</p>
            <p className="text-xs text-slate-500">
              {formatPaise(f.amount)} every ~{f.intervalDays} days · {f.occurrences}× · last on{' '}
              {formatDate(f.lastCharged)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-amber-600">{formatPaise(f.estimatedMonthlyCost)}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">per month</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
