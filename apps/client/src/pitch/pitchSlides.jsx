/**
 * Team Inertia — hackathon pitch deck content.
 * Every claim on these slides maps to real code in this repository;
 * nothing is invented. Structure per problem:
 *   PROBLEM → EXISTING SOLUTION → GAP → OUR SOLUTION (+tech) → LIVE DEMO → IMPACT
 */
import {
  Icon,
  FlowRow,
  GapPanels,
  BeforeAfter,
  ImpactChain,
  ChaosVisual,
  ForecastVisual,
  ShelfVisual,
  LanguageVisual,
  AIArchVisual,
  ImpactTree,
  RoadmapVisual,
} from './PitchVisuals.jsx';

/* ------------------------------ layout helpers ------------------------------ */

const Kicker = ({ children, dark }) => (
  <p className={`mb-3 text-sm font-extrabold uppercase tracking-[0.25em] ${dark ? 'text-brand-blue' : 'text-brand-blue'}`}>{children}</p>
);

const H = ({ children, dark, size = 'text-4xl md:text-5xl' }) => (
  <h2 className={`${size} font-extrabold leading-tight tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>{children}</h2>
);

const Lead = ({ children, dark }) => (
  <p className={`mt-4 max-w-3xl text-lg leading-relaxed ${dark ? 'text-sky-100/90' : 'text-slate-600'}`}>{children}</p>
);

const SectionLine = ({ children }) => (
  <p className="mx-auto mt-8 max-w-2xl text-center text-lg font-semibold text-brand-navy">{children}</p>
);

function StoryPoints({ points }) {
  return (
    <ul className="mt-5 space-y-3">
      {points.map(([label, text], i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 h-6 w-24 shrink-0 rounded-md bg-brand-sky text-center text-[11px] font-extrabold uppercase leading-6 tracking-wide text-brand-navy">
            {label}
          </span>
          <span className="text-[15.5px] leading-relaxed text-slate-700">{text}</span>
        </li>
      ))}
    </ul>
  );
}

function TechChips({ items }) {
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-2">
      {items.map((t) => (
        <span key={t} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          {t}
        </span>
      ))}
    </div>
  );
}

function DemoSteps({ steps, href, label }) {
  return (
    <div className="mt-2">
      <ol className="space-y-2.5">
        {steps.map(([action, why], i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-extrabold text-white">
              {i + 1}
            </span>
            <p className="text-[15px] leading-snug text-slate-700">
              <b className="text-slate-900">{action}</b>
              <span className="text-slate-500"> — {why}</span>
            </p>
          </li>
        ))}
      </ol>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-navy px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:scale-[1.02]"
      >
        ▶ Open live demo — {label}
      </a>
      <span className="ml-3 text-xs text-slate-400">opens in a new tab · deck keeps your place</span>
    </div>
  );
}

/* -------------------------------- act factory ------------------------------- */

function actSlides(n, meta) {
  return [
    // Act divider (dark)
    {
      section: `Problem ${n}`,
      dark: true,
      render: () => (
        <div className="text-center">
          <Kicker dark>Problem {n} of 5</Kicker>
          <H dark size="text-5xl md:text-6xl">{meta.title}</H>
          <Lead dark>
            <span className="mx-auto block max-w-2xl text-center">{meta.hook}</span>
          </Lead>
        </div>
      ),
    },
    // Deep problem
    {
      section: `Problem ${n}`,
      render: () => (
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Kicker>The problem, up close</Kicker>
            <H size="text-3xl md:text-4xl">{meta.problemHeading}</H>
            <StoryPoints points={meta.story} />
          </div>
          <div>{meta.visual}</div>
        </div>
      ),
    },
    // Existing solution + gap
    {
      section: `Problem ${n}`,
      render: () => (
        <div>
          <Kicker>How people cope today</Kicker>
          <H size="text-3xl md:text-4xl">{meta.existingHeading}</H>
          <div className="mt-6">
            <FlowRow steps={meta.existingFlow} />
          </div>
          <div className="mt-8">
            <GapPanels solves={meta.solves} misses={meta.misses} />
          </div>
          <SectionLine>“{meta.gapLine}” — this is exactly the gap Team Inertia decided to close.</SectionLine>
        </div>
      ),
    },
    // Our solution + tech
    {
      section: `Problem ${n}`,
      render: () => (
        <div>
          <Kicker>The Team Inertia answer</Kicker>
          <H size="text-3xl md:text-4xl">{meta.solutionHeading}</H>
          <div className="mt-5 grid gap-2.5 md:grid-cols-2">
            {meta.solutionPoints.map((p, i) => (
              <div key={i} className="flex gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5">
                <Icon.check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-[14.5px] leading-snug text-slate-700">{p}</p>
              </div>
            ))}
          </div>
          <p className="mb-3 mt-7 text-center text-xs font-extrabold uppercase tracking-widest text-slate-400">
            How it works under the hood
          </p>
          {meta.archVisual ?? <FlowRow tone="navy" steps={meta.pipeline} />}
          <TechChips items={meta.tech} />
        </div>
      ),
    },
    // Demo + impact
    {
      section: `Problem ${n}`,
      render: () => (
        <div>
          <Kicker>Let’s see it in action</Kicker>
          <H size="text-3xl md:text-4xl">{meta.demoHeading}</H>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-start">
            <DemoSteps steps={meta.demoSteps} href={meta.demoHref} label={meta.demoLabel} />
            <div className="space-y-5">
              <BeforeAfter before={meta.before} after={meta.after} />
              <div>
                <p className="mb-2 text-center text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Why this matters
                </p>
                <ImpactChain items={meta.impact} />
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];
}

/* --------------------------------- the acts --------------------------------- */

const ACT1 = {
  title: 'Billing & the end-of-day black hole',
  hook: 'Two hundred sales a day. Paper bills, a calculator, three notebooks — and a cash drawer that never quite matches.',
  problemHeading: 'It’s 9 PM. Ramesh is still counting.',
  story: [
    ['Who', 'Ramesh runs a kirana store — like ~13 million others in India. No cashier, no accountant. He is the billing system.'],
    ['The task', 'Bill every customer correctly, hand over a receipt when asked, track returns and udhaar promises — all while the queue grows.'],
    ['The pain', 'Hand-written totals go wrong silently. A ₹96 bill written as ₹69 is a loss nobody ever discovers.'],
    ['Every evening', 'Reconciling cash vs QR vs udhaar across scattered notebooks takes an hour — and often simply doesn’t balance.'],
    ['Consequence', 'Leaked margins, no daily truth, and business records too messy to ever prove income or get credit.'],
  ],
  visual: <ChaosVisual />,
  existingHeading: 'Bill books, calculators — and apps that only record',
  existingFlow: [
    { label: 'Sell', sub: 'queue at counter', icon: <Icon.person /> },
    { label: 'Scribble bill', sub: 'paper pad + calculator', icon: <Icon.receipt /> },
    { label: 'Note udhaar', sub: 'separate khata book', icon: <Icon.ledger /> },
    { label: 'Evening tally', sub: 'notebooks vs drawer', icon: <Icon.clock /> },
    { label: 'Mismatch', sub: 'shrug, move on', icon: <Icon.alert /> },
  ],
  solves: [
    'Ledger apps (KhataBook, Vyapar) digitise entries you type in',
    'POS machines accept card/QR payments',
    'Bill books produce a paper receipt',
  ],
  misses: [
    'Totals are still typed by hand — errors go in unchecked',
    'The bill, the stock, the khata and the cash live in different places',
    'End-of-day reconciliation across payment modes is still manual',
    'Records are data-dead: they feed no forecasts, no insights, no credit history',
  ],
  gapLine: 'Recording a sale is not the same as understanding your business',
  solutionHeading: 'One counter where every bill reconciles itself',
  solutionPoints: [
    'Tap-to-bill POS: products from the live catalog, prices auto-filled, totals computed on the server — a wrong bill is structurally impossible.',
    'Numbered printable invoices (INV-0001…), returns with automatic restocking, udhaar bills that go straight onto the customer’s khata.',
    'Day Close card reconciles the whole day automatically: gross, per-mode split, udhaar given, khata received, refunds → net collected.',
    'Every paid bill becomes a ground-truth transaction with exact item attribution — instantly fueling forecasts, inventory and customer analytics. Old records? The Integrations hub imports Excel/CSV from KhataBook, Tally, Zoho, Shopify & 8 more.',
  ],
  pipeline: [
    { label: 'Tap products', sub: 'React counter' },
    { label: 'Server computes', sub: 'prices + totals in paise, validated' },
    { label: 'Bill + invoice', sub: 'MongoDB, sequential number' },
    { label: 'Stock −, ledger +', sub: 'SKU decrement, khata entry' },
    { label: 'Feeds every engine', sub: 'transaction w/ item attribution' },
  ],
  tech: ['React + Vite', 'Express REST API', 'MongoDB / Mongoose', 'Server-side money math (integer paise)', 'Zod validation', 'JWT + owner/staff roles'],
  demoHeading: 'From tap to reconciled — in under a minute',
  demoSteps: [
    ['Open the Billing counter and tap 3 products', 'prices and stock come from the live catalog; no typing, no arithmetic'],
    ['Save the bill', 'a numbered invoice appears, ready to print — stock has already been deducted'],
    ['Switch to the Register tab', 'the Day Close card already reconciles today: gross, cash vs QR vs udhaar, net collected'],
    ['Record a return on any bill', 'refund capped at what’s refundable, items restocked, cash flow stays honest'],
  ],
  demoHref: '/billing',
  demoLabel: 'Billing & Khata',
  before: 'An hour of evening tallying across notebooks, with silent arithmetic losses.',
  after: 'Billing in seconds, zero math errors, and the day reconciled in one glance.',
  impact: ['Correct bills', 'Faster queue', 'One-glance day close', 'Clean data for everything else'],
};

const ACT2 = {
  title: 'Udhaar & the invisible customer',
  hook: 'Iqbal came every two weeks for four months. He stopped a month ago. Nobody noticed — and he still owes ₹800.',
  problemHeading: 'Your best customers are strangers on paper',
  story: [
    ['Who', 'Every neighbourhood merchant runs on regulars — and on trust credit (udhaar) that keeps them coming back.'],
    ['The task', 'Know who your VIPs are, notice when a regular is slipping away, and recover udhaar without souring the relationship.'],
    ['The pain', 'At the counter, a VIP and a one-time walk-in look identical. Preferences live in the owner’s memory — and memory doesn’t scale.'],
    ['The silent leak', 'Customers who owe money often start avoiding the shop. Asking for it back feels awkward, so nobody asks.'],
    ['Consequence', 'Churn is discovered months late (or never), udhaar quietly becomes bad debt, and retention is pure luck.'],
  ],
  visual: (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="mb-4 text-center text-xs font-extrabold uppercase tracking-widest text-slate-400">What the merchant actually knows</p>
      {[
        ['Sunita Devi', 'comes… often? buys… things?', '₹0', 'text-emerald-600'],
        ['Iqbal Bhai', 'haven’t seen him lately…?', '₹800?', 'text-amber-600'],
        ['Prakash Rao', 'who?', '₹266… I think', 'text-red-600'],
      ].map(([name, memory, owed, tone]) => (
        <div key={name} className="mb-2.5 flex items-center gap-3 rounded-xl border border-slate-200 p-3">
          <Icon.person className="h-8 w-8 text-slate-400" />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{name}</p>
            <p className="text-xs italic text-slate-400">“{memory}”</p>
          </div>
          <p className={`text-sm font-extrabold ${tone}`}>{owed}</p>
        </div>
      ))}
      <p className="mt-3 text-center text-sm font-semibold text-red-600">Memory is the CRM. Memory doesn’t scale.</p>
    </div>
  ),
  existingHeading: 'Khata apps track balances. Nothing tracks people.',
  existingFlow: [
    { label: 'Trust credit', sub: 'given verbally', icon: <Icon.ledger /> },
    { label: 'Khata entry', sub: 'amount only', icon: <Icon.rupee /> },
    { label: 'Wait', sub: 'hope they return', icon: <Icon.clock /> },
    { label: 'Awkward ask', sub: 'or no ask at all', icon: <Icon.alert /> },
    { label: 'Bad debt', sub: 'relationship lost too', icon: <Icon.cross /> },
  ],
  solves: [
    'Khata apps digitise who-owes-how-much',
    'Big-retail loyalty programs track points (for chains, not kiranas)',
    'Reminder features send generic “please pay” texts',
  ],
  misses: [
    'No idea who is VIP, regular, new — or quietly churning',
    'No why behind a lapse: return gone wrong? favourite item out of stock? owes money?',
    'No purchase history or preferences per person',
    'Recovery messages are cold and generic — the opposite of a kirana relationship',
  ],
  gapLine: 'Balances without behaviour — ledgers that know the money but not the person',
  solutionHeading: 'A CRM that builds itself from your bills',
  solutionPoints: [
    'Tag a customer on any bill — that’s the entire setup. Segments compute automatically: VIP, Regular, New, At-risk, Churned.',
    'Every label is explainable: “visited every ~14 days, absent 30” — the numbers behind the badge are shown, never a black box.',
    'Full profile per customer: visit cadence, spend, favourite items, complete purchase history, khata entries — and churn signals (return on last visit, favourite item out of stock, outstanding udhaar).',
    'One tap writes a warm, personalised WhatsApp message — udhaar reminder with the exact balance, or a win-back naming their favourite item — in the merchant’s language, sent from their own WhatsApp. No API setup.',
  ],
  pipeline: [
    { label: 'Bills tagged', sub: 'customer on any sale' },
    { label: 'Behaviour computed', sub: 'visits, spend, cadence, favourites' },
    { label: 'Explainable segments', sub: 'transparent RFM rules' },
    { label: 'Churn signals', sub: 'why they’re slipping' },
    { label: 'LLM writes message', sub: 'facts only → wa.me deep link' },
  ],
  tech: ['Rule-based RFM segmentation (transparent)', 'Sarvam LLM message drafting', 'wa.me deep links (no WhatsApp API needed)', 'MongoDB aggregation'],
  demoHeading: 'From “who?” to a win-back message in three clicks',
  demoSteps: [
    ['Open Customers', 'seven customers, already segmented — 71% repeat rate, at-risk and churned flagged'],
    ['Click Iqbal Bhai (⚠️ at-risk)', 'the panel explains why: visited every ~14 days, absent 30 — with his favourites and full history'],
    ['Tap “WhatsApp: invite back”', 'AI writes a personal message naming his favourite Thums Up, in the app’s language'],
    ['In Billing → Khata, tap 💬 on a debtor', 'a polite udhaar reminder with the exact ₹ balance, one tap from their chat'],
  ],
  demoHref: '/customers',
  demoLabel: 'Customer Intelligence',
  before: 'Churn invisible, udhaar awkward, preferences in one person’s memory.',
  after: 'A daily call-list with reasons, and recovery messages that keep the relationship warm.',
  impact: ['Churn caught early', 'Udhaar recovered', 'Repeat rate visible', 'Loyalty without a loyalty program'],
};

const ACT3 = {
  title: 'Inventory by gut feeling',
  hook: 'Thums Up ran out two days before Onam — the exact week demand doubles. Meanwhile ₹33,000 sleeps on the shelf as Kaju Katli nobody buys.',
  problemHeading: 'The shelf tells you what is — never what will happen',
  story: [
    ['Who', 'The same merchant, now as purchasing manager — deciding every week what to reorder, how much, and when.'],
    ['The task', 'Never run out of fast movers (especially before festivals), never over-buy slow movers, and know which stock is dead capital.'],
    ['The pain', 'Reordering runs on gut feel. Festival demand spikes arrive on the calendar, but nothing connects the calendar to the shelf.'],
    ['The hidden tax', 'A stockout of a daily item doesn’t just lose one sale — the customer walks to the next shop, sometimes for good.'],
    ['Why apps fail', 'Inventory apps demand you type in 100+ products first. Most merchants quit on day one.'],
  ],
  visual: <ShelfVisual />,
  existingHeading: 'Eyeball the shelf, keep a register, maybe an ERP',
  existingFlow: [
    { label: 'Look at shelf', sub: 'gut estimate', icon: <Icon.box /> },
    { label: 'Stock register', sub: 'counts, on paper', icon: <Icon.ledger /> },
    { label: 'Distributor visit', sub: 'order “the usual”', icon: <Icon.person /> },
    { label: 'Festival rush', sub: 'surprise every year', icon: <Icon.spark /> },
    { label: 'Stockout / dead stock', sub: 'both cost money', icon: <Icon.alert /> },
  ],
  solves: ['Registers & ERPs count current stock accurately', 'Distributors suggest (their own) fast movers', 'Big retail has demand planning — at enterprise prices'],
  misses: [
    'Counting is a snapshot — no prediction of when stock runs out',
    'Festival demand shifts are not factored in anywhere',
    'Dead stock is invisible until the yearly cleanup',
    'Data entry friction kills adoption before value appears',
  ],
  gapLine: 'Merchants don’t need a count of today — they need a warning about next week',
  solutionHeading: 'Inventory that predicts, and onboarding that takes minutes',
  solutionPoints: [
    'Every product auto-classified fast 🐎 / slow 🐢 / dead 🧊 from real sales velocity (KMeans clustering with a transparent rules fallback).',
    'Days-until-stockout predicted per item — with festival demand factored in from a built-in Indian festival calendar — plus suggested reorder quantities.',
    'Dead stock valued in rupees, so frozen capital finally shows up as a number worth acting on.',
    'Onboarding without typing: photo a shelf (AI vision reads it), speak a stock note in Hindi/English (“20 packet Parle-G aaye, 30 rupaye wale”), or type — always with an editable review before saving.',
  ],
  pipeline: [
    { label: 'Sales history', sub: 'per-item attribution' },
    { label: 'Velocity + clustering', sub: 'KMeans / rules fallback' },
    { label: 'Festival calendar', sub: 'demand multipliers' },
    { label: 'Stockout prediction', sub: 'days left + reorder qty' },
    { label: 'Alert cards', sub: 'on inventory & dashboard' },
  ],
  tech: ['Python ML service (KMeans) + JS fallback', 'Festival-calendar demand factors', 'Claude vision (photo → SKUs)', 'Saarika/Whisper STT + LLM structuring (voice → SKUs)'],
  demoHeading: 'The warning arrives before the empty shelf',
  demoSteps: [
    ['Open Inventory', 'red cards on top: “Thums Up — 2 days left, reorder ~123 bottles, 🎉 Onam ahead” — the calendar is in the math'],
    ['Scan the table', 'each product: status badge, velocity/day, days-until-stockout, suggested reorder'],
    ['Tap Add Stock → Voice', 'say the stock note like you’d tell your munim; review the parsed rows; save'],
    ['Note the dashboard', 'the same urgent items surfaced on the home screen the moment the app opened'],
  ],
  demoHref: '/inventory',
  demoLabel: 'Inventory Intelligence',
  before: 'Reorder by gut; festivals surprise you; dead stock hides for months.',
  after: 'Named warnings days in advance, festival-adjusted quantities, frozen cash exposed.',
  impact: ['Stockouts prevented', 'Festival demand captured', 'Dead capital freed', 'Onboarding in minutes'],
};

const ACT4 = {
  title: 'Cash-flow fog & hidden charges',
  hook: 'The drawer has cash, so business feels fine. Whether it actually is fine — nobody knows until the accountant says so, thirty days late.',
  problemHeading: 'Revenue is visible. Health is not.',
  story: [
    ['Who', 'Merchants who see money move all day but can’t answer: “can I afford the big Diwali stock order next month?”'],
    ['The task', 'Know profit (not just revenue), see where money leaks, and plan purchases against what’s coming — not what already happened.'],
    ['The pain', 'Small recurring charges — subscriptions, bank fees, service costs — drain silently. No single one is big enough to notice.'],
    ['The timing trap', 'Every review of the numbers is backward-looking. Festival working-capital decisions need a forward view.'],
    ['Consequence', 'Under-stocking the best weeks of the year, over-committing in weak months, and margins thinner than they look.'],
  ],
  visual: <ForecastVisual />,
  existingHeading: 'Bank SMS, Excel, and a month-end accountant',
  existingFlow: [
    { label: 'Bank SMS', sub: 'per-transaction noise', icon: <Icon.bank /> },
    { label: 'Shoebox receipts', sub: 'expenses, eventually', icon: <Icon.receipt /> },
    { label: 'Accountant', sub: 'monthly, if at all', icon: <Icon.person /> },
    { label: 'Backward report', sub: '30 days late', icon: <Icon.clock /> },
    { label: 'Guess forward', sub: 'gut + hope', icon: <Icon.alert /> },
  ],
  solves: ['Banks show balances and statements', 'Accountants produce accurate history', 'Excel can chart whatever you type into it'],
  misses: [
    'Nothing looks forward — no projection of the next 30 days',
    'Festival effects on cash flow aren’t modelled anywhere',
    'Recurring micro-charges never get added up and named',
    'Profit vs revenue stays blurry between accountant visits',
  ],
  gapLine: 'Every tool reports the past. The decisions are all about the future.',
  solutionHeading: 'A 30-day forward view, festival-aware, with the leaks named',
  solutionPoints: [
    'Daily revenue vs profit charts — margin problems show as a widening gap, not a year-end surprise.',
    'A statistical forecast (SARIMAX) trained on this shop’s own history projects net cash flow 30 days ahead with a confidence band — festival dates enter the model as demand signals.',
    'Hidden-charge detection: expenses recurring on a regular rhythm are clustered, named and totalled per month.',
    'Runs even with zero setup: a JavaScript fallback model keeps forecasts alive when the Python ML service is unavailable.',
  ],
  pipeline: [
    { label: 'Transactions + expenses', sub: 'incl. billing & imports' },
    { label: 'SARIMAX model', sub: 'per-shop training' },
    { label: 'Festival regressors', sub: 'Indian calendar built-in' },
    { label: '30-day projection', sub: 'with confidence band' },
    { label: 'Leak detector', sub: 'recurring-charge clustering' },
  ],
  tech: ['Python FastAPI ML service (SARIMAX)', 'JS statistical fallback', 'Festival regressors', 'Recharts visualisation'],
  demoHeading: 'Tomorrow’s cash, today',
  demoSteps: [
    ['Open Cash Flow', 'revenue, profit, expenses and the 30-day projection — four numbers that used to take an accountant'],
    ['Scroll to the forecast', 'the line ahead of today, confidence band around it, Onam flagged on the curve'],
    ['Check Hidden Charges', 'recurring fees detected from rhythm alone, totalled at ₹1.7K/month'],
    ['Connect it back', 'the same projection powers the dashboard card and the copilot’s answers'],
  ],
  demoHref: '/cashflow',
  demoLabel: 'Cash Flow Clarity',
  before: 'Backward-looking statements, silent leaks, festival guesswork.',
  after: 'A festival-aware 30-day projection and every recurring leak named and totalled.',
  impact: ['Plan stock with confidence', 'Leaks plugged', 'Profit clarity', 'Credit-worthy records'],
};

const ACT5 = {
  title: 'The access barrier',
  hook: 'Everything so far assumes the merchant reads English dashboards and types queries. Most of India’s 60 million merchants do neither.',
  problemHeading: 'The best analytics in the world are useless in the wrong language',
  story: [
    ['Who', 'Merchants who think in Hindi, Tamil, Telugu, Bengali… — with a queue at the counter and both hands busy.'],
    ['The task', 'Get an answer (“why were sales down?”) or do a job (“note that 10 packets arrived”) in the middle of a working day.'],
    ['The pain', 'Business software speaks English, expects typing, and answers with charts that need interpreting.'],
    ['The reality', 'The phone is already in their pocket and speech is free. But their tools can’t listen — and can’t talk back.'],
    ['Consequence', 'The intelligence exists, the merchant exists — and a language-and-literacy wall stands between them.'],
  ],
  visual: <LanguageVisual />,
  existingHeading: 'English dashboards — or hiring someone to read them',
  existingFlow: [
    { label: 'Dashboard', sub: 'English, chart-heavy', icon: <Icon.chart /> },
    { label: 'Type a query', sub: 'exact filters needed', icon: <Icon.cross /> },
    { label: 'Interpret', sub: 'data literacy required', icon: <Icon.alert /> },
    { label: 'Or hire a munim', sub: '₹ thousands/month', icon: <Icon.person /> },
    { label: 'Or stay blind', sub: 'most common choice', icon: <Icon.clock /> },
  ],
  solves: ['BI dashboards serve analysts well', 'Accountants translate numbers into advice — at a price', 'Generic chatbots chat — about nothing in your shop'],
  misses: [
    'No mainstream business tool works in 11 Indian languages end-to-end',
    'None listen — voice is the natural interface at a busy counter',
    'Generic AI chatbots aren’t grounded in this shop’s data (and happily invent numbers)',
    'None can act — answering is not the same as doing',
  ],
  gapLine: 'Intelligence locked behind language, literacy and a keyboard',
  solutionHeading: 'The whole app becomes a conversation — in 11 languages',
  solutionPoints: [
    'One tap on 🌐 switches the entire app — menus, cards, tooltips — into 11 Indian languages (UI catalog LLM-translated once, then cached).',
    'The Copilot answers real questions from real data: rules-first intent detection, live data retrieval, analysis computed in code (₹ figures pre-formatted — the model never does math), then Sarvam-105B narrates in your language.',
    'A floating voice assistant on every screen doesn’t just answer — it acts: “20 packet Parle-G aaye” updates stock; “Ramu ne 50 rupaye diye” records a khata payment; bill requests come back as one-tap confirmations.',
    'Voice in via Saarika STT (Whisper fallback), voice out via speech synthesis — hands stay free for the counter.',
  ],
  pipeline: [],
  archVisual: <AIArchVisual />,
  tech: ['LangGraph-style JS agent', 'Sarvam-105B (LLM) + Saarika (STT)', 'Whisper fallback', 'LLM-translated i18n catalogs', 'Browser speech synthesis'],
  demoHeading: 'Watch the wall come down',
  demoSteps: [
    ['Tap 🌐 and pick हिन्दी', 'the entire app flips — including the ⓘ tooltips and every AI reply from here on'],
    ['Open the 🎙️ assistant, say “10 packet Maggi aaye”', 'stock updates instantly — a command, not a conversation'],
    ['Ask the Copilot “why did my sales drop?”', 'it cross-references sales dips with stockout history and answers with exact ₹ figures'],
    ['Note the intent badge on the answer', 'every reply shows which data path produced it — no black boxes'],
  ],
  demoHref: '/dashboard',
  demoLabel: 'Language + Voice AI',
  before: 'English-only dashboards that demand typing and interpretation.',
  after: 'Ask in your language, by voice — get grounded answers, or get the job done.',
  impact: ['Zero learning curve', 'Works mid-queue', 'Trustworthy numbers', '60M-merchant reach'],
};

/* --------------------------------- the deck --------------------------------- */

export const slides = [
  // 1 — cover
  {
    section: 'Team Inertia',
    dark: true,
    render: () => (
      <div className="text-center">
        <p className="mb-6 inline-block rounded-2xl bg-white px-5 py-2.5 text-2xl font-black tracking-tight text-brand-navy">Vy</p>
        <Kicker dark>Paytm Hackathon · Team Presentation</Kicker>
        <H dark size="text-6xl md:text-7xl">TEAM INERTIA</H>
        <div className="mx-auto mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
          {[
            ['Dewanshu Chakraborty', 'Technical Contributor — application development'],
            ['Kunal Raj', 'Technology & Product Contributor'],
          ].map(([name, role]) => (
            <div key={name} className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <Icon.person className="mx-auto mb-2 h-8 w-8 text-brand-blue" />
              <p className="font-bold text-white">{name}</p>
              <p className="mt-1 text-xs text-sky-200/80">{role}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-lg text-sky-100/90">
          We built <b className="text-white">Paytm VyaparGuru</b> — an AI co-pilot for Indian merchants.
        </p>
      </div>
    ),
  },
  // 2 — what & why
  {
    section: 'Team Inertia',
    dark: true,
    render: () => (
      <div className="text-center">
        <Kicker dark>Who we are · What we built · Why</Kicker>
        <H dark>One app where a merchant’s whole business lives — and thinks</H>
        <Lead dark>
          <span className="mx-auto block max-w-3xl text-center">
            Billing, khata, inventory, cash flow, customers — powered by a voice-first AI that speaks 11 Indian
            languages, built on the merchant’s own Paytm transaction data. We built it because the tools merchants
            actually have solve slices of the problem, and leave the thinking to the merchant.
          </span>
        </Lead>
        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2.5">
          {['🧾 Billing & Khata', '👤 Customer Intelligence', '📦 Inventory Foresight', '💰 Cash-Flow Forecast', '🔌 12-App Integrations', '🎙️ Voice AI · 11 languages'].map((m) => (
            <span key={m} className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white">
              {m}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  // 3 — overall context
  {
    section: 'The Context',
    render: () => (
      <div className="text-center">
        <Kicker>The broader challenge</Kicker>
        <H>India runs on 60 million small merchants.<br />Their business runs on scattered paper.</H>
        <div className="mt-8"><ChaosVisual /></div>
        <SectionLine>
          This isn’t one problem — it’s five specific gaps stacked on top of each other. Let’s take them one at a time.
        </SectionLine>
      </div>
    ),
  },
  ...actSlides(1, ACT1),
  ...actSlides(2, ACT2),
  ...actSlides(3, ACT3),
  ...actSlides(4, ACT4),
  ...actSlides(5, ACT5),
  // overall impact
  {
    section: 'Business Impact',
    render: () => (
      <div>
        <div className="text-center">
          <Kicker>Putting it together</Kicker>
          <H size="text-3xl md:text-4xl">Five gaps closed, one compounding system</H>
          <p className="mx-auto mt-3 max-w-3xl text-slate-600">
            Each module feeds the next: bills create clean data → data powers forecasts and segments → AI makes all of
            it usable in any language. That’s why it’s one app, not five.
          </p>
        </div>
        <div className="mt-8"><ImpactTree /></div>
      </div>
    ),
  },
  // future scope
  {
    section: 'Future Scope',
    render: () => (
      <div>
        <div className="text-center">
          <Kicker>Where this goes next</Kicker>
          <H size="text-3xl md:text-4xl">From co-pilot to operating system</H>
          <p className="mx-auto mt-3 max-w-3xl text-slate-600">
            The most valuable long-term asset here is <b>verified cash-flow history</b> — the foundation small merchants
            have always lacked for formal credit.
          </p>
        </div>
        <div className="mt-8"><RoadmapVisual /></div>
      </div>
    ),
  },
  // AI honesty + closing
  {
    section: 'Closing',
    dark: true,
    render: () => (
      <div className="text-center">
        <Kicker dark>Why AI, honestly</Kicker>
        <H dark size="text-3xl md:text-5xl">
          “We didn’t add AI to have AI.<br />
          We put intelligence exactly where existing tools<br className="hidden md:block" />
          leave merchants doing the thinking by hand.”
        </H>
        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-white/20 bg-white/10 p-6 text-left backdrop-blur">
          <p className="text-sm leading-relaxed text-sky-100/90">
            Real problems, verified in the product · Existing tools respected for what they do · Every AI answer
            grounded in computed numbers · Every feature shown live today, not mocked
          </p>
        </div>
        <p className="mt-12 text-2xl font-extrabold text-white">TEAM INERTIA</p>
        <p className="mt-1 text-sky-200">Dewanshu Chakraborty × Kunal Raj</p>
        <p className="mt-6 text-lg text-brand-blue">Paytm VyaparGuru — vyapar ka guru, aapki jeb mein 🙏</p>
      </div>
    ),
  },
];
