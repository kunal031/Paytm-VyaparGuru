import { useState } from 'react';
import BillCounter from '../components/billing/BillCounter.jsx';
import RegisterTab from '../components/billing/RegisterTab.jsx';
import KhataTab from '../components/billing/KhataTab.jsx';
import { useI18n } from '../i18n/LanguageContext.jsx';

const TABS = [
  { id: 'counter', key: 'billing.newBill', fallback: '🧾 New Bill' },
  { id: 'register', key: 'billing.register', fallback: '📋 Register' },
  { id: 'khata', key: 'billing.khata', fallback: '📒 Khata' },
];

export default function BillingPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState('counter');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('billing.title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('billing.subtitle')}</p>
      </div>

      <div className="flex gap-2">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === tb.id ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {t(tb.key)}
          </button>
        ))}
      </div>

      {tab === 'counter' && <BillCounter />}
      {tab === 'register' && <RegisterTab />}
      {tab === 'khata' && <KhataTab />}
    </div>
  );
}
