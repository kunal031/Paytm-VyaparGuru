import { useState } from 'react';
import Card from '../common/Card.jsx';
import Loader from '../common/Loader.jsx';
import {
  useCustomers,
  addCustomer,
  recordPayment,
  getCustomerKhata,
  useRefreshAfterBilling,
} from '../../features/billing/billingApi.js';
import { formatPaise, formatDate } from '../../utils/format.js';

export default function KhataTab() {
  const { data, isLoading } = useCustomers();
  const refresh = useRefreshAfterBilling();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(null); // customer receiving a payment
  const [payINR, setPayINR] = useState('');
  const [detail, setDetail] = useState(null); // {customer, entries}

  const customers = data?.customers ?? [];
  const totalOutstanding = customers.reduce((a, c) => a + Math.max(0, c.udhaarBalance), 0);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addCustomer({ name: form.name, phone: form.phone || null });
      setForm({ name: '', phone: '' });
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const collect = async () => {
    const amount = Math.round(Number(payINR) * 100);
    if (!amount || busy) return;
    setBusy(true);
    setError(null);
    try {
      await recordPayment(paying._id, { amount });
      setPaying(null);
      setPayINR('');
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (customer) => {
    try {
      setDetail(await getCustomerKhata(customer._id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <Card
        title={`📒 Udhaar outstanding: ${formatPaise(totalOutstanding, { compact: true })}`}
        info="Credit (udhaar) you have extended. Udhaar bills add to a customer's balance; collecting a payment reduces it and records the cash as revenue."
      >
        <form onSubmit={add} className="grid gap-2 sm:grid-cols-3">
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Customer name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Phone (optional)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            + Add customer
          </button>
        </form>
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </Card>

      {isLoading && <Loader label="Loading khata…" />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {customers.map((c) => (
          <div key={c._id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{c.name}</p>
                {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
              </div>
              <p className={`text-lg font-bold ${c.udhaarBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatPaise(Math.abs(c.udhaarBalance))}
              </p>
            </div>
            <p className="text-[11px] text-slate-400">
              {c.udhaarBalance > 0 ? 'owes you' : 'settled'}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setPaying(c)}
                disabled={c.udhaarBalance <= 0}
                className="flex-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
              >
                💵 Collect
              </button>
              <button
                onClick={() => openDetail(c)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-blue"
              >
                📖 Khata
              </button>
            </div>
          </div>
        ))}
        {!isLoading && customers.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-slate-400">
            No khata customers yet — add one above, or create an Udhaar bill from the counter.
          </p>
        )}
      </div>

      {/* Collect payment dialog */}
      {paying && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-base font-bold text-brand-navy">💵 Collect from {paying.name}</h3>
            <p className="mt-1 text-xs text-slate-500">Outstanding: {formatPaise(paying.udhaarBalance)}</p>
            <input
              value={payINR}
              onChange={(e) => setPayINR(e.target.value)}
              inputMode="decimal"
              placeholder="Amount ₹"
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setPaying(null)} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={collect}
                disabled={busy}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? '…' : 'Record payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Khata detail dialog */}
      {detail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-brand-navy">📖 {detail.customer.name} — khata</h3>
              <button onClick={() => setDetail(null)} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <p className="mt-1 text-sm">
              Balance:{' '}
              <b className={detail.customer.udhaarBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                {formatPaise(detail.customer.udhaarBalance)}
              </b>
            </p>
            <ul className="mt-3 divide-y divide-slate-100">
              {detail.entries.map((e, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-700">
                      {e.type === 'udhaar' ? '🛒 Udhaar' : '💵 Payment'}
                      {e.note ? ` · ${e.note}` : ''}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(e.createdAt)}</p>
                  </div>
                  <span className={`font-semibold ${e.type === 'udhaar' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {e.type === 'udhaar' ? '+' : '−'} {formatPaise(e.amount)}
                  </span>
                </li>
              ))}
              {detail.entries.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">No entries yet.</p>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
