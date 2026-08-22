import ChatWidget from '../components/salescopilot/ChatWidget.jsx';

export default function SalesCopilotPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Sales & Growth Copilot</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ask in English, हिन्दी or తెలుగు — every answer is built only from your real Paytm data.
        </p>
      </div>
      <ChatWidget />
    </div>
  );
}
