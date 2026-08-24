import { useCallback, useEffect, useState } from 'react';
import { slides } from '../pitch/pitchSlides.jsx';

/**
 * Team Inertia presentation deck — /pitch
 * Keyboard: ← → (or Space) to navigate, F for fullscreen, Esc to exit.
 * Position is kept in the URL hash so returning from a live-demo tab
 * (demo links open in a new tab) never loses your place.
 */
export default function PitchPage() {
  const readHash = () => {
    const n = Number((window.location.hash || '').replace('#', ''));
    return Number.isInteger(n) && n >= 1 && n <= slides.length ? n - 1 : 0;
  };
  const [index, setIndex] = useState(readHash);

  const go = useCallback(
    (delta) => {
      setIndex((i) => {
        const next = Math.min(slides.length - 1, Math.max(0, i + delta));
        window.location.hash = String(next + 1);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Home') {
        setIndex(0);
        window.location.hash = '1';
      } else if (e.key.toLowerCase() === 'f') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      }
    };
    const onHash = () => setIndex(readHash());
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
    };
  }, [go]);

  const slide = slides[index];
  const progress = ((index + 1) / slides.length) * 100;

  return (
    <div
      className={`flex min-h-screen flex-col ${
        slide.dark ? 'bg-gradient-to-br from-brand-navy via-[#02368f] to-[#0a5bb5]' : 'bg-slate-50'
      }`}
    >
      {/* progress */}
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-black/10">
        <div className="h-full bg-brand-blue transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* header chrome */}
      <div className="flex items-center justify-between px-6 pt-5">
        <p className={`text-xs font-extrabold uppercase tracking-widest ${slide.dark ? 'text-sky-200/70' : 'text-slate-400'}`}>
          {slide.section}
        </p>
        <p className={`text-xs font-semibold ${slide.dark ? 'text-sky-200/70' : 'text-slate-400'}`}>
          {index + 1} / {slides.length}
        </p>
      </div>

      {/* slide body */}
      <div key={index} className="pitch-slide mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-8 md:px-10">
        <div className="w-full">{slide.render()}</div>
      </div>

      {/* footer nav */}
      <div className="flex items-center justify-between px-6 pb-5">
        <p className={`text-[11px] ${slide.dark ? 'text-sky-200/50' : 'text-slate-400'}`}>
          ← → navigate · F fullscreen · Team Inertia — Paytm VyaparGuru
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            className={`h-9 w-9 rounded-full text-lg font-bold transition disabled:opacity-30 ${
              slide.dark ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-brand-navy shadow hover:shadow-md'
            }`}
          >
            ←
          </button>
          <button
            onClick={() => go(1)}
            disabled={index === slides.length - 1}
            className={`h-9 rounded-full px-4 text-sm font-bold transition disabled:opacity-30 ${
              slide.dark ? 'bg-brand-blue text-white hover:opacity-90' : 'bg-brand-navy text-white hover:opacity-90'
            }`}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
