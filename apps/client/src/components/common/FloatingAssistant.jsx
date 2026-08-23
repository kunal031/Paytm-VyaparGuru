import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, apiRequest } from '../../services/apiClient.js';
import { useI18n } from '../../i18n/LanguageContext.jsx';

/**
 * VyaparGuru Assistant — a floating voice assistant present on every screen.
 * Tap the mic, speak in any supported language; it answers about the
 * merchant's data or the app itself, out loud (browser TTS) and in text.
 */
export default function FloatingAssistant() {
  const { t, lang, language } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | listening | thinking
  const [exchanges, setExchanges] = useState([]);
  const [input, setInput] = useState('');
  const [speak, setSpeak] = useState(true);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [exchanges, phase]);

  const speakOut = (text) => {
    if (!speak || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text.replace(/₹/g, ' rupees ').replace(/[•→]/g, ', '));
    utterance.lang = language.tts || 'en-IN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const refreshData = () => {
    // Assistant actions touch inventory, billing, customers and the dashboard
    ['inventory', 'billing', 'customers', 'dashboard', 'cashflow'].forEach((key) =>
      qc.invalidateQueries({ queryKey: [key] })
    );
  };

  const pushAnswer = (question, data) => {
    setExchanges((prev) => [
      ...prev,
      { question, answer: data.answer, transcript: data.transcript, proposal: data.proposal ?? null },
    ]);
    speakOut(data.answer);
    if (data.executed) refreshData();
  };

  const confirmProposal = async (idx, proposal) => {
    setPhase('thinking');
    try {
      if (proposal.kind === 'create_bill') {
        const { bill } = await apiRequest(apiClient.post('/billing/bills', proposal.payload));
        setExchanges((prev) =>
          prev.map((x, i) => (i === idx ? { ...x, proposal: null } : x)).concat({
            question: '✅ Confirm',
            answer: `🧾 Bill ${bill.billNo} created — ₹${(bill.total / 100).toLocaleString('en-IN')} (${bill.paymentMode}). Find it in Billing → Register.`,
          })
        );
        refreshData();
      }
    } catch (err) {
      setExchanges((prev) => [...prev, { question: '✅ Confirm', answer: `⚠️ ${err.message}` }]);
    } finally {
      setPhase('idle');
    }
  };

  const cancelProposal = (idx) => {
    setExchanges((prev) => prev.map((x, i) => (i === idx ? { ...x, proposal: null } : x)));
  };

  const askText = async (question) => {
    const q = (question ?? input).trim();
    if (!q || phase === 'thinking') return;
    setInput('');
    setPhase('thinking');
    try {
      const data = await apiRequest(
        apiClient.post('/sales/ask', { question: q, language: lang }, { timeout: 120_000 })
      );
      pushAnswer(q, data);
    } catch (err) {
      setExchanges((prev) => [...prev, { question: q, answer: `⚠️ ${err.message}` }]);
    } finally {
      setPhase('idle');
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setPhase('thinking');
        try {
          const form = new FormData();
          form.append('audio', new File([blob], 'question.webm', { type: blob.type }));
          form.append('language', lang);
          const data = await apiRequest(
            apiClient.post('/sales/ask/voice', form, { timeout: 180_000 })
          );
          pushAnswer('🎙️', data);
        } catch (err) {
          setExchanges((prev) => [...prev, { question: '🎙️', answer: `⚠️ ${err.message}` }]);
        } finally {
          setPhase('idle');
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setPhase('listening');
    } catch {
      setExchanges((prev) => [
        ...prev,
        { question: '🎙️', answer: '⚠️ Microphone unavailable — type your question instead.' },
      ]);
    }
  };

  const stopListening = () => {
    mediaRecorderRef.current?.stop();
  };

  const micTap = () => {
    if (phase === 'listening') stopListening();
    else if (phase === 'idle') startListening();
  };

  return (
    <>
      {/* Floating launcher — bottom-right on every screen */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={t('assistant.title')}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy text-2xl text-white shadow-xl transition hover:scale-105 md:bottom-6 md:right-6"
      >
        {open ? '✕' : '🎙️'}
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 z-30 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:bottom-24 md:right-6">
          <div className="flex items-center justify-between bg-brand-navy px-4 py-2.5 text-white">
            <p className="text-sm font-bold">🤖 {t('assistant.title')}</p>
            <button
              onClick={() => setSpeak((s) => !s)}
              className="rounded px-1.5 text-sm"
              title="Voice replies on/off"
            >
              {speak ? '🔊' : '🔇'}
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {exchanges.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                <p>{t('assistant.hint')}</p>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Try: “20 packet Parle-G aaye, 30 rupaye wale” · “Ramu ne 50 rupaye diye” ·
                  “2 Maggi ka bill banao” · “How were my sales?”
                </p>
              </div>
            )}
            {exchanges.map((x, i) => (
              <div key={i} className="space-y-1.5">
                <p className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-brand-navy px-3 py-1.5 text-xs text-white">
                  {x.transcript ? `🎙️ “${x.transcript}”` : x.question}
                </p>
                <p className="w-fit max-w-[90%] whitespace-pre-wrap rounded-xl rounded-bl-sm bg-slate-100 px-3 py-2 text-xs text-slate-800">
                  {x.answer}
                </p>
                {x.proposal && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmProposal(i, x.proposal)}
                      disabled={phase === 'thinking'}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      ✅ Confirm
                    </button>
                    <button
                      onClick={() => cancelProposal(i)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
            {phase === 'thinking' && (
              <p className="w-fit animate-pulse rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-400">
                {t('assistant.thinking')}
              </p>
            )}
          </div>

          <div className="border-t border-slate-200 p-2.5">
            <button
              onClick={micTap}
              disabled={phase === 'thinking'}
              className={`mb-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                phase === 'listening'
                  ? 'animate-pulse bg-red-600 text-white'
                  : 'bg-brand-sky text-brand-navy hover:bg-brand-blue/20 disabled:opacity-50'
              }`}
            >
              {phase === 'listening' ? `⏺ ${t('assistant.listening')}` : '🎙️ Tap & speak'}
            </button>
            <div className="flex gap-1.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && askText()}
                placeholder={t('assistant.placeholder')}
                disabled={phase !== 'idle'}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-brand-blue focus:outline-none"
              />
              <button
                onClick={() => askText()}
                disabled={phase !== 'idle' || !input.trim()}
                className="rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white disabled:bg-slate-300"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
