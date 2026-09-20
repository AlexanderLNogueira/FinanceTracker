// --- Shared display formatting (used by app.js and chart.js) ---

import { parseDateYMD } from './transactions.js';
import { DEFAULT_SETTINGS } from './settings.js';

/**
 * Format an amount in integer cents as a localized currency string.
 * Cents-to-dollars division, callers always pass cents.
 * @param {number} amountCents
 * @param {{currency: string, locale: string, theme?: string}} [settings]
 * @returns {string}
 */
export function formatCurrency(amountCents, settings = DEFAULT_SETTINGS) {
  const amount = Number(amountCents) / 100;
  return new Intl.NumberFormat(settings.locale, { style: 'currency', currency: settings.currency }).format(amount);
}

/**
 * Format a YYYY-MM-DD string as a localized date string.
 * @param {string} dateStr
 * @param {{locale: string}} [settings]
 * @returns {string}
 */
export function formatDate(dateStr, settings = DEFAULT_SETTINGS) {
  const date = parseDateYMD(dateStr);
  if (!date) return '';
  return new Intl.DateTimeFormat(settings.locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}