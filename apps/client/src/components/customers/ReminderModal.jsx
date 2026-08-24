import { useEffect, useState } from 'react';
import { apiClient, apiRequest } from '../../services/apiClient.js';
import { useI18n } from '../../i18n/LanguageContext.jsx';
import Loader from '../common/Loader.jsx';

/**
 * Generates a personalized WhatsApp reminder (udhaar or win-back), lets the
 * merchant edit it, then opens WhatsApp via a wa.me deep link — works with the
 * merchant's own WhatsApp, no API setup needed.
 */
export default function ReminderModal({ customerId, customerName, type, onClose }) {
  const { lang } = useI18n();
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiRequest(
          apiClient.post(`/customers/${customerId}/reminder`, { type, language: lang }, { timeout: 180_000 })
        );
        if (!alive) return;
        setMessage(data.message);
        setPhone(data.phone);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, type]);

  const waUrl = `https://wa.me/${phone ?? ''}?text=${encodeURIComponent(message)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-brand-navy">
            {type === 'udhaar' ? '💰' : '👋'} WhatsApp — {customerName}
          </h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          {type === 'udhaar' ? 'Polite udhaar reminder' : 'Win-back invitation'} · edit before sending
          {!phone && ' · no phone saved — WhatsApp will ask you to pick the contact'}
        </p>

        {loading && <Loader label="Writing the message…" />}
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {!loading && !error && (
          <>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-brand-blue focus:outline-none"
            />
            <div className="mt-3 flex gap-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-xl bg-[#25D366] py-2.5 text-center text-sm font-bold text-white hover:opacity-90"
              >
                📲 Send on WhatsApp
              </a>
              <button
                onClick={copy}
                className="rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:border-brand-blue"
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
