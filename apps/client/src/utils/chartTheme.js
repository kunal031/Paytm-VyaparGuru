/**
 * Chart palette — validated (dataviz six-checks) against the white card surface.
 * Categorical slots in fixed order; band/grid/ink are chrome tokens.
 */
export const CHART = {
  series1: '#2a78d6', // blue — slot 1
  series2: '#eb6834', // orange — slot 2
  band: '#cde2fb', // sequential blue 100, for confidence fills
  grid: '#e1e0d9',
  axis: '#898781',
  ink: '#52514e',
};

export const paiseToRupees = (p) => p / 100;

export const compactINR = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(paise / 100);

export const shortDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
