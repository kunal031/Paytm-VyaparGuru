/**
 * Vector visual language for the Team Inertia pitch deck.
 * Everything here is inline SVG / CSS — no images, no external assets.
 */

/* ---------------------------------- icons ---------------------------------- */

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const Icon = {
  receipt: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path {...stroke} d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3z" />
      <path {...stroke} d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  ),
  ledger: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path {...stroke} d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" />
      <path {...stroke} d="M5 4v13a3 3 0 0 0 3 3M12 9h4M12 13h4" />
    </svg>
  ),
  box: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path {...stroke} d="M3 8l9-5 9 5v8l-9 5-9-5V8z" />
      <path {...stroke} d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  ),
  chart: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path {...stroke} d="M4 20V4M4 20h16" />
      <path {...stroke} d="M7 15l4-5 3 3 5-7" />
    </svg>
  ),
  mic: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <rect {...stroke} x="9" y="3" width="6" height="11" rx="3" />
      <path {...stroke} d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  ),
  globe: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <circle {...stroke} cx="12" cy="12" r="9" />
      <path {...stroke} d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
    </svg>
  ),
  person: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <circle {...stroke} cx="12" cy="8" r="4" />
      <path {...stroke} d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  ),
  rupee: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path {...stroke} d="M7 4h10M7 8h10M7 4c6 0 6 7 0 7l7 9" />
    </svg>
  ),
  alert: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path {...stroke} d="M12 3L2 21h20L12 3z" />
      <path {...stroke} d="M12 10v5M12 18v.5" />
    </svg>
  ),
  phone: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <rect {...stroke} x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path {...stroke} d="M10.5 18.5h3" />
    </svg>
  ),
  spark: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path {...stroke} d="M12 2l2.2 6.4L21 10l-6.8 1.6L12 18l-2.2-6.4L3 10l6.8-1.6L12 2z" />
    </svg>
  ),
  bank: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path {...stroke} d="M3 9l9-6 9 6H3zM5 9v9M12 9v9M19 9v9M3 20h18" />
    </svg>
  ),
  clock: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <circle {...stroke} cx="12" cy="12" r="9" />
      <path {...stroke} d="M12 7v5l3.5 2" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path {...stroke} d="M4 12.5l5 5L20 6.5" />
    </svg>
  ),
  cross: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path {...stroke} d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  chat: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <path {...stroke} d="M4 5h16v11H9l-5 4V5z" />
      <path {...stroke} d="M8 9h8M8 12.5h5" />
    </svg>
  ),
};

/* ------------------------------ building blocks ---------------------------- */

/** Horizontal flow of steps with arrows — used for "how people cope today" and tech pipelines. */
export function FlowRow({ steps, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-300 bg-white text-slate-700',
    navy: 'border-brand-blue/40 bg-brand-sky text-brand-navy',
    red: 'border-red-200 bg-red-50 text-red-800',
  };
  return (
    <div className="flex flex-wrap items-stretch justify-center gap-y-3">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center">
          <div className={`flex min-h-[64px] w-36 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center ${tones[tone]}`}>
            {s.icon && <s.icon.type {...s.icon.props} className="mb-1 h-5 w-5 opacity-70" />}
            <p className="text-[13px] font-bold leading-tight">{s.label}</p>
            {s.sub && <p className="mt-0.5 text-[10px] leading-tight opacity-70">{s.sub}</p>}
          </div>
          {i < steps.length - 1 && (
            <svg viewBox="0 0 24 24" className="mx-1 h-5 w-5 shrink-0 text-slate-400">
              <path {...stroke} d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

/** The gap moment: what existing tools solve vs what stays unsolved. */
export function GapPanels({ solves, misses }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-emerald-700">
          <Icon.check className="h-4 w-4" /> What existing tools solve
        </p>
        <ul className="space-y-2">
          {solves.map((s, i) => (
            <li key={i} className="flex gap-2 text-[15px] text-emerald-900">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-red-700">
          <Icon.cross className="h-4 w-4" /> What stays unsolved
        </p>
        <ul className="space-y-2">
          {misses.map((s, i) => (
            <li key={i} className="flex gap-2 text-[15px] text-red-900">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Before → After outcome strip shown after each demo. */
export function BeforeAfter({ before, after }) {
  return (
    <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
      <div className="flex-1 rounded-xl border border-slate-300 bg-slate-100 p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Before</p>
        <p className="mt-1 text-sm text-slate-700">{before}</p>
      </div>
      <svg viewBox="0 0 24 24" className="mx-auto h-7 w-7 shrink-0 rotate-90 text-brand-blue md:rotate-0">
        <path {...stroke} d="M4 12h15M13 5l7 7-7 7" strokeWidth="2.4" />
      </svg>
      <div className="flex-1 rounded-xl border border-brand-blue/50 bg-brand-sky p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-brand-blue">After — Team Inertia</p>
        <p className="mt-1 text-sm font-medium text-brand-navy">{after}</p>
      </div>
    </div>
  );
}

/** Impact chain: problem solved → cascading outcomes. */
export function ImpactChain({ items }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center">
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              i === 0 ? 'bg-brand-navy text-white' : 'border border-brand-blue/50 bg-white text-brand-navy'
            }`}
          >
            {it}
          </span>
          {i < items.length - 1 && (
            <svg viewBox="0 0 24 24" className="mx-1.5 h-4 w-4 text-brand-blue">
              <path {...stroke} d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- scene visuals ------------------------------ */

/** Overall context: one merchant, five disconnected record-keeping tools. */
export function ChaosVisual() {
  const sat = [
    { x: 60, y: 40, label: 'Bill book', I: Icon.receipt },
    { x: 460, y: 36, label: 'Khata app', I: Icon.ledger },
    { x: 505, y: 165, label: 'Bank SMS', I: Icon.bank },
    { x: 45, y: 165, label: 'Stock register', I: Icon.box },
    { x: 270, y: 14, label: 'Memory', I: Icon.alert },
  ];
  return (
    <svg viewBox="0 0 600 285" className="mx-auto w-full max-w-2xl">
      {sat.map((s, i) => (
        <g key={i}>
          <path
            d={`M300 145 Q ${(300 + s.x) / 2 + (i % 2 ? 40 : -40)} ${(145 + s.y) / 2} ${s.x + 40} ${s.y + 26}`}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.6"
            strokeDasharray="5 5"
          />
          <rect x={s.x} y={s.y} width="86" height="50" rx="12" fill="white" stroke="#cbd5e1" strokeWidth="1.5" />
          <s.I x={s.x + 33} y={s.y + 6} width="20" height="20" color="#64748b" />
          <text x={s.x + 43} y={s.y + 42} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#475569">
            {s.label}
          </text>
        </g>
      ))}
      <circle cx="300" cy="145" r="46" fill="#E6F7FE" stroke="#00B9F1" strokeWidth="2" />
      <Icon.person x={281} y={118} width="38" height="38" color="#012B72" />
      <text x="300" y="180" textAnchor="middle" fontSize="12" fontWeight="800" fill="#012B72">
        Merchant
      </text>
      <text x="300" y="272" textAnchor="middle" fontSize="13" fontWeight="700" fill="#dc2626">
        Five sources of truth. No complete picture. Every evening: manual reconciliation.
      </text>
    </svg>
  );
}

/** Stylised forecast line with festival marker + confidence band. */
export function ForecastVisual() {
  return (
    <svg viewBox="0 0 560 200" className="mx-auto w-full max-w-xl">
      <path d="M40 170 h490" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M40 170 V20" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M40 120 C 120 100, 170 135, 240 110 S 380 95, 420 60 S 500 45, 520 55 L 520 150 C 460 140, 380 165, 300 155 S 120 150, 40 145 Z" fill="#00B9F1" opacity="0.13" />
      <path d="M40 132 C 120 118, 170 145, 240 130 S 380 120, 420 85 S 500 70, 520 78" fill="none" stroke="#94a3b8" strokeWidth="2.2" />
      <path d="M420 85 S 500 70, 520 78" fill="none" stroke="#00B9F1" strokeWidth="3" />
      <line x1="420" y1="30" x2="420" y2="170" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="6 4" />
      <rect x="386" y="14" width="68" height="20" rx="10" fill="#fef3c7" stroke="#f59e0b" />
      <text x="420" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#92400e">🎉 Onam</text>
      <text x="90" y="192" fontSize="11" fill="#64748b">history — this shop's own sales</text>
      <text x="430" y="192" fontSize="11" fontWeight="700" fill="#0369a1">30-day forecast</text>
      <text x="472" y="120" fontSize="10" fill="#0284c7">confidence band</text>
    </svg>
  );
}

/** Shelf with a stockout slot + frozen-cash boxes. */
export function ShelfVisual() {
  return (
    <svg viewBox="0 0 560 210" className="mx-auto w-full max-w-xl">
      {[0, 1].map((row) => (
        <path key={row} d={`M60 ${95 + row * 80} h440`} stroke="#94a3b8" strokeWidth="3" />
      ))}
      {[70, 130, 190, 250].map((x, i) => (
        <rect key={i} x={x} y={55} width="48" height="38" rx="6" fill="#E6F7FE" stroke="#00B9F1" strokeWidth="1.6" />
      ))}
      <rect x="310" y="55" width="48" height="38" rx="6" fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="5 4" />
      <text x="334" y="79" textAnchor="middle" fontSize="16" fontWeight="800" fill="#dc2626">?</text>
      <rect x="378" y="40" width="132" height="24" rx="12" fill="#fee2e2" stroke="#dc2626" />
      <text x="444" y="56" textAnchor="middle" fontSize="11" fontWeight="700" fill="#b91c1c">out 2 days before Onam</text>
      {[70, 130].map((x, i) => (
        <g key={i}>
          <rect x={x} y={135} width="48" height="38" rx="6" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.6" />
          <text x={x + 24} y={159} textAnchor="middle" fontSize="14">🧊</text>
        </g>
      ))}
      <rect x="190" y="142" width="150" height="24" rx="12" fill="#fef9c3" stroke="#ca8a04" />
      <text x="265" y="158" textAnchor="middle" fontSize="11" fontWeight="700" fill="#854d0e">₹33,000 frozen as dead stock</text>
      <text x="280" y="200" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#475569">
        The shelf tells you what IS. Never what WILL happen.
      </text>
    </svg>
  );
}

/** Language barrier: dashboards speak English, merchants think in 11 scripts. */
export function LanguageVisual() {
  const scripts = ['हिं', 'বা', 'த', 'తె', 'म', 'ગુ', 'ಕ', 'മ', 'ਪੰ', 'ଓ'];
  return (
    <svg viewBox="0 0 560 210" className="mx-auto w-full max-w-xl">
      <rect x="40" y="30" width="200" height="130" rx="12" fill="white" stroke="#cbd5e1" strokeWidth="1.6" />
      <rect x="40" y="30" width="200" height="26" rx="12" fill="#f1f5f9" />
      <text x="140" y="48" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">ANALYTICS DASHBOARD</text>
      <text x="58" y="84" fontSize="10" fill="#94a3b8">REVENUE ▮▮▮  ·  MoM GROWTH %</text>
      <text x="58" y="104" fontSize="10" fill="#94a3b8">SKU VELOCITY  ·  CHURN COHORTS</text>
      <text x="58" y="124" fontSize="10" fill="#94a3b8">ENGLISH ONLY  ·  TYPE TO QUERY</text>
      <text x="140" y="185" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#dc2626">built for analysts</text>
      <path d="M258 95 h44" stroke="#dc2626" strokeWidth="2.4" strokeDasharray="6 5" />
      <path d="M296 88 l8 7 -8 7" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="400" cy="95" r="52" fill="#E6F7FE" stroke="#00B9F1" strokeWidth="2" />
      <Icon.person x={380} y={66} width="40" height="40" color="#012B72" />
      {scripts.map((s, i) => {
        const a = (i / scripts.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <text key={i} x={400 + Math.cos(a) * 78} y={100 + Math.sin(a) * 78} textAnchor="middle" fontSize="15" fontWeight="700" fill="#0369a1">
            {s}
          </text>
        );
      })}
      <text x="400" y="185" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#0369a1">thinks & speaks in 11 languages</text>
    </svg>
  );
}

/** Honest copilot architecture — matches the actual agent implementation. */
export function AIArchVisual() {
  const Box = ({ x, y, w, title, sub1, sub2, accent }) => (
    <g>
      <rect x={x} y={y} width={w} height="62" rx="10" fill={accent ? '#012B72' : 'white'} stroke={accent ? '#012B72' : '#00B9F1'} strokeWidth="1.6" />
      <text x={x + w / 2} y={y + 22} textAnchor="middle" fontSize="12" fontWeight="800" fill={accent ? 'white' : '#012B72'}>{title}</text>
      <text x={x + w / 2} y={y + 38} textAnchor="middle" fontSize="9" fill={accent ? '#bae6fd' : '#64748b'}>{sub1}</text>
      <text x={x + w / 2} y={y + 51} textAnchor="middle" fontSize="9" fill={accent ? '#bae6fd' : '#64748b'}>{sub2}</text>
    </g>
  );
  const A = ({ d }) => <path d={d} fill="none" stroke="#00B9F1" strokeWidth="2" markerEnd="url(#ah)" />;
  return (
    <svg viewBox="0 0 760 310" className="mx-auto w-full max-w-3xl">
      <defs>
        <marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill="#00B9F1" />
        </marker>
      </defs>
      <Box x={20} y={20} w={175} title="Merchant asks" sub1="voice (Saarika / Whisper STT)" sub2="or text · any of 11 languages" accent />
      <A d="M195 51 h32" />
      <Box x={230} y={20} w={165} title="Intent classifier" sub1="keyword rules first (0 ms)" sub2="LLM only as fallback" />
      <A d="M395 51 h32" />
      <Box x={430} y={20} w={160} title="Command or question?" sub1="actions: add stock, khata" sub2="payment, bill (with confirm)" />
      <A d="M510 82 v34" />
      <Box x={430} y={118} w={160} title="Data retrieval" sub1="live business APIs: sales," sub2="stock, khata, forecast" />
      <A d="M510 180 v34" />
      <Box x={430} y={216} w={160} title="Analysis in code" sub1="deltas · stockout overlap" sub2="₹ pre-formatted, no LLM math" />
      <A d="M430 247 h-33" />
      <Box x={230} y={216} w={165} title="Sarvam LLM narrates" sub1="answers directly in the" sub2="merchant's language" />
      <A d="M230 247 h-33" />
      <Box x={20} y={216} w={175} title="Answer + voice reply" sub1="grounded in real numbers" sub2="intent badge always shown" accent />
      <rect x={624} y={100} width={118} height={110} rx="12" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
      <text x={683} y={125} textAnchor="middle" fontSize="11" fontWeight="800" fill="#166534">GUARANTEE</text>
      <text x={683} y={146} textAnchor="middle" fontSize="9" fill="#166534">every number is</text>
      <text x={683} y={159} textAnchor="middle" fontSize="9" fill="#166534">computed by code —</text>
      <text x={683} y={172} textAnchor="middle" fontSize="9" fill="#166534">the model only</text>
      <text x={683} y={185} textAnchor="middle" fontSize="9" fill="#166534">narrates it</text>
    </svg>
  );
}

/** Overall business impact tree. */
export function ImpactTree() {
  const cols = [
    { title: 'MERCHANT', tone: 'border-brand-blue/50 bg-brand-sky text-brand-navy', items: ['Billing in seconds, zero math errors', 'Evening reconciliation → one glance', 'Stockouts prevented before festivals', 'Udhaar recovered politely', 'Insights in their own language'] },
    { title: 'BUSINESS', tone: 'border-emerald-300 bg-emerald-50 text-emerald-900', items: ['Every sale becomes clean data', 'Ground-truth SKU attribution', 'Customers segmented & retained', 'Hidden charges surfaced', 'Verified cash-flow history'] },
    { title: 'PLATFORM', tone: 'border-indigo-300 bg-indigo-50 text-indigo-900', items: ['Daily-habit engagement', 'Data imported from 12 rival tools', 'Voice-first → wider reach', 'Rails for credit & commerce', 'Scales across 11 languages'] },
  ];
  return (
    <div>
      <div className="mx-auto mb-2 w-fit rounded-full bg-brand-navy px-6 py-2 text-lg font-extrabold text-white">TEAM INERTIA</div>
      <svg viewBox="0 0 600 34" className="mx-auto mb-1 w-full max-w-2xl">
        <path d="M300 2 v10 M300 12 H100 V32 M300 12 h200 v20 M300 12 v20" fill="none" stroke="#00B9F1" strokeWidth="2" />
      </svg>
      <div className="grid gap-4 md:grid-cols-3">
        {cols.map((c) => (
          <div key={c.title} className={`rounded-2xl border p-4 ${c.tone}`}>
            <p className="mb-2 text-center text-sm font-extrabold tracking-widest">{c.title}</p>
            <ul className="space-y-1.5">
              {c.items.map((it, i) => (
                <li key={i} className="flex gap-2 text-[13.5px]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Future roadmap: today → near term → long term. */
export function RoadmapVisual() {
  const stops = [
    { label: 'TODAY', sub: 'Billing · khata · inventory foresight · customer intelligence · 11-language voice AI', tone: 'fill-brand' },
    { label: 'NEAR TERM', sub: 'Live Paytm txn feed · OAuth sync (Zoho, Shopify) · WhatsApp invoices & daily digest · barcode billing · offline-first PWA' },
    { label: 'LONG TERM', sub: 'Cash-flow-verified merchant credit · supplier reordering marketplace · ONDC storefront · multi-store chains' },
    { label: 'VISION', sub: 'The operating system for 60 million Indian small businesses' },
  ];
  return (
    <div className="relative mx-auto max-w-3xl">
      <div className="absolute left-4 top-3 h-[calc(100%-24px)] w-1 rounded bg-gradient-to-b from-brand-blue to-brand-navy md:left-1/2 md:-ml-0.5" />
      <div className="space-y-5">
        {stops.map((s, i) => (
          <div key={s.label} className={`relative flex md:w-1/2 ${i % 2 ? 'md:ml-auto md:pl-8' : 'md:pr-8 md:text-right'} pl-12 md:pl-0`}>
            <span className={`absolute left-2.5 top-2 h-4 w-4 rounded-full border-4 border-white shadow md:left-auto ${i % 2 ? 'md:-left-2' : 'md:-right-2'} ${i === 0 ? 'bg-brand-blue' : 'bg-brand-navy'}`} />
            <div className={`w-full rounded-xl border p-3.5 ${i === 0 ? 'border-brand-blue/60 bg-brand-sky' : 'border-slate-200 bg-white'}`}>
              <p className="text-sm font-extrabold tracking-wide text-brand-navy">{s.label}</p>
              <p className="mt-0.5 text-[13px] text-slate-600">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
