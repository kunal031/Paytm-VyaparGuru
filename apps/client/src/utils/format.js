/** Monetary values travel as integer paise; format to ₹ for display only. */
export function formatPaise(paise, { compact = false } = {}) {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    ...(compact ? { notation: 'compact' } : {}),
  }).format(rupees);
}

export function formatDate(dateLike) {
  return new Date(dateLike).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
