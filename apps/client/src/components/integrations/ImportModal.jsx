import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Button from '../common/Button.jsx';
import Loader from '../common/Loader.jsx';
import { apiClient, apiRequest } from '../../services/apiClient.js';

export default function ImportModal({ provider, onClose }) {
  const qc = useQueryClient();
  const [dataType, setDataType] = useState('transactions');
  // Local state machine (idle → running → success/error) driven by the awaited
  // request itself — independent of mutation-observer notifications.
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const run = async ({ file, sample }) => {
    setPhase('running');
    setErrorMsg(null);
    try {
      const form = new FormData();
      if (file) form.append('file', file);
      if (sample) form.append('sample', 'true');
      form.append('dataType', dataType);
      const data = await apiRequest(
        apiClient.post(`/integrations/${provider.id}/import`, form, { timeout: 120_000 })
      );
      setResult(data);
      setPhase('success');
      // Imported records feed every engine — refresh them all
      qc.invalidateQueries({ queryKey: ['integrations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['cashflow'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-brand-navy">
            {provider.emoji} Import from {provider.name}
          </h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        {provider.dataTypes.length > 1 && phase !== 'success' && (
          <div className="mb-4 flex gap-2">
            {provider.dataTypes.map((t) => (
              <button
                key={t}
                onClick={() => setDataType(t)}
                disabled={phase === 'running'}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${
                  dataType === t ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t === 'transactions' ? '💸 Transactions' : '📦 Products'}
              </button>
            ))}
          </div>
        )}

        {phase === 'running' && <Loader label={`Importing ${dataType} from ${provider.name}…`} />}

        {errorMsg && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</p>
        )}

        {phase === 'success' && result && (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-bold">✅ Import complete{result.usedSample ? ' (sample data)' : ''}</p>
              <ul className="mt-2 space-y-0.5">
                {result.transactions > 0 && <li>• {result.transactions} transactions added</li>}
                {result.expenses > 0 && <li>• {result.expenses} expenses added</li>}
                {result.skus > 0 && <li>• {result.skus} products added/updated</li>}
                {result.skipped > 0 && (
                  <li className="text-emerald-600">• {result.skipped} rows skipped (unreadable date/amount)</li>
                )}
              </ul>
              <p className="mt-2 text-xs text-emerald-700">
                This data now feeds your Cash Flow, Inventory and Copilot automatically.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        )}

        {phase === 'idle' && (
          <div className="space-y-3">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-brand-blue">
              <span className="text-3xl">📄</span>
              <span className="text-sm font-medium text-slate-700">
                Upload the CSV export from {provider.name}
              </span>
              <span className="text-xs text-slate-400">
                In {provider.name}: open reports/statements → Export → CSV/Excel (save as CSV)
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && run({ file: e.target.files[0] })}
              />
            </label>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
            </div>
            <button
              onClick={() => run({ sample: true })}
              className="w-full rounded-xl border border-brand-blue/40 bg-brand-sky px-4 py-3 text-sm font-semibold text-brand-navy hover:border-brand-blue"
            >
              ⚡ Try with sample {provider.name} data
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Sample data is clearly-labeled synthetic data in {provider.name}'s export format.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
