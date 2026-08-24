# Team Inertia — Presentation Script

**Format:** read each block while its slide (number in brackets) is on screen at `http://localhost:5173/pitch`.
Navigate with **→** (arrow key). Press **F** for fullscreen. Demo slides have an "Open live demo" button — it opens
the app in a new tab; the deck keeps your place, close the tab to return.
**Estimated runtime:** 12–14 minutes with demos, ~8 minutes deck-only.

---

## OPENING

**[Slide 1 — Team Inertia]**
Good morning. We are Team Inertia — I'm Dewanshu Chakraborty, technical contributor, and this is Kunal Raj,
technology and product contributor. We built Paytm VyaparGuru — an AI co-pilot for Indian merchants.

**[Slide 2 — What & why]**
In one line: it's the one app where a merchant's whole business lives — and thinks. Billing, khata, inventory, cash
flow, customers — with a voice-first AI that speaks eleven Indian languages, built on the merchant's own Paytm
transaction data. We built it because the tools merchants actually use each solve a slice of the problem — and leave
all the thinking to the merchant.

**[Slide 3 — Context]**
Here's the broader picture. India runs on roughly sixty million small merchants — and their businesses run on
scattered paper. A bill book here, a khata app there, bank SMS, a stock register, and a lot of memory. Five sources
of truth, no complete picture, and every evening ends in manual reconciliation. But this isn't one problem — it's
five specific gaps stacked on top of each other. So let's take them one at a time.

---

## PROBLEM 1 — Billing & the end-of-day black hole

**[Slide 4 — divider]**
Problem one: billing, and the end-of-day black hole.

**[Slide 5 — the problem]**
It's 9 PM, and Ramesh is still counting. He runs a kirana store, like thirteen million others — no cashier, no
accountant; he IS the billing system. All day he has to bill correctly, hand over receipts, track returns and
udhaar promises, while the queue grows. And here's the thing about hand-written totals: they go wrong silently. A
ninety-six rupee bill written as sixty-nine is a loss nobody ever discovers. Then the evening ritual: reconciling
cash versus QR versus udhaar across scattered notebooks — an hour of work that often simply doesn't balance. The
result? Leaked margins, no daily truth, and records too messy to ever prove income or qualify for credit.

**[Slide 6 — existing solutions & the gap]**
So how do people cope today? Sell, scribble a bill, note udhaar in a separate book, tally everything at night,
find a mismatch — shrug, move on. Now, to be fair: existing tools do help. Ledger apps like KhataBook and Vyapar
digitise the entries you type in. POS machines take payments. Bill books produce receipts. But look at what stays
unsolved: totals are still typed by hand, so errors go in unchecked. The bill, the stock, the khata and the cash
all live in different places. Day-end reconciliation is still manual. And the records are data-dead — they feed no
forecasts, no insights, no credit history. Recording a sale is not the same as understanding your business. That
is exactly the gap Team Inertia decided to close.

**[Slide 7 — our solution]**
Our answer is a billing counter where every bill reconciles itself. You tap products from the live catalog —
prices auto-fill, and the total is computed on the server, which means a wrong bill is structurally impossible.
Every sale gets a numbered, printable invoice. Returns restock automatically. Udhaar bills go straight onto the
customer's khata. And the Day Close card reconciles the entire day on its own: gross sales, the split by payment
mode, udhaar given, khata received, refunds — down to net collected. Under the hood, every paid bill becomes a
clean transaction with exact item attribution — which, as you'll see, fuels everything else in the app. And for a
merchant's old records? Our Integrations hub imports Excel and CSV exports from KhataBook, Tally, Zoho, Shopify
and eight more.

**[Slide 8 — live demo]**
Let's see it live. *(Open live demo → Billing.)* I'll tap three products — notice prices and stock come from the
catalog, no typing. Save — and there's the numbered invoice, print-ready; stock is already deducted. Now the
Register tab: the Day Close card has already reconciled today — gross, cash versus QR versus udhaar, net
collected. And any bill can take a return — capped at what's refundable, items restocked automatically. *(Back to
deck.)* Before: an hour of evening tallying with silent losses. After: billing in seconds, zero math errors, and
the day reconciled in one glance. Correct bills, a faster queue, a one-glance day close — and clean data for
everything that follows.

---

## PROBLEM 2 — Udhaar & the invisible customer

**[Slide 9 — divider]**
Problem two: udhaar, and the invisible customer.

**[Slide 10 — the problem]**
Every neighbourhood shop runs on regulars and on trust credit. But at the counter, a VIP and a one-time walk-in
look identical. Preferences live in the owner's memory — and memory doesn't scale. Here's the quiet part: customers
who owe money often start avoiding the shop, and asking for it back feels awkward — so nobody asks. Iqbal came
every two weeks for four months; he stopped a month ago; nobody noticed — and he still owes money. Churn gets
discovered months late or never, and udhaar quietly becomes bad debt.

**[Slide 11 — existing solutions & the gap]**
Today's flow: credit is given verbally, the khata app records the amount, then you wait, then comes the awkward
ask — or no ask — and finally bad debt, with the relationship lost too. Khata apps genuinely solved
who-owes-how-much. But nothing tells you who's VIP, who's slipping, or WHY — a return gone wrong? their favourite
item out of stock? embarrassment about the balance? There's no history, no preferences, and recovery messages are
cold and generic — the opposite of a kirana relationship. Balances without behaviour: ledgers that know the money
but not the person. That's the gap.

**[Slide 12 — our solution]**
So we built a CRM that builds itself from your bills. Tag a customer on any bill — that's the entire setup.
Segments compute automatically: VIP, regular, new, at-risk, churned — and every label is explainable. It doesn't
say "at risk" — it says "visited every fourteen days, absent thirty." Each profile carries visit rhythm, spend,
favourite items, full history, and churn signals. And then it acts: one tap writes a warm, personalised WhatsApp
message — an udhaar reminder with the exact balance, or a win-back naming their favourite item — in the merchant's
language, sent from their own WhatsApp. No API setup, works today.

**[Slide 13 — live demo]**
Let's look. *(Open live demo → Customers.)* Seven customers, already segmented — seventy-one percent repeat rate,
at-risk and churned flagged. I'll open Iqbal — and there's the why: visited every fourteen days, absent thirty,
with his favourites and every bill. One tap — the AI writes a personal invite naming his favourite Thums Up. And in
the Khata tab, the same one tap produces a polite udhaar reminder with the exact balance. *(Back to deck.)* From
churn invisible and udhaar awkward — to a daily call-list with reasons, and messages that keep the relationship
warm. That's loyalty without a loyalty program.

---

## PROBLEM 3 — Inventory by gut feeling

**[Slide 14 — divider]**
Problem three: inventory by gut feeling.

**[Slide 15 — the problem]**
The same merchant is also the purchasing manager. Every week: what to reorder, how much, when. Today that runs on
gut feel. The shelf tells you what IS — never what WILL happen. Festivals arrive on the calendar every year, but
nothing connects the calendar to the shelf — so Thums Up runs out two days before Onam, the exact week demand
doubles. And a stockout doesn't lose one sale; the customer walks to the next shop, sometimes for good. Meanwhile
thirty-three thousand rupees sleeps on the shelf as sweets nobody buys. And why don't inventory apps fix this?
Because they demand you type in a hundred products first — most merchants quit on day one.

**[Slide 16 — existing solutions & the gap]**
Today: eyeball the shelf, keep a register, order "the usual" from the distributor, get surprised by the festival
rush, and eat the cost of stockouts and dead stock. Registers and ERPs do count stock accurately. But counting is
a snapshot — it predicts nothing. Festival demand isn't factored anywhere. Dead stock hides until the yearly
cleanup. And the data-entry friction kills adoption before any value appears. Merchants don't need a count of
today — they need a warning about next week. That's the gap.

**[Slide 17 — our solution]**
VyaparGuru's inventory predicts. Every product is auto-classified fast, slow or dead from real sales velocity —
K-Means clustering, with a transparent rules fallback so it works even without the ML service. Days-until-stockout
is predicted per item with festival demand factored in from a built-in Indian festival calendar — plus a suggested
reorder quantity. Dead stock finally gets a rupee value. And onboarding takes minutes, not days: photograph a
shelf and AI vision reads it; or just say "twenty packets Parle-G came, thirty rupees each" — Hindi, English, or
mixed — and speech recognition plus the LLM turn it into editable rows. You always review before anything saves.

**[Slide 18 — live demo]**
Live. *(Open live demo → Inventory.)* Top of the page: "Thums Up — two days left, reorder about a hundred and
twenty bottles, Onam ahead." The calendar is in the math. The table shows velocity and days-to-stockout per
product. And Add Stock → Voice: I speak the stock note like I'd tell my munim, review the parsed rows, save.
*(Back to deck.)* Before: gut-feel reorders and annual dead-stock surprises. After: named warnings days in
advance, festival-adjusted quantities, and frozen cash exposed.

---

## PROBLEM 4 — Cash-flow fog & hidden charges

**[Slide 19 — divider]**
Problem four: cash-flow fog, and hidden charges.

**[Slide 20 — the problem]**
The drawer has cash, so business feels fine. Whether it actually IS fine, nobody knows until the accountant says
so — thirty days late. Merchants see money move all day but can't answer the question that matters: can I afford
the big Diwali stock order next month? Small recurring charges — subscriptions, bank fees — drain silently; no
single one is big enough to notice. And every review of the numbers looks backward, while every decision is about
the future. The result: under-stocking the best weeks of the year, and margins thinner than they look.

**[Slide 21 — existing solutions & the gap]**
The current stack: bank SMS per transaction, a shoebox of receipts, a monthly accountant, a backward-looking
report, and a forward guess. Banks show balances; accountants produce accurate history; Excel charts whatever you
type. But nothing projects the next thirty days. Festival effects on cash flow aren't modelled anywhere. Recurring
micro-charges never get added up and named. Every tool reports the past — while the decisions are all about the
future. That's the gap.

**[Slide 22 — our solution]**
So we give merchants a thirty-day forward view. Daily revenue-versus-profit charts make margin problems visible as
a widening gap. A statistical model — SARIMAX — trains on this shop's own history and projects net cash flow
thirty days ahead with a confidence band, and festival dates enter the model as demand signals: it expects the
Onam spike because it learned it from this shop's past. A hidden-charge detector clusters expenses that recur on a
regular rhythm and totals them per month. And it degrades gracefully — a JavaScript fallback keeps forecasts alive
even if the ML service is down.

**[Slide 23 — live demo]**
Quickly, live. *(Open live demo → Cash Flow.)* Revenue, profit, expenses, and the thirty-day projection — four
numbers that used to require an accountant. The forecast line runs ahead of today with its confidence band, Onam
flagged on the curve. And Hidden Charges: recurring fees detected from rhythm alone, totalled per month. *(Back to
deck.)* Backward statements and silent leaks become a festival-aware forward view with every leak named. And
notice the long-game: this builds exactly the verified cash-flow history small merchants have always lacked for
formal credit.

---

## PROBLEM 5 — The access barrier

**[Slide 24 — divider]**
Problem five — and this one sits on top of everything else: the access barrier.

**[Slide 25 — the problem]**
Everything I've shown assumes the merchant reads English dashboards and types queries. Most of India's sixty
million merchants do neither. They think in Hindi, Tamil, Telugu, Bengali — with a queue at the counter and both
hands busy. Business software speaks English, expects typing, and answers with charts that need interpreting. The
phone is already in their pocket and speech is free — but their tools can't listen, and can't talk back. The best
analytics in the world are useless in the wrong language.

**[Slide 26 — existing solutions & the gap]**
Today the options are: struggle through an English dashboard, hire a munim for thousands a month — or stay blind,
which is the most common choice. BI dashboards serve analysts well. Accountants translate numbers into advice, at
a price. Generic chatbots chat — about nothing in your shop, and they happily invent numbers. No mainstream
business tool works end-to-end in eleven Indian languages, none listen, and none can act. Intelligence locked
behind language, literacy and a keyboard — that's the gap.

**[Slide 27 — our solution + AI architecture]**
Our answer: the whole app becomes a conversation. One tap on the globe switches everything — menus, cards,
tooltips — into eleven Indian languages; the UI catalog is LLM-translated once and cached. The Copilot answers
real questions from real data, and this diagram is exactly how — no hand-waving: the merchant speaks or types in
any language; intent is detected by keyword rules first — zero milliseconds for common questions; a command goes
to the action layer, a question triggers live data retrieval; the analysis — deltas, stockout overlaps — is
computed in code, with every rupee figure pre-formatted; and only then does the Sarvam LLM narrate the answer, in
the merchant's language. The green box is our guarantee: every number is computed by code — the model only
narrates. And the floating assistant doesn't just answer, it acts: "twenty packets Parle-G came" updates stock;
"Ramu paid fifty rupees" records a khata payment; bill requests come back as one-tap confirmations.

**[Slide 28 — live demo]**
Watch the wall come down. *(Open live demo → Dashboard.)* I tap the globe, pick Hindi — the entire app flips,
tooltips included. I open the assistant and say "dus packet Maggi aaye" — stock updated, instantly. Then I ask the
Copilot why sales dropped — it cross-references the dip days with stockout history and answers with exact rupee
figures, in Hindi, with an intent badge showing exactly which data path produced the answer. *(Back to deck.)*
Zero learning curve, works mid-queue, trustworthy numbers — and a reach of sixty million merchants.

---

## CLOSING SEQUENCE

**[Slide 29 — overall business impact]**
Step back, and the five solutions compound into one system. For the merchant: billing in seconds, one-glance day
close, stockouts prevented, udhaar recovered, insights in their own language. For the business: every sale becomes
clean, attributed data; customers get segmented and retained; hidden charges surface; and a verified cash-flow
history accumulates. For the platform: a daily-habit app, data imported from twelve rival tools, voice-first reach,
and rails for credit and commerce — across eleven languages. Each module feeds the next — bills create the data,
data powers the forecasts and segments, and AI makes it all usable. That's why it's one app, not five.

**[Slide 30 — future scope]**
Where does this go? Near term — all realistic next steps: a live Paytm transaction feed instead of synthetic data,
OAuth sync for Zoho and Shopify, WhatsApp invoice sharing and a daily digest, barcode billing, offline-first PWA.
Long term: that verified cash-flow history becomes the foundation for merchant credit; a supplier marketplace
closes the reorder loop the inventory module already opens; an ONDC storefront takes the catalog online;
multi-store support scales it up. The vision: the operating system for sixty million Indian small businesses.

**[Slide 31 — closing]**
One last thing. We didn't add AI to have AI. We put intelligence exactly where existing tools leave merchants
doing the thinking by hand. Every problem we showed is real; every existing tool got credit for what it does;
every AI answer is grounded in computed numbers; and everything you saw ran live — nothing was mocked. We are Team
Inertia — Dewanshu Chakraborty and Kunal Raj. Paytm VyaparGuru: vyapar ka guru, aapki jeb mein. Thank you.

---

## Demo-day checklist

1. Start backend: `cd apps/server` → `USE_IN_MEMORY_DB=true node src/server.js` (wait for "listening").
2. Start client: `npm run dev --workspace apps/client`.
3. Log in once at `http://localhost:5173` (ramesh@sharmastore.in / Paytm@123) so demo tabs are authenticated.
4. Open `http://localhost:5173/pitch`, press **F** for fullscreen.
5. Keys: **→** next, **←** back, demo buttons open the app in a new tab — close the tab to return to your slide.
