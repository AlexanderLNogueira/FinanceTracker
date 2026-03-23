/**
 * Shared date range filtering for transactions
 */

/**
 * Filter transactions by date range
 * @param {Array} transactions - Array of transactions
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

  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= startDate && transactionDate <= now;
  });
}
