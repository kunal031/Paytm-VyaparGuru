import { useState } from 'react';
import Loader from '../common/Loader.jsx';
import { useImportedData } from '../../features/integrations/integrationsApi.js';
import { formatPaise, formatDate } from '../../utils/format.js';

export default function ViewDataModal({ provider, onClose }) {
  const [tab, setTab] = useState('transactions');
  const { data, isLoading, isError, error } = useImportedData(provider.id, true);

  const tabs = [
    { id: 'transactions', label: `💸 Transactions (${data?.transactions?.length ?? 0})` },
    { id: 'expenses', label: `🧾 Expenses (${data?.expenses?.length ?? 0})` },
    ...(provider.dataTypes.includes('products')
      ? [{ id: 'skus', label: `📦 Products (${data?.skus?.length ?? 0})` }]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-brand-navy">
            {provider.emoji} {provider.name} — imported data
          </h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        {isLoading && <Loader label="Loading imported data…" />}
        {isError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</p>}

        {data && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Imported revenue</p>
                <p className="text-xl font-bold text-brand-navy">{formatPaise(data.totals.revenue, { compact: true })}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Imported transactions</p>
                <p className="text-xl font-bold text-brand-navy">
                  {new Intl.NumberFormat('en-IN').format(data.totals.transactions)}
                </p>
              </div>
            </div>

            <div className="mb-3 flex gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    tab === t.id ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              {tab === 'transactions' && (
                <TableOrEmpty
                  rows={data.transactions}
                  head={['Date', 'Description', 'Amount']}
                  render={(t, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 pr-4 text-slate-500">{formatDate(t.timestamp)}</td>
                      <td className="py-1.5 pr-4">{t.description || '—'}</td>
                      <td className="py-1.5 font-medium text-emerald-700">{formatPaise(t.amount)}</td>
                    </tr>
                  )}
                />
              )}
              {tab === 'expenses' && (
                <TableOrEmpty
                  rows={data.expenses}
                  head={['Date', 'Category', 'Amount']}
                  render={(e, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 pr-4 text-slate-500">{formatDate(e.date)}</td>
                      <td className="py-1.5 pr-4">{e.category}</td>
                      <td className="py-1.5 font-medium text-red-700">{formatPaise(e.amount)}</td>
                    </tr>
                  )}
                />
              )}
              {tab === 'skus' && (
                <TableOrEmpty
                  rows={data.skus}
                  head={['Product', 'Category', 'Price', 'Stock']}
                  render={(s, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 pr-4 font-medium">{s.name}</td>
                      <td className="py-1.5 pr-4 text-slate-500">{s.category}</td>
                      <td className="py-1.5 pr-4">{formatPaise(s.price)}</td>
                      <td className="py-1.5">{s.currentStock} {s.unit}</td>
                    </tr>
                  )}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TableOrEmpty({ rows, head, render }) {
  if (!rows?.length) {
    return <p className="py-6 text-center text-sm text-slate-400">Nothing imported here yet.</p>;
  }
  return (
    <table className="w-full min-w-[440px] text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
          {head.map((h) => (
            <th key={h} className="py-2 pr-4 last:pr-0">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{rows.map(render)}</tbody>
    </table>
  );
}
