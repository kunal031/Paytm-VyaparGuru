import { useState } from 'react';
import Card from '../components/common/Card.jsx';
import Loader from '../components/common/Loader.jsx';
import RevenueProfitChart from '../components/cashflow/RevenueProfitChart.jsx';
import ForecastChart from '../components/cashflow/ForecastChart.jsx';
import ExpenseBreakdown from '../components/cashflow/ExpenseBreakdown.jsx';
import HiddenExpensesList from '../components/cashflow/HiddenExpensesList.jsx';
import {
  useDailyCashflow,
  useExpenseBreakdown,
  useHiddenExpenses,
  useForecast,
} from '../features/cashflow/cashflowApi.js';
import { formatPaise } from '../utils/format.js';

const RANGES = [
  { label: '30D', days: 30 },
  { label: '60D', days: 60 },
  { label: '90D', days: 90 },
];

function StatCard({ title, value, sub, tone = 'default' }) {
  const toneClass =
    tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-600' : 'text-brand-navy';
  return (
    <Card title={title}>
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

export default function CashflowPage() {
  const [days, setDays] = useState(90);
  const daily = useDailyCashflow(days);
  const expenses = useExpenseBreakdown(days);
  const hidden = useHiddenExpenses();
  const forecast = useForecast(30);

  const series = daily.data?.series ?? [];
  const totals = series.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenue,
      profit: acc.profit + p.profit,
      expenses: acc.expenses + p.expenses,
    }),
    { revenue: 0, profit: 0, expenses: 0 }
  );
  const margin = totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : null;

  const forecastNet = (forecast.data?.points ?? []).reduce((a, p) => a + p.yhat, 0);
  const hiddenMonthly = (hidden.data?.findings ?? []).reduce(
    (a, f) => a + f.estimatedMonthlyCost,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Cash Flow Clarity</h2>
          <p className="mt-1 text-sm text-slate-500">
            Revenue, profit and expenses from your Paytm transactions — plus a 30-day forecast.
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                days === r.days ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {daily.isLoading && <Loader label="Crunching your cash flow…" />}
      {daily.isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{daily.error.message}</p>
      )}

      {series.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title={`Revenue (${days}d)`} value={formatPaise(totals.revenue, { compact: true })} />
            <StatCard
              title={`Profit (${days}d)`}
              value={formatPaise(totals.profit, { compact: true })}
              sub={margin ? `${margin}% margin (est. from COGS)` : null}
              tone="good"
            />
            <StatCard title={`Expenses (${days}d)`} value={formatPaise(totals.expenses, { compact: true })} />
            <StatCard
              title="Projected net (next 30d)"
              value={forecast.isLoading ? '…' : formatPaise(forecastNet, { compact: true })}
              sub={forecast.data ? `via ${forecast.data.source === 'ml-service' ? 'ML service' : 'local model'}` : null}
              tone={forecastNet < 0 ? 'bad' : 'good'}
            />
          </div>

          <Card title="Revenue vs Profit (daily)">
            <RevenueProfitChart series={series} />
          </Card>

          <Card title="Net Cash Flow Forecast — next 30 days">
            {forecast.isLoading && <Loader label="Forecasting…" />}
            {forecast.isError && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {forecast.error.message}
              </p>
            )}
            {forecast.data && (
              <>
                <ForecastChart
                  history={series}
                  forecast={forecast.data.points}
                  festivals={forecast.data.upcomingFestivals}
                />
                {forecast.data.upcomingFestivals.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    Festival demand ahead:{' '}
                    {[...new Set(forecast.data.upcomingFestivals.map((f) => f.name))].join(', ')} —
                    stock up early.
                  </p>
                )}
              </>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={`Expense Breakdown (${days}d)`}>
              {expenses.isLoading && <Loader />}
              {expenses.data && <ExpenseBreakdown categories={expenses.data.categories} />}
            </Card>
            <Card
              title={
                hiddenMonthly > 0
                  ? `Hidden Recurring Charges — ~${formatPaise(hiddenMonthly, { compact: true })}/month`
                  : 'Hidden Recurring Charges'
              }
            >
              {hidden.isLoading && <Loader />}
              {hidden.data && <HiddenExpensesList findings={hidden.data.findings} />}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
