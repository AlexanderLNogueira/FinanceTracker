// --- Storage: localStorage persistence ---

const STORAGE_KEY = 'finance_tracker_transactions';

/**
 * Save transactions to localStorage.
 * @param {Array} transactions
*/
export function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to save transactions to localStorage:', error);
    throw error;
  }
}

/**
 * Load transactions from localStorage.
 * @returns {Array} Array of transaction objects
 */
export function loadTransactions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load transactions from localStorage:', error);
    return [];
  }
}