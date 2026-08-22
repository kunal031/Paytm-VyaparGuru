import { useRef, useState } from 'react';
import Button from '../common/Button.jsx';
import Loader from '../common/Loader.jsx';
import { useOnboardPhoto, useOnboardVoice, useSaveSkus } from '../../features/inventory/inventoryApi.js';

const TABS = [
  { id: 'photo', label: '📷 Photo' },
  { id: 'voice', label: '🎙️ Voice' },
  { id: 'manual', label: '⌨️ Manual' },
];

const emptyRow = () => ({ name: '', category: '', priceINR: '', quantity: '', unit: 'pcs' });

/** Converts server drafts (paise) into editable rows (₹ strings). */
const toRows = (items) =>
  items.map((i) => ({
    name: i.name,
    category: i.category ?? '',
    priceINR: i.price != null ? String(i.price / 100) : '',
    quantity: i.currentStock != null ? String(i.currentStock) : '',
    unit: i.unit || 'pcs',
    createdVia: i.createdVia,
  }));

export default function OnboardModal({ open, onClose }) {
  const [tab, setTab] = useState('photo');
  const [rows, setRows] = useState(null); // null = capture step, array = review step
  const [note, setNote] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [missMessage, setMissMessage] = useState(null); // nothing caught — stay on capture step
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const photo = useOnboardPhoto();
  const voice = useOnboardVoice();
  const save = useSaveSkus();

  if (!open) return null;

  const busy = photo.isPending || voice.isPending;

  const reset = () => {
    setRows(null);
    setNote(null);
    setTranscript(null);
    setMissMessage(null);
    photo.reset();
    voice.reset();
    save.reset();
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleParsed = (data) => {
    // Nothing caught: stay on the capture step and explain, don't show an
    // empty review table
    if (!data.items?.length) {
      setMissMessage(
        (data.transcript
          ? `I heard: “${data.transcript}” — but couldn't identify any products.`
          : `I couldn't identify any products.`) +
          ' Try again: say the product name, quantity and price, e.g. “20 packet Parle-G, 30 rupaye wale”.'
      );
      return;
    }
    setMissMessage(null);
    setRows(toRows(data.items));
    setNote(data.note);
    if (data.transcript) setTranscript(data.transcript);
  };

  const handlePhotoFile = (file) => {
    if (file) photo.mutate(file, { onSuccess: handleParsed });
  };

  const handleAudioFile = (file) => {
    if (file) voice.mutate(file, { onSuccess: handleParsed });
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
        handleAudioFile(new File([blob], 'note.webm', { type: blob.type }));
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert('Microphone unavailable — upload an audio file instead.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const updateRow = (idx, key, value) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  const handleSave = () => {
    const items = rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        category: r.category.trim() || 'Other',
        price: r.priceINR !== '' ? Math.round(Number(r.priceINR) * 100) : null,
        currentStock: r.quantity !== '' ? Math.round(Number(r.quantity)) : null,
        unit: r.unit || 'pcs',
        createdVia: r.createdVia || (tab === 'manual' ? 'manual' : tab),
      }));
    if (!items.length) return;
    save.mutate(items, { onSuccess: close });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-brand-navy">Add Stock</h3>
          <button onClick={close} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        {rows === null ? (
          <>
            <div className="mb-4 flex gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    tab === t.id ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {busy && <Loader label={photo.isPending ? 'Reading your photo…' : 'Processing audio…'} />}
            {(photo.isError || voice.isError) && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {photo.error?.message || voice.error?.message}
              </p>
            )}
            {!busy && missMessage && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {missMessage}
              </p>
            )}

            {!busy && tab === 'photo' && (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-brand-blue">
                <span className="text-3xl">📷</span>
                <span className="text-sm font-medium text-slate-700">
                  Snap or upload a shelf / stock register photo
                </span>
                <span className="text-xs text-slate-400">Claude vision turns it into a SKU list you can review</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhotoFile(e.target.files?.[0])}
                />
              </label>
            )}

            {!busy && tab === 'voice' && (
              <div className="space-y-3">
                <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-8">
                  <span className="text-3xl">🎙️</span>
                  <p className="text-center text-sm text-slate-600">
                    Say it like you'd tell your munim: <br />
                    <em>"Aaj 20 packet Parle-G aaye, 30 rupaye wale…"</em>
                  </p>
                  {recording ? (
                    <Button onClick={stopRecording} className="!bg-red-600">
                      ■ Stop recording
                    </Button>
                  ) : (
                    <Button onClick={startRecording}>● Record</Button>
                  )}
                  <label className="cursor-pointer text-xs font-medium text-brand-blue hover:underline">
                    …or upload an audio file
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => handleAudioFile(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            )}

            {!busy && tab === 'manual' && (
              <div className="text-center">
                <Button onClick={() => setRows([emptyRow(), emptyRow(), emptyRow()])}>
                  Start with 3 empty rows
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {note && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{note}</p>
            )}
            {transcript && (
              <p className="mb-3 rounded-lg bg-brand-sky px-3 py-2 text-xs text-slate-700">
                Heard: “{transcript}”
              </p>
            )}
            <p className="mb-2 text-sm font-medium text-slate-600">
              Review before saving — fix names, prices (₹) and quantities:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-1 pr-2">Name</th>
                    <th className="py-1 pr-2">Category</th>
                    <th className="py-1 pr-2">₹ Price</th>
                    <th className="py-1 pr-2">Qty</th>
                    <th className="py-1">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      {['name', 'category', 'priceINR', 'quantity', 'unit'].map((key) => (
                        <td key={key} className={`py-1 ${key !== 'unit' ? 'pr-2' : ''}`}>
                          <input
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                            value={row[key]}
                            inputMode={key === 'priceINR' || key === 'quantity' ? 'decimal' : 'text'}
                            onChange={(e) => updateRow(idx, key, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
              className="mt-2 text-xs font-medium text-brand-blue hover:underline"
            >
              + Add row
            </button>

            {save.isError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {save.error.message}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={reset}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : `Save ${rows.filter((r) => r.name.trim()).length} SKUs`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
