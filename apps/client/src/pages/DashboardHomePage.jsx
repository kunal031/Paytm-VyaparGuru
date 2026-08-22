import { useQuery } from '@tanstack/react-query';
import { apiClient, apiRequest } from '../services/apiClient.js';
import { useAuthStore } from '../store/authStore.js';
import Card from '../components/common/Card.jsx';
import Loader from '../components/common/Loader.jsx';
import { formatPaise, formatDate } from '../utils/format.js';

export default function DashboardHomePage() {
  const merchant = useAuthStore((s) => s.merchant);

  const cashflow = useQuery({
    queryKey: ['cashflow', 'summary'],
    queryFn: () => apiRequest(apiClient.get('/cashflow/summary')),
  });
  const inventory = useQuery({
    queryKey: ['inventory', 'skus'],
    queryFn: () => apiRequest(apiClient.get('/inventory/skus')),
  });

  const summary = cashflow.data?.summary;
  const skus = inventory.data?.skus ?? [];
  const lowStock = skus.filter((s) => s.currentStock <= 10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Namaste, {merchant?.ownerName?.split(' ')[0]} 👋
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Here's a snapshot of {merchant?.businessName}. Full insight modules arrive in Phases 2–4.
        </p>
      </div>

      {(cashflow.isLoading || inventory.isLoading) && <Loader label="Fetching your business data…" />}

      {cashflow.isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{cashflow.error.message}</p>
      )}

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Total Revenue (all time)">
            <p className="text-2xl font-bold text-brand-navy">{formatPaise(summary.totalRevenue, { compact: true })}</p>
          </Card>
          <Card title="Transactions">
            <p className="text-2xl font-bold text-brand-navy">
              {new Intl.NumberFormat('en-IN').format(summary.transactionCount)}
            </p>
          </Card>
          <Card title="Catalog SKUs">
            <p className="text-2xl font-bold text-brand-navy">{skus.length}</p>
          </Card>
          <Card title="Low Stock Items">
            <p className={`text-2xl font-bold ${lowStock.length ? 'text-amber-600' : 'text-brand-navy'}`}>
              {lowStock.length}
            </p>
          </Card>
        </div>
      )}

      {summary?.firstTxn && (
        <Card title="Data Range">
          <p className="text-sm text-slate-600">
            Paytm transactions from <b>{formatDate(summary.firstTxn)}</b> to <b>{formatDate(summary.lastTxn)}</b> are synced
            and ready for the Cash Flow, Inventory, and Copilot engines.
          </p>
        </Card>
      )}

      {skus.length > 0 && (
        <Card title="Your Catalog">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2">Stock</th>
                </tr>
              </thead>
              <tbody>
                {skus.map((sku) => (
                  <tr key={sku._id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-800">{sku.name}</td>
                    <td className="py-2 pr-4 text-slate-500">{sku.category}</td>
                    <td className="py-2 pr-4">{formatPaise(sku.price)}</td>
                    <td className={`py-2 ${sku.currentStock <= 10 ? 'font-semibold text-amber-600' : ''}`}>
                      {sku.currentStock} {sku.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
