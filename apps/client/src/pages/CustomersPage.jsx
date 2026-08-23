import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '../components/common/Card.jsx';
import Loader from '../components/common/Loader.jsx';
import ReminderModal from '../components/customers/ReminderModal.jsx';
import { apiClient, apiRequest } from '../services/apiClient.js';
import { useI18n } from '../i18n/LanguageContext.jsx';
import { formatPaise, formatDate } from '../utils/format.js';

const SEGMENTS = {
  vip: { label: '👑 VIP', cls: 'bg-purple-100 text-purple-700' },
  regular: { label: '🔁 Regular', cls: 'bg-emerald-100 text-emerald-700' },
  new: { label: '🆕 New', cls: 'bg-sky-100 text-sky-700' },
  occasional: { label: '🚶 Occasional', cls: 'bg-slate-100 text-slate-600' },
  at_risk: { label: '⚠️ At risk', cls: 'bg-amber-100 text-amber-700' },
  churned: { label: '💤 Churned', cls: 'bg-red-100 text-red-700' },
};

function SegmentBadge({ segment }) {
  const s = SEGMENTS[segment] ?? SEGMENTS.occasional;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>{s.label}</span>;
}

export default function CustomersPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState('all');
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [reminder, setReminder] = useState(null); // {customerId, customerName, type}

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['customers', 'insights'],
    queryFn: () => apiRequest(apiClient.get('/customers/insights')),
  });

  const openProfile = async (c) => {
    setLoadingProfile(true);
    try {
      setProfile(await apiRequest(apiClient.get(`/customers/${c._id}/profile`)));
    } catch {
      /* toast-less: row stays */
    } finally {
      setLoadingProfile(false);
    }
  };

  const customers = data?.customers ?? [];
  const filtered = filter === 'all' ? customers : customers.filter((c) => c.segment === filter);
  const seg = data?.summary?.bySegment ?? {};

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('customers.title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('customers.subtitle')}</p>
      </div>

      {isLoading && <Loader label={t('common.loading')} />}
      {isError && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>}

      {data && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card title={t('customers.total')} info={t('customers.info.total')}>
              <p className="text-2xl font-bold text-brand-navy">{data.summary.total}</p>
            </Card>
            <Card title={t('customers.repeatRate')} info={t('customers.info.repeatRate')}>
              <p className="text-2xl font-bold text-brand-navy">{data.summary.repeatRate}%</p>
            </Card>
            <Card title={t('customers.atRisk')} info={t('customers.info.atRisk')}>
              <p className="text-2xl font-bold text-amber-600">{(seg.at_risk || 0) + (seg.churned || 0)}</p>
            </Card>
            <Card title={t('customers.udhaarOut')} info={t('customers.info.udhaarOut')}>
              <p className="text-2xl font-bold text-brand-navy">
                {formatPaise(data.summary.totalOutstandingUdhaar, { compact: true })}
              </p>
            </Card>
          </div>

          {/* Segment filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === 'all' ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              All ({customers.length})
            </button>
            {Object.entries(SEGMENTS).map(([id, s]) =>
              seg[id] ? (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === id ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {s.label} ({seg[id]})
                </button>
              ) : null
            )}
          </div>

          {/* Customer table */}
          <Card title={`${filtered.length} customer${filtered.length === 1 ? '' : 's'}`}>
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No customers here yet — tag customers on bills at the Billing counter and they appear automatically.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                      <th className="py-2 pr-3">Customer</th>
                      <th className="py-2 pr-3">Segment</th>
                      <th className="py-2 pr-3">Visits</th>
                      <th className="py-2 pr-3">Spend</th>
                      <th className="py-2 pr-3">Avg bill</th>
                      <th className="py-2 pr-3">Last visit</th>
                      <th className="py-2 pr-3">Favourite</th>
                      <th className="py-2">Udhaar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr
                        key={c._id}
                        onClick={() => openProfile(c)}
                        className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="py-2.5 pr-3 font-semibold text-brand-navy">{c.name}</td>
                        <td className="py-2.5 pr-3"><SegmentBadge segment={c.segment} /></td>
                        <td className="py-2.5 pr-3">{c.visits}</td>
                        <td className="py-2.5 pr-3 font-medium">{formatPaise(c.totalSpend)}</td>
                        <td className="py-2.5 pr-3 text-slate-500">{formatPaise(c.avgTicket)}</td>
                        <td className="py-2.5 pr-3 text-slate-500">
                          {c.lastVisit ? `${c.daysSinceLastVisit}d ago` : '—'}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-500">{c.favorites?.[0]?.name ?? '—'}</td>
                        <td className={`py-2.5 ${c.udhaarBalance > 0 ? 'font-semibold text-amber-600' : 'text-slate-400'}`}>
                          {c.udhaarBalance > 0 ? formatPaise(c.udhaarBalance) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {loadingProfile && <Loader label={t('common.loading')} />}

      {/* Profile drawer */}
      {profile && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-brand-navy">{profile.customer.name}</h3>
                <p className="text-xs text-slate-400">
                  {profile.customer.phone || 'no phone'} · <SegmentBadge segment={profile.segment} />
                </p>
              </div>
              <button onClick={() => setProfile(null)} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">✕</button>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                ['Visits', profile.stats.visits],
                ['Spend', formatPaise(profile.stats.totalSpend, { compact: true })],
                ['Avg bill', formatPaise(profile.stats.avgTicket, { compact: true })],
                ['Every', profile.stats.visits > 1 ? `${profile.stats.cadence}d` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="text-sm font-bold text-brand-navy">{value}</p>
                </div>
              ))}
            </div>

            {profile.signals.length > 0 && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3">
                <p className="text-xs font-bold text-amber-800">⚠️ Why this customer needs attention</p>
                <ul className="mt-1 space-y-1 text-xs text-amber-800">
                  {profile.signals.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* WhatsApp actions */}
            <div className="mt-3 flex gap-2">
              {(profile.segment === 'at_risk' || profile.segment === 'churned' || profile.stats.daysSinceLastVisit > profile.stats.cadence * 2) && (
                <button
                  onClick={() => setReminder({ customerId: profile.customer._id, customerName: profile.customer.name, type: 'winback' })}
                  className="flex-1 rounded-xl bg-[#25D366]/10 py-2 text-xs font-bold text-[#128C7E] hover:bg-[#25D366]/20"
                >
                  👋 WhatsApp: invite back
                </button>
              )}
              {profile.customer.udhaarBalance > 0 && (
                <button
                  onClick={() => setReminder({ customerId: profile.customer._id, customerName: profile.customer.name, type: 'udhaar' })}
                  className="flex-1 rounded-xl bg-[#25D366]/10 py-2 text-xs font-bold text-[#128C7E] hover:bg-[#25D366]/20"
                >
                  💰 WhatsApp: udhaar reminder
                </button>
              )}
            </div>

            {profile.stats.favorites.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Usually buys</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {profile.stats.favorites.map((f) => (
                    <span key={f.name} className="rounded-full bg-brand-sky px-2.5 py-1 text-xs font-medium text-brand-navy">
                      {f.name} ×{f.qty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Purchase history ({profile.bills.length})
              </p>
              <ul className="mt-1 divide-y divide-slate-100">
                {profile.bills.map((b) => (
                  <li key={b._id} className="py-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">{b.billNo}</span>
                      <span className="font-medium">{formatPaise(b.total)}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {formatDate(b.createdAt)} · {b.paymentMode} ·{' '}
                      {b.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {reminder && (
        <ReminderModal
          customerId={reminder.customerId}
          customerName={reminder.customerName}
          type={reminder.type}
          onClose={() => setReminder(null)}
        />
      )}
    </div>
  );
}
