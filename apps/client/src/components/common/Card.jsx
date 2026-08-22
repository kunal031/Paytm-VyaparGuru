export default function Card({ title, className = '', children }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}>
      {title && <h3 className="mb-3 text-sm font-semibold text-slate-500">{title}</h3>}
      {children}
    </div>
  );
}
