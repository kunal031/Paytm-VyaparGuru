const styles = {
  fast: { label: 'Fast', icon: '⚡', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  slow: { label: 'Slow', icon: '🐢', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  dead: { label: 'Dead', icon: '🧊', className: 'bg-red-50 text-red-700 border-red-200' },
};

export default function StockBadge({ classification }) {
  const style = styles[classification] ?? styles.slow;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${style.className}`}
    >
      <span aria-hidden>{style.icon}</span>
      {style.label}
    </span>
  );
}
