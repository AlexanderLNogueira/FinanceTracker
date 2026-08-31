// --- Storage: localStorage persistence ---

const STORAGE_KEY = 'finance_tracker_transactions';
const STORAGE_VERSION = 2;

/**
 * Convert a legacy v1 transaction amount from dollars (float) to integer cents.
 * @param {*} dollarAmount
 * @returns {number}
 */
function dollarsToCents(dollarAmount) {
  const n = Number(dollarAmount);
  if (!Number.isFinite(n)) return NaN;
  return Math.round((n + Number.EPSILON) * 100);
}

/**
 * Save transactions to localStorage as a versioned envelope.
 * @param {Array} transactions
 */
export function saveTransactions(transactions) {
  try {
    const payload = JSON.stringify({ version: STORAGE_VERSION, transactions });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (error) {
    console.error('Failed to save transactions to localStorage:', error);
    throw error;
  }
}

/**
 * Load transactions from localStorage.
 * Handles the current versioned envelope and migrates legacy
 * v1 flat arrays (dollar-float amounts) to integer cents.
 * @returns {Array} Array of transaction objects
 */
export function loadTransactions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data);

    // Legacy v1: flat array of transactions with dollar-float amounts.
    if (Array.isArray(parsed)) {
      return parsed.map((t) => {
        if (!t || typeof t !== 'object') return t;
        return { ...t, amount: dollarsToCents(t.amount) };
      });
    }

    // Current v2: versioned envelope.
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.transactions)) {
      return parsed.transactions;
    }

    return [];
  } catch (error) {
    console.error('Failed to load transactions from localStorage:', error);
    return [];
  }
}