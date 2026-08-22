import { useEffect, useRef, useState } from 'react';
import { useAskCopilot, useAskCopilotVoice } from '../../features/sales/salesApi.js';

const LANGUAGES = [
  { id: 'en', label: 'English', tts: 'en-IN' },
  { id: 'hi', label: 'हिन्दी', tts: 'hi-IN' },
  { id: 'te', label: 'తెలుగు', tts: 'te-IN' },
];

const SUGGESTIONS = [
  'How were my sales this week?',
  'What are my top products?',
  'Why did my sales drop?',
  'When did items go out of stock?',
  "What's my forecast for next month?",
];

function Bubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? 'rounded-br-md bg-brand-navy text-white'
            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
        }`}
      >
        {message.transcript && (
          <p className="mb-1 text-xs italic opacity-70">🎙️ “{message.transcript}”</p>
        )}
        {message.text}
        {message.meta && (
          <p className="mt-1.5 text-[10px] uppercase tracking-wide text-slate-400">
            {message.meta.intent} · {message.meta.answerSource === 'llm' ? 'AI' : 'local'}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Namaste! I'm your Sales & Growth Copilot. Ask me about your sales, top products, stockouts, or the month ahead — type or hold the mic.",
    },
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('en');
  const [speak, setSpeak] = useState(false);
  const [recording, setRecording] = useState(false);
  const listRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const askText = useAskCopilot();
  const askVoice = useAskCopilotVoice();
  const busy = askText.isPending || askVoice.isPending;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const speakAnswer = (text) => {
    if (!speak || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text.replace(/₹/g, ' rupees '));
    utterance.lang = LANGUAGES.find((l) => l.id === language)?.tts || 'en-IN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleAnswer = (data, userMessage) => {
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        role: 'assistant',
        text: data.answer,
        meta: { intent: data.intent, answerSource: data.meta?.answerSource },
        transcript: data.transcript,
      },
    ]);
    speakAnswer(data.answer);
  };

  const send = (question) => {
    const q = (question ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    askText.mutate(
      { question: q, language },
      {
        onSuccess: (data) =>
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: data.answer,
              meta: { intent: data.intent, answerSource: data.meta?.answerSource },
            },
          ]) || speakAnswer(data.answer),
        onError: (err) =>
          setMessages((prev) => [...prev, { role: 'assistant', text: `⚠️ ${err.message}` }]),
      }
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], 'question.webm', { type: blob.type });
        askVoice.mutate(
          { file, language },
          {
            onSuccess: (data) => handleAnswer(data, { role: 'user', text: '🎙️ (voice question)' }),
            onError: (err) =>
              setMessages((prev) => [...prev, { role: 'assistant', text: `⚠️ ${err.message}` }]),
          }
        );
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: '⚠️ Microphone unavailable — please type your question instead.' },
      ]);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[420px] flex-col rounded-xl border border-slate-200 bg-slate-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 rounded-t-xl">
        <div className="flex gap-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => setLanguage(l.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                language === l.id ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSpeak((s) => !s)}
          title="Read answers aloud"
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            speak ? 'bg-brand-sky text-brand-navy' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {speak ? '🔊 Voice on' : '🔇 Voice off'}
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-400">
              <span className="animate-pulse">Analyzing your data…</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={busy}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-brand-blue hover:text-brand-navy"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-slate-200 bg-white p-3 rounded-b-xl">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={busy}
          title={recording ? 'Stop recording' : 'Ask by voice'}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
            recording ? 'animate-pulse bg-red-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
          }`}
        >
          {recording ? '■' : '🎙️'}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={
            language === 'hi'
              ? 'अपने बिज़नेस के बारे में पूछें…'
              : language === 'te'
                ? 'మీ వ్యాపారం గురించి అడగండి…'
                : 'Ask about your business…'
          }
          disabled={busy || recording}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
        />
        <button
          onClick={() => send()}
          disabled={busy || !input.trim()}
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          Send
        </button>
      </div>
    </div>
  );
}
