import { useAuthStore } from '../../store/authStore.js';
import Button from '../common/Button.jsx';
import { formatPaise } from '../../utils/format.js';

/** Printable invoice — the Print button uses the browser's print-to-PDF. */
export default function InvoiceModal({ bill, onClose }) {
  const merchant = useAuthStore((s) => s.merchant);
  if (!bill) return null;

  const refunded = (bill.returns || []).reduce((a, r) => a + r.amount, 0);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div id="invoice-print" className="p-6">
          <div className="border-b border-dashed border-slate-300 pb-3 text-center">
            <p className="text-lg font-extrabold text-slate-900">{merchant?.businessName}</p>
            {merchant?.location?.city && (
              <p className="text-xs text-slate-500">
                {merchant.location.city}{merchant.location.state ? `, ${merchant.location.state}` : ''}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {bill.billNo} · {new Date(bill.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            {bill.customerName && <p className="text-xs text-slate-600">Customer: {bill.customerName}</p>}
          </div>

          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="pb-1">Item</th>
                <th className="pb-1 text-center">Qty</th>
                <th className="pb-1 text-right">Rate</th>
                <th className="pb-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((i, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2">{i.name}</td>
                  <td className="py-1.5 text-center">{i.quantity}</td>
                  <td className="py-1.5 text-right">{formatPaise(i.unitPrice)}</td>
                  <td className="py-1.5 text-right font-medium">{formatPaise(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 space-y-1 border-t border-dashed border-slate-300 pt-3 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{formatPaise(bill.subtotal)}</span>
            </div>
            {bill.discount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Discount</span>
                <span>− {formatPaise(bill.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-900">
              <span>Total</span>
              <span>{formatPaise(bill.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Payment</span>
              <span>
                {bill.paymentMode === 'Udhaar' ? '📒 Udhaar (khata)' : bill.paymentMode}
              </span>
            </div>
            {refunded > 0 && (
              <div className="flex justify-between text-xs font-semibold text-red-600">
                <span>Refunded</span>
                <span>− {formatPaise(refunded)}</span>
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-[10px] text-slate-400">
            Thank you! · Powered by Paytm VyaparGuru
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 p-4 print:hidden">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()}>🖨️ Print / PDF</Button>
        </div>
      </div>
    </div>
  );
}
