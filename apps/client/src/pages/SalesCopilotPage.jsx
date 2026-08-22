import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatWidget from '../components/salescopilot/ChatWidget.jsx';

export default function SalesCopilotPage() {
  const location = useLocation();
  const navigate = useNavigate();
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
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Sales & Growth Copilot</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ask in English, हिन्दी or తెలుగు — every answer is built only from your real Paytm data.
        </p>
      </div>
      <ChatWidget initialQuestion={initialQuestion} />
    </div>
  );
}
