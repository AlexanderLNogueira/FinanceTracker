/**
 * Shared date range filtering for transactions
 */

import { parseDateYMD, startOfDay, endOfDay } from '../utils/date.js';

/**
 * Filter transactions by date range
 * @param {import('../types.js').Transaction[]} transactions - Array of transactions
 * @param {string} range - Date range ('all', '30days', '6months', '1year')
 * @returns {Array} Filtered transactions
 */
export function filterTransactionsByDateRange(transactions, range) {
  if (range === 'all') {
    return transactions;
  }

  const now = new Date();
  const startDate = new Date();

  switch (range) {
    case '30days':
      startDate.setDate(now.getDate() - 30);
      break;
    case '6months':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '1year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return transactions;
  }

  const rangeStart = startOfDay(startDate);
  const rangeEnd = endOfDay(now);

  return transactions.filter(transaction => {
    const transactionDate = parseDateYMD(transaction.date);
    if (!transactionDate) return false;
    return transactionDate >= rangeStart && transactionDate <= rangeEnd;
  });
}
