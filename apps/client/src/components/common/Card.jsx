/**
 * Card with optional `info` tooltip: hovering the ⓘ (or the title) explains
 * what the card shows, in the app's selected language.
 */
export default function Card({ title, info, className = '', children }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}>
      {title && (
        <div className="group relative mb-3 flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-slate-500">{title}</h3>
          {info && (
            <>
              <span
                aria-label={info}
                className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500"
              >
                i
              </span>
              <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-64 rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white shadow-lg group-hover:block">
                {info}
              </span>
            </>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
