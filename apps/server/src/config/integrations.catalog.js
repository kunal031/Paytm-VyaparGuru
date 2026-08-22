/**
 * Catalog of third-party tools Indian SMBs already run their business on.
 * Every provider supports CSV/Excel export in its own app — our universal
 * import pipeline maps those files into VyaparGuru transactions/expenses/SKUs,
 * so imported data flows straight into Cash Flow, Inventory and the Copilot.
 *
 * `mapping` teaches the importer that provider's export headers; anything not
 * listed falls back to fuzzy generic detection.
 */
export const INTEGRATION_PROVIDERS = [
  // ---- Khata / Udhaar ledgers ----
  {
    id: 'khatabook',
    name: 'KhataBook',
    emoji: '📒',
    category: 'Khata & Udhaar',
    blurb: 'Digital ledger — import your customer khata entries (You Got / You Gave).',
    dataTypes: ['transactions'],
    mapping: {
      date: ['date'],
      amount: ['amount'],
      type: ['type'],
      name: ['customer name', 'name'],
      note: ['note'],
      creditWords: ['you got'],
      debitWords: ['you gave'],
    },
  },
  {
    id: 'okcredit',
    name: 'OkCredit',
    emoji: '🟢',
    category: 'Khata & Udhaar',
    blurb: 'Udhaar ledger — payments received and credit given, straight from your book.',
    dataTypes: ['transactions'],
    mapping: {
      date: ['date'],
      amount: ['amount'],
      type: ['type'],
      name: ['customer'],
      creditWords: ['payment'],
      debitWords: ['credit'],
    },
  },
  {
    id: 'vyapar',
    name: 'Vyapar',
    emoji: '📱',
    category: 'Khata & Udhaar',
    blurb: 'Billing & accounting app — sales, purchases, payment-in and payment-out.',
    dataTypes: ['transactions', 'products'],
    mapping: {
      date: ['date'],
      amount: ['amount', 'total'],
      type: ['txn type', 'transaction type', 'type'],
      name: ['party name', 'party'],
      creditWords: ['sale', 'payment-in', 'payment in'],
      debitWords: ['purchase', 'payment-out', 'payment out', 'expense'],
    },
  },

  // ---- Accounting & ERP ----
  {
    id: 'zoho-books',
    name: 'Zoho Books',
    emoji: '📗',
    category: 'Accounting & ERP',
    blurb: 'Cloud accounting — import invoices and expense exports.',
    dataTypes: ['transactions'],
    mapping: {
      date: ['invoice date', 'date'],
      amount: ['total', 'amount'],
      type: ['status'],
      name: ['customer name'],
      creditWords: ['paid', 'sent', 'overdue', 'draft'], // invoices are income entries
      debitWords: ['expense'],
    },
  },
  {
    id: 'tally',
    name: 'Tally ERP',
    emoji: '🧮',
    category: 'Accounting & ERP',
    blurb: 'Voucher exports — Sales, Purchase, Receipt and Payment vouchers.',
    dataTypes: ['transactions'],
    mapping: {
      date: ['date'],
      amount: ['amount'],
      type: ['voucher type', 'vch type'],
      name: ['party', 'particulars'],
      creditWords: ['sales', 'receipt'],
      debitWords: ['purchase', 'payment'],
    },
  },
  {
    id: 'marg',
    name: 'Marg ERP',
    emoji: '🖥️',
    category: 'Accounting & ERP',
    blurb: 'Pharma/FMCG distribution ERP — bill register and item exports.',
    dataTypes: ['transactions', 'products'],
    mapping: null,
  },

  // ---- Online commerce ----
  {
    id: 'shopify',
    name: 'Shopify',
    emoji: '🛍️',
    category: 'Online Commerce',
    blurb: 'D2C storefront — import order exports and your product catalog.',
    dataTypes: ['transactions', 'products'],
    mapping: {
      date: ['created at', 'date'],
      amount: ['total', 'total price'],
      type: ['financial status'],
      name: ['name', 'email'],
      creditWords: ['paid', 'partially_paid', 'pending'],
      debitWords: ['refunded'],
    },
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    emoji: '🛒',
    category: 'Online Commerce',
    blurb: 'WordPress store — order and product CSV exports.',
    dataTypes: ['transactions', 'products'],
    mapping: null,
  },
  {
    id: 'amazon-seller',
    name: 'Amazon Seller',
    emoji: '📦',
    category: 'Online Commerce',
    blurb: 'Marketplace settlements — order payment reports.',
    dataTypes: ['transactions', 'products'],
    mapping: {
      date: ['date/time', 'date'],
      amount: ['total', 'product sales'],
      type: ['type'],
      name: ['order id', 'description'],
      creditWords: ['order', 'refund reversal'],
      debitWords: ['refund', 'service fee', 'fee', 'adjustment'],
    },
  },
  {
    id: 'flipkart-seller',
    name: 'Flipkart Seller',
    emoji: '🧡',
    category: 'Online Commerce',
    blurb: 'Marketplace orders — settlement and order reports.',
    dataTypes: ['transactions', 'products'],
    mapping: null,
  },

  // ---- POS & Payments ----
  {
    id: 'petpooja',
    name: 'Petpooja',
    emoji: '🍽️',
    category: 'POS & Payments',
    blurb: 'Restaurant POS — daily sales report imports.',
    dataTypes: ['transactions'],
    mapping: null,
  },
  {
    id: 'bharatpe',
    name: 'BharatPe',
    emoji: '📲',
    category: 'POS & Payments',
    blurb: 'QR payments — transaction statement imports.',
    dataTypes: ['transactions'],
    mapping: null,
  },
];

export const PROVIDER_IDS = INTEGRATION_PROVIDERS.map((p) => p.id);
