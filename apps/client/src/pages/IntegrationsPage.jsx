import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Loader from '../components/common/Loader.jsx';
import ImportModal from '../components/integrations/ImportModal.jsx';
import ViewDataModal from '../components/integrations/ViewDataModal.jsx';
import { useIntegrations, useConnectIntegration } from '../features/integrations/integrationsApi.js';
import { formatDate } from '../utils/format.js';
import { useI18n } from '../i18n/LanguageContext.jsx';

function ProviderCard({ p, onImport, onView, onToggle, toggling }) {
  const connected = p.status === 'connected';
  const hasData = p.imported.transactions + p.imported.expenses + p.imported.skus > 0;
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-blue/60">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{p.emoji}</span>
          <div>
            <p className="font-semibold text-slate-900">{p.name}</p>
            {connected ? (
              <p className="text-[11px] font-semibold text-emerald-600">
                ● Connected{p.lastImportAt ? ` · imported ${formatDate(p.lastImportAt)}` : ''}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">Not connected</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onToggle(p)}
          disabled={toggling}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            connected
              ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              : 'bg-brand-navy text-white hover:opacity-90'
          }`}
        >
          {connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
      <p className="mt-2 flex-1 text-xs text-slate-500">{p.blurb}</p>
      {hasData && (
        <p className="mt-2 text-[11px] text-slate-400">
          {p.imported.transactions > 0 && `${p.imported.transactions} txns`}
          {p.imported.expenses > 0 && ` · ${p.imported.expenses} expenses`}
          {p.imported.skus > 0 && ` · ${p.imported.skus} products`}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onImport(p)}
          className="flex-1 rounded-lg bg-brand-sky px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-blue/20"
        >
          ⬆️ Import
        </button>
        <button
          onClick={() => onView(p)}
          disabled={!hasData}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-blue disabled:opacity-40"
        >
          👁️ View data
        </button>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { t } = useI18n();
  const { data, isLoading, isError, error } = useIntegrations();
  const connectMutation = useConnectIntegration();
  const [importing, setImporting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const qc = useQueryClient();
  const toggle = async (p) => {
    try {
      const fresh = await connectMutation.mutateAsync({
        provider: p.id,
        action: p.status === 'connected' ? 'disconnect' : 'connect',
      });
      qc.setQueryData(['integrations'], fresh);
    } catch {
      qc.invalidateQueries({ queryKey: ['integrations'] });
    }
  };

  const integrations = data?.integrations ?? [];
  const categories = [...new Set(integrations.map((p) => p.category))];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('integrations.title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('integrations.subtitle')}</p>
      </div>

      {isLoading && <Loader label="Loading integrations…" />}
      {isError && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>}

      {categories.map((cat) => (
        <div key={cat} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{cat}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {integrations
              .filter((p) => p.category === cat)
              .map((p) => (
                <ProviderCard
                  key={p.id}
                  p={p}
                  onImport={setImporting}
                  onView={setViewing}
                  onToggle={toggle}
                  toggling={connectMutation.isPending}
                />
              ))}
          </div>
        </div>
      ))}

      <p className="rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500">
        💡 How it works: every app here can export CSV/Excel reports. Upload that export (or try the
        sample) and VyaparGuru maps the columns automatically — sales become transactions, purchases
        become expenses, catalogs become SKUs. Live API sync (OAuth) is the roadmap; file import
        works today with zero setup.
      </p>

      {importing && <ImportModal provider={importing} onClose={() => setImporting(null)} />}
      {viewing && <ViewDataModal provider={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
