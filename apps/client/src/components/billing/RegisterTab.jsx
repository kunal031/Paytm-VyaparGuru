import { useState } from 'react';
import Card from '../common/Card.jsx';
import Loader from '../common/Loader.jsx';
import InvoiceModal from './InvoiceModal.jsx';
import { useBills, useDaySummary, returnBill, useRefreshAfterBilling } from '../../features/billing/billingApi.js';
import { formatPaise } from '../../utils/format.js';

const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

const STATUS_BADGE = {
  paid: 'bg-emerald-100 text-emerald-700',
  udhaar: 'bg-amber-100 text-amber-700',
  refunded: 'bg-red-100 text-red-700',
  partial_refund: 'bg-orange-100 text-orange-700',
};

export default function RegisterTab() {
  const [date, setDate] = useState(todayIST());
  const { data: billData, isLoading } = useBills(date);
  const { data: summary } = useDaySummary(date);
  const refresh = useRefreshAfterBilling();
  const [viewing, setViewing] = useState(null);
  const [returning, setReturning] = useState(null); // bill being returned
  const [refundINR, setRefundINR] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submitReturn = async () => {
    const amount = Math.round(Number(refundINR) * 100);
    if (!amount || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Restock all catalog items on the bill when fully refunded
      const fullRefund = amount >= returning.total;
      await returnBill(returning._id, {
        amount,
        reason,
        restock: fullRefund
          ? returning.items.filter((i) => i.skuId).map((i) => ({ skuId: i.skuId, quantity: i.quantity }))
          : [],
      });
      setReturning(null);
      setRefundINR('');
      setReason('');
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
        />
        <span className="text-xs text-slate-400">Sales register & end-of-day summary</span>
      </div>

      {/* End-of-day reconciliation */}
      {summary && (
        <Card
          title={`📋 Day close — ${date}`}
          info="Everything that moved money this day: gross sales, per-payment-mode split, udhaar given (not yet cash), khata payments received, refunds paid out, and the net amount actually collected."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-400">Bills</p>
              <p className="text-xl font-bold text-brand-navy">{summary.billCount}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Gross sales</p>
              <p className="text-xl font-bold text-brand-navy">{formatPaise(summary.grossSales, { compact: true })}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Udhaar given</p>
              <p className="text-xl font-bold text-amber-600">{formatPaise(summary.udhaarGiven, { compact: true })}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Net collected</p>
              <p className="text-xl font-bold text-emerald-600">{formatPaise(summary.netCollected, { compact: true })}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
            {Object.entries(summary.byMode).map(([m, v]) => (
              <span key={m}>
                {m}: <b className="text-slate-700">{formatPaise(v)}</b>
              </span>
            ))}
            {summary.khataReceived > 0 && (
              <span>
                Khata received: <b className="text-emerald-700">{formatPaise(summary.khataReceived)}</b>
              </span>
            )}
            {summary.refunds > 0 && (
              <span>
                Refunds: <b className="text-red-600">− {formatPaise(summary.refunds)}</b>
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Bills list */}
      {isLoading && <Loader label="Loading bills…" />}
      {billData && (
        <Card title={`Bills (${billData.bills.length})`}>
          {billData.bills.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No bills on this date.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Bill</th>
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Items</th>
                    <th className="py-2 pr-3">Mode</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {billData.bills.map((b) => (
                    <tr key={b._id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 font-semibold text-brand-navy">{b.billNo}</td>
                      <td className="py-2 pr-3 text-slate-500">
                        {new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 pr-3 text-slate-500">{b.items.length}</td>
                      <td className="py-2 pr-3">{b.paymentMode}</td>
                      <td className="py-2 pr-3 font-medium">{formatPaise(b.total)}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGE[b.status]}`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => setViewing(b)} className="mr-2 text-xs font-semibold text-brand-blue hover:underline">
                          Invoice
                        </button>
                        {b.status !== 'refunded' && (
                          <button
                            onClick={() => {
                              setReturning(b);
                              setRefundINR(String((b.total - (b.returns || []).reduce((a, r) => a + r.amount, 0)) / 100));
                            }}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {viewing && <InvoiceModal bill={viewing} onClose={() => setViewing(null)} />}

      {/* Return dialog */}
      {returning && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-base font-bold text-brand-navy">↩️ Return — {returning.billNo}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Bill total {formatPaise(returning.total)} · full refunds restock catalog items automatically.
            </p>
            <label className="mt-3 block text-xs font-medium text-slate-500">Refund amount (₹)</label>
            <input
              value={refundINR}
              onChange={(e) => setRefundINR(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
            />
            <label className="mt-2 block text-xs font-medium text-slate-500">Reason</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Damaged / wrong item / customer changed mind…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
            />
            {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setReturning(null)} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={submitReturn}
                disabled={busy}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? '…' : 'Record return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
