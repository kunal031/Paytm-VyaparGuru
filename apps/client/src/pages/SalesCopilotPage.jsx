import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatWidget from '../components/salescopilot/ChatWidget.jsx';
import { useI18n } from '../i18n/LanguageContext.jsx';

export default function SalesCopilotPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  // Capture once so clearing the history state below doesn't lose the question
  const [initialQuestion] = useState(() => location.state?.question ?? null);

  // Clear the handed-over question from history so a page reload doesn't re-send it
  useEffect(() => {
    if (location.state?.question) {
      navigate('.', { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('copilot.title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('copilot.subtitle')}</p>
      </div>
      <ChatWidget initialQuestion={initialQuestion} />
    </div>
  );
}
