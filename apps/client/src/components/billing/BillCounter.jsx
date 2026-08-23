import { useMemo, useState } from 'react';
import Button from '../common/Button.jsx';
import InvoiceModal from './InvoiceModal.jsx';
import { useSkuCatalog, useCustomers, createBill, useRefreshAfterBilling } from '../../features/billing/billingApi.js';
import { formatPaise } from '../../utils/format.js';

const MODES = [
  { id: 'Cash', label: '💵 Cash' },
  { id: 'QR', label: '📱 QR' },
  { id: 'Card', label: '💳 Card' },
  { id: 'Udhaar', label: '📒 Udhaar' },
];

export default function BillCounter() {
  const { data: catalog } = useSkuCatalog();
  const { data: customerData } = useCustomers();
  const refresh = useRefreshAfterBilling();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // {skuId?, name, unitPrice, quantity}
  const [discountINR, setDiscountINR] = useState('');
  const [mode, setMode] = useState('Cash');
  const [customerName, setCustomerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [custom, setCustom] = useState({ name: '', priceINR: '' });

  const skus = catalog?.skus ?? [];
  const filtered = useMemo(
    () =>
      skus.filter(
        (s) =>
          !search ||
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.category || '').toLowerCase().includes(search.toLowerCase())
      ),
    [skus, search]
  );

  const addSku = (sku) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.skuId === sku._id);
      if (existing) {
        return prev.map((c) => (c.skuId === sku._id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { skuId: sku._id, name: sku.name, unitPrice: sku.price, quantity: 1 }];
    });
  };

  const addCustom = () => {
    const price = Math.round(Number(custom.priceINR) * 100);
    if (!custom.name.trim() || !(price >= 0)) return;
    setCart((prev) => [...prev, { skuId: null, name: custom.name.trim(), unitPrice: price, quantity: 1 }]);
    setCustom({ name: '', priceINR: '' });
  };

  const changeQty = (idx, delta) =>
    setCart((prev) =>
      prev
        .map((c, i) => (i === idx ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );

  const subtotal = cart.reduce((a, c) => a + c.unitPrice * c.quantity, 0);
  const discount = Math.min(Math.round(Number(discountINR || 0) * 100), subtotal);
  const total = subtotal - discount;

  const save = async () => {
    if (!cart.length || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { bill } = await createBill({
        items: cart.map((c) => ({ skuId: c.skuId, name: c.name, quantity: c.quantity, unitPrice: c.unitPrice })),
        discount,
        paymentMode: mode,
        customerName: customerName.trim() || undefined,
      });
      setInvoice(bill);
      setCart([]);
      setDiscountINR('');
      setCustomerName('');
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Product picker */}
      <div className="lg:col-span-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search products…"
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
        />
        <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {filtered.map((s) => (
            <button
              key={s._id}
              onClick={() => addSku(s)}
              className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-blue"
            >
              <p className="line-clamp-2 text-xs font-semibold text-slate-800">{s.name}</p>
              <p className="mt-1 text-sm font-bold text-brand-navy">{formatPaise(s.price)}</p>
              <p className={`text-[10px] ${s.currentStock <= 5 ? 'text-red-600' : 'text-slate-400'}`}>
                {s.currentStock} {s.unit} left
              </p>
            </button>
          ))}
        </div>
        {/* Custom item */}
        <div className="mt-3 flex gap-2">
          <input
            value={custom.name}
            onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))}
            placeholder="Custom item name"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-brand-blue focus:outline-none"
          />
          <input
            value={custom.priceINR}
            onChange={(e) => setCustom((c) => ({ ...c, priceINR: e.target.value }))}
            placeholder="₹"
            inputMode="decimal"
            className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-brand-blue focus:outline-none"
          />
          <button onClick={addCustom} className="rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200">
            + Add
          </button>
        </div>
      </div>

      {/* Cart / bill */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
        <h3 className="mb-2 text-sm font-semibold text-slate-500">🧾 Current bill</h3>
        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Tap products to add them</p>
        ) : (
          <div className="space-y-1.5">
            {cart.map((c, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <button onClick={() => changeQty(idx, -1)} className="h-6 w-6 rounded bg-slate-100 font-bold">−</button>
                <span className="w-6 text-center font-semibold">{c.quantity}</span>
                <button onClick={() => changeQty(idx, 1)} className="h-6 w-6 rounded bg-slate-100 font-bold">+</button>
                <span className="w-20 text-right font-medium">{formatPaise(c.unitPrice * c.quantity)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">{formatPaise(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Discount ₹</span>
            <input
              value={discountINR}
              onChange={(e) => setDiscountINR(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm focus:border-brand-blue focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between text-lg font-extrabold text-brand-navy">
            <span>Total</span>
            <span>{formatPaise(total)}</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-lg py-1.5 text-[11px] font-semibold ${
                mode === m.id ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Tagging a customer (optional for paid bills, required for udhaar)
            feeds the Customers intelligence page automatically */}
        <div className="mt-2">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            list="khata-customers"
            placeholder={mode === 'Udhaar' ? 'Customer name (required for udhaar)' : '👤 Customer (optional — enables tracking)'}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
              mode === 'Udhaar'
                ? 'border-amber-300 bg-amber-50 focus:border-amber-500'
                : 'border-slate-300 focus:border-brand-blue'
            }`}
          />
          <datalist id="khata-customers">
            {(customerData?.customers ?? []).map((c) => (
              <option key={c._id} value={c.name} />
            ))}
          </datalist>
        </div>

        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <Button
          onClick={save}
          disabled={!cart.length || saving || (mode === 'Udhaar' && !customerName.trim())}
          className="mt-3 w-full"
        >
          {saving ? 'Saving…' : `✅ Save bill · ${formatPaise(total)}`}
        </Button>
      </div>

      {invoice && <InvoiceModal bill={invoice} onClose={() => setInvoice(null)} />}
    </div>
  );
}
