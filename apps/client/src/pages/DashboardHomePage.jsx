import { Link, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from 'recharts';
import { useAuthStore } from '../store/authStore.js';
import { useDashboardSummary } from '../features/dashboard/dashboardApi.js';
import Card from '../components/common/Card.jsx';
import { formatPaise } from '../utils/format.js';
import { useI18n } from '../i18n/LanguageContext.jsx';

const ASK_SUGGESTIONS = [
  'How were my sales this week?',
  'Why did my sales drop?',
  "What's not selling?",
];

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-slate-200" />
      <div className="h-28 rounded-xl bg-slate-200" />
    </div>
  );
}

function Delta({ pct }) {
  if (pct === null || pct === undefined) return null;
  const up = pct >= 0;
  return (
    <span
      className={`ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
        up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

export default function DashboardHomePage() {
  const merchant = useAuthStore((s) => s.merchant);
  const navigate = useNavigate();
  const { t } = useI18n();
  const { data, isLoading, isError, error, refetch } = useDashboardSummary();

  const askCopilot = (question) => navigate('/sales', { state: { question } });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Namaste, {merchant?.ownerName?.split(' ')[0]} 👋
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
          {merchant?.businessName}
        </p>
      </div>

      {isLoading && <Skeleton />}

      {isError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}{' '}
          <button onClick={() => refetch()} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Needs attention */}
          {(data.inventory?.urgent?.length > 0 || data.inventory?.dead > 0) && (
            <div className="space-y-2">
              <h3
                title={t('info.needsAttention')}
                className="cursor-help text-sm font-semibold uppercase tracking-wide text-slate-500"
              >
                {t('dash.needsAttention')}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.inventory.urgent.map((u) => (
                  <Link
                    key={u.name}
                    to="/inventory"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 transition hover:border-red-400"
                  >
                    <p className="text-sm font-bold text-red-800">
                      ⚠️ {u.name} — {u.daysUntilStockout === 0 ? 'out today' : `${u.daysUntilStockout}d left`}
                    </p>
                    <p className="mt-1 text-xs text-red-700">
                      Reorder ~{u.suggestedReorderQty} {u.unit}
                      {u.festivalAhead ? ` · 🎉 ${u.festivalAhead} ahead` : ''}
                    </p>
                  </Link>
                ))}
                {data.inventory.dead > 0 && (
                  <Link
                    to="/inventory"
                    className="rounded-xl border border-amber-200 bg-amber-50 p-3 transition hover:border-amber-400"
                  >
                    <p className="text-sm font-bold text-amber-800">
                      🧊 {data.inventory.dead} dead stock item{data.inventory.dead > 1 ? 's' : ''}
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      {formatPaise(data.inventory.deadStockValue, { compact: true })} locked up — run a clearance
                    </p>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Stat row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card title={t('dash.today')} info={t('info.today')}>
              <p className="text-2xl font-bold text-brand-navy">
                {data.today ? formatPaise(data.today.revenue, { compact: true }) : '—'}
              </p>
              <p className="text-xs text-slate-500">
                {data.today?.transactions ?? 0} {t('dash.transactions')}
              </p>
            </Card>
            <Card title={t('dash.thisWeek')} info={t('info.thisWeek')}>
              <p className="text-2xl font-bold text-brand-navy">
                {data.week ? formatPaise(data.week.revenue, { compact: true }) : '—'}
                {data.week && <Delta pct={data.week.revenueChangePct} />}
              </p>
              <p className="text-xs text-slate-500">
                vs {data.week ? formatPaise(data.week.lastWeekRevenue, { compact: true }) : '—'} {t('dash.vsLastWeek')}
              </p>
            </Card>
            <Card title={t('dash.forecast')} info={t('info.forecast')}>
              <p className="text-2xl font-bold text-brand-navy">
                {data.forecast ? formatPaise(data.forecast.projectedNet, { compact: true }) : '—'}
              </p>
              <p className="text-xs text-slate-500">
                {data.forecast?.nextFestival ? `🎉 ${data.forecast.nextFestival.name}` : ''}
              </p>
            </Card>
            <Card title={t('dash.hiddenCharges')} info={t('info.hiddenCharges')}>
              <p className="text-2xl font-bold text-brand-navy">
                {data.hiddenCharges ? formatPaise(data.hiddenCharges.estimatedMonthlyCost, { compact: true }) : '—'}
              </p>
              <p className="text-xs text-slate-500">
                {data.hiddenCharges?.count ?? 0}/month
              </p>
            </Card>
          </div>

          {/* Sparkline */}
          {data.sparkline.length > 0 && (
            <Card title={t('dash.revenue30')} info={t('info.revenue30')}>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.sparkline} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <defs>
                      <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00baf2" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#00baf2" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <Tooltip
                      formatter={(v) => [formatPaise(v), 'Revenue']}
                      labelFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#00baf2" strokeWidth={2} fill="url(#sparkFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                {data.topSeller && (
                  <span>
                    🏆 {t('dash.bestSeller')}: <b className="text-slate-700">{data.topSeller.name}</b> (
                    {formatPaise(data.topSeller.revenue, { compact: true })})
                  </span>
                )}
                {data.worstSeller && (
                  <span>
                    🐌 {t('dash.weakest')}: <b className="text-slate-700">{data.worstSeller.name}</b> (
                    {data.worstSeller.units})
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* Ask copilot */}
          <Card title={t('dash.ask')}>
            <div className="flex flex-wrap gap-2">
              {ASK_SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => askCopilot(q)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-brand-blue hover:text-brand-navy"
                >
                  💬 {q}
                </button>
              ))}
              <button
                onClick={() => navigate('/sales')}
                className="rounded-full bg-brand-navy px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                {t('dash.openCopilot')}
              </button>
            </div>
          </Card>

          {/* Module shortcuts */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/cashflow" className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-blue">
              <p className="font-semibold text-brand-navy">{t('dash.cashflowCard')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('dash.cashflowCardDesc')}</p>
            </Link>
            <Link to="/inventory" className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-blue">
              <p className="font-semibold text-brand-navy">{t('dash.inventoryCard')}</p>
              <p className="mt-1 text-xs text-slate-500">
                {data.inventory
                  ? `${data.inventory.fast} fast · ${data.inventory.slow} slow · ${data.inventory.dead} dead — ${data.inventory.stockoutAlerts} stockout alert${data.inventory.stockoutAlerts === 1 ? '' : 's'}`
                  : 'Fast/slow/dead classification and reorder advice.'}
              </p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
