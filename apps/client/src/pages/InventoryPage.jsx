import { useMemo, useState } from 'react';
import Card from '../components/common/Card.jsx';
import Loader from '../components/common/Loader.jsx';
import Button from '../components/common/Button.jsx';
import StockTable from '../components/inventory/StockTable.jsx';
import AlertCards from '../components/inventory/AlertCards.jsx';
import OnboardModal from '../components/inventory/OnboardModal.jsx';
import { useInventoryOverview } from '../features/inventory/inventoryApi.js';
import { formatPaise } from '../utils/format.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'fast', label: '⚡ Fast' },
  { id: 'slow', label: '🐢 Slow' },
  { id: 'dead', label: '🧊 Dead' },
];

export default function InventoryPage() {
  const { data, isLoading, isError, error } = useInventoryOverview();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const skus = data?.skus ?? [];
  const summary = data?.summary;

  const filtered = useMemo(() => {
    let list = skus;
    if (filter !== 'all') list = list.filter((s) => s.classification === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q)
      );
    }
    // Urgent stockouts first, then by velocity
    return [...list].sort((a, b) => {
      const ax = a.daysUntilStockout ?? Infinity;
      const bx = b.daysUntilStockout ?? Infinity;
      if (ax !== bx) return ax - bx;
      return b.velocityPerDay - a.velocityPerDay;
    });
  }, [skus, filter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Inventory Intelligence</h2>
          <p className="mt-1 text-sm text-slate-500">
            Fast/slow/dead classification, stockout predictions and reorder advice.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Add Stock</Button>
      </div>

      {isLoading && <Loader label="Analyzing your inventory…" />}
      {isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
      )}

      {summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card title="Fast Movers">
              <p className="text-2xl font-bold text-emerald-600">{summary.fast}</p>
              <p className="mt-1 text-xs text-slate-500">of {summary.total} SKUs</p>
            </Card>
            <Card title="Slow Movers">
              <p className="text-2xl font-bold text-amber-600">{summary.slow}</p>
            </Card>
            <Card title="Dead Stock">
              <p className="text-2xl font-bold text-red-600">{summary.dead}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatPaise(summary.deadStockValue, { compact: true })} locked in unsold inventory
              </p>
            </Card>
            <Card title="Stockout Alerts">
              <p className={`text-2xl font-bold ${summary.stockoutAlerts ? 'text-red-600' : 'text-brand-navy'}`}>
                {summary.stockoutAlerts}
              </p>
              <p className="mt-1 text-xs text-slate-500">running out within 7 days</p>
            </Card>
          </div>

          <AlertCards skus={skus} />

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      filter === f.id ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <input
                placeholder="Search SKUs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none sm:w-56"
              />
            </div>
            <StockTable skus={filtered} />
          </Card>
        </>
      )}

      <OnboardModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
