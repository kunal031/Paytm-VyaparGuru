import { useEffect, useState } from 'react';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Loader from '../components/common/Loader.jsx';
import { apiClient, apiRequest } from '../services/apiClient.js';
import { useAuthStore } from '../store/authStore.js';
import { useI18n } from '../i18n/LanguageContext.jsx';
import { formatDate } from '../utils/format.js';

export default function TeamPage() {
  const { t } = useI18n();
  const merchant = useAuthStore((s) => s.merchant);
  const [staff, setStaff] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [isStaff, setIsStaff] = useState(false);

  const load = async () => {
    try {
      const data = await apiRequest(apiClient.get('/auth/staff'));
      setStaff(data.staff);
      setIsStaff(false);
    } catch (err) {
      if (/only the owner/i.test(err.message)) setIsStaff(true);
      else setError(err.message);
      setStaff([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addStaff = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest(apiClient.post('/auth/staff', form));
      setForm({ name: '', email: '', password: '' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await apiRequest(apiClient.delete(`/auth/staff/${id}`));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">👥 {t('team.title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('team.subtitle')}</p>
      </div>

      {isStaff && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">🔒 {t('team.staffNote')}</p>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {!isStaff && (
        <>
          <Card
            title={t('team.add')}
            info={t('team.subtitle')}
          >
            <form onSubmit={addStaff} className="grid gap-3 sm:grid-cols-4">
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('team.name')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={t('team.email')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={t('team.password')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
              <Button type="submit" disabled={busy}>
                {busy ? '…' : `+ ${t('team.add')}`}
              </Button>
            </form>
          </Card>

          {staff === null ? (
            <Loader label={t('common.loading')} />
          ) : (
            <Card title={`${merchant?.businessName} — staff (${staff.length})`}>
              {staff.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  No staff accounts yet — add one above. They log in with their email and password.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {staff.map((s) => (
                    <li key={s._id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{s.ownerName}</p>
                        <p className="text-xs text-slate-400">
                          {s.email} · since {formatDate(s.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(s._id)}
                        disabled={busy}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        {t('team.remove')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
