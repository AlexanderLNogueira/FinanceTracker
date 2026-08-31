// --- Shared display formatting (used by app.js and chart.js) ---

import { parseDateYMD } from './transactions.js';

const LOCALE = 'en-US';
const CURRENCY = 'USD';

/**
 * Format an amount in integer cents as a localized currency string.
 * @param {number} amountCents
 * @returns {string}
 */
export function formatCurrency(amountCents) {
  const amount = Number(amountCents) / 100;
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(amount);
}

/**
 * Format a YYYY-MM-DD string as a localized date string.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  const date = parseDateYMD(dateStr);
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}