/**
 * Base (English) UI string catalog. Keys are stable ids; the server translates
 * the values into the selected Indian language via the LLM and the result is
 * cached per language. Card info tooltips live here too.
 */
export const BASE_STRINGS = {
  // Navigation & chrome
  'nav.home': 'Home',
  'nav.cashflow': 'Cash Flow',
  'nav.inventory': 'Inventory',
  'nav.copilot': 'Copilot',
  'nav.integrations': 'Integrations',
  'nav.team': 'Team',
  'nav.logout': 'Logout',

  // Dashboard
  'dash.needsAttention': 'Needs attention',
  'dash.today': 'Today',
  'dash.thisWeek': 'This Week',
  'dash.forecast': 'Next 30 Days (forecast)',
  'dash.hiddenCharges': 'Hidden Charges',
  'dash.revenue30': 'Revenue — last 30 days',
  'dash.ask': 'Ask VyaparGuru',
  'dash.openCopilot': 'Open Copilot →',
  'dash.transactions': 'transactions',
  'dash.vsLastWeek': 'last week',
  'dash.bestSeller': 'Best seller',
  'dash.weakest': 'Weakest',
  'dash.cashflowCard': '💰 Cash Flow Clarity',
  'dash.cashflowCardDesc': 'Daily net cash, expense breakdown, hidden charges and the 30-day forecast.',
  'dash.inventoryCard': '📦 Inventory Intelligence',

  // Card info tooltips
  'info.today': "Money collected today across all payment modes, updated live from your transactions.",
  'info.thisWeek': 'Revenue over the last 7 days, compared with the 7 days before — the arrow shows the change.',
  'info.forecast': 'Projected net cash flow for the next 30 days from your sales history, adjusted for upcoming festivals.',
  'info.hiddenCharges': 'Small recurring charges (subscriptions, fees) detected automatically in your expense history.',
  'info.revenue30': 'Daily revenue for the last 30 days — dips often line up with stockouts of fast-selling items.',
  'info.needsAttention': 'Urgent items: products about to run out of stock and dead stock locking up your cash.',

  // Page titles/subtitles
  'copilot.title': 'Sales & Growth Copilot',
  'copilot.subtitle': 'Ask in your language — every answer is built only from your real Paytm data.',
  'integrations.title': 'Integrations',
  'integrations.subtitle': 'Bring in data from the other apps you run your business on — khata ledgers, accounting, online stores, POS. Imported records flow straight into Cash Flow, Inventory and the Copilot.',
  'team.title': 'Team & Access',
  'team.subtitle': 'Give staff their own logins. Staff can see the business data but only owners can manage the team and integrations.',
  'team.add': 'Add staff member',
  'team.name': 'Name',
  'team.email': 'Email',
  'team.password': 'Password',
  'team.remove': 'Remove',
  'team.staffNote': 'You are signed in as staff — only the owner can manage the team.',

  // Billing
  'billing.title': 'Billing & Khata',
  'billing.subtitle': 'Fast billing, printable invoices, returns, udhaar tracking and end-of-day reconciliation — all in one place.',
  'billing.newBill': '🧾 New Bill',
  'billing.register': '📋 Register',
  'billing.khata': '📒 Khata',
  'nav.billing': 'Billing',

  // Customers
  'nav.customers': 'Customers',
  'customers.title': 'Customer Intelligence',
  'customers.subtitle': 'Tag customers on bills and VyaparGuru tracks regulars, VIPs, buying patterns and churn risk automatically.',
  'customers.total': 'Customers',
  'customers.repeatRate': 'Repeat Rate',
  'customers.atRisk': 'Need Attention',
  'customers.udhaarOut': 'Udhaar Outstanding',
  'customers.info.total': 'Everyone who has been tagged on at least one bill. Tag customers at the Billing counter — tracking is automatic from there.',
  'customers.info.repeatRate': 'The share of customers who came back for a second purchase. Rising repeat rate means your retention is working.',
  'customers.info.atRisk': 'Customers absent much longer than their usual visiting rhythm (at-risk) or gone entirely (churned). Open a customer to see the likely reason.',
  'customers.info.udhaarOut': 'Total credit currently outstanding across all khata customers.',

  // Assistant
  'assistant.title': 'VyaparGuru Assistant',
  'assistant.hint': 'Tap the mic and ask anything — your sales, stock, or how to use the app.',
  'assistant.listening': 'Listening… tap to stop',
  'assistant.thinking': 'Thinking…',
  'assistant.placeholder': 'Or type your question…',

  // Common
  'common.loading': 'Loading…',
  'common.retry': 'Retry',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
};
