const variants = {
  primary: 'bg-brand-navy text-white hover:bg-blue-900 disabled:bg-slate-400',
  secondary: 'bg-brand-sky text-brand-navy hover:bg-sky-100 disabled:text-slate-400',
  ghost: 'bg-transparent text-brand-navy hover:bg-slate-100',
};

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-1 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
