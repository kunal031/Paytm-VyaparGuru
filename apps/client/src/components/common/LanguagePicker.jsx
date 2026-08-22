import { useState, useRef, useEffect } from 'react';
import { useI18n, LANGUAGES } from '../../i18n/LanguageContext.jsx';

/** 🌐 Universal language switcher — changes UI language across the whole app. */
export default function LanguagePicker() {
  const { lang, setLang, translating } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Change app language"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
      >
        <span aria-hidden>🌐</span>
        <span className="hidden sm:inline">{translating ? '…' : current.native}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 max-h-72 w-40 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
                l.code === lang ? 'font-bold text-brand-navy' : 'text-slate-700'
              }`}
            >
              {l.native}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
