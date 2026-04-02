/**
 * localStorage management module
 * Handles all persistence operations for the Finance Tracker
 */

const STORAGE_KEY = 'finance_tracker_transactions';
let saveTimeout = null;
let pendingTransactions = null;
let pendingOnError = null;

/**
 * Save transactions to localStorage
 * @param {import('../types.js').Transaction[]} transactions - Array of transaction objects
 * @param {Function} [onError] - Error callback
 */
export function saveTransactions(transactions, onError) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  pendingTransactions = transactions;
  pendingOnError = onError;

  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Failed to save transactions to localStorage:', error);
      if (typeof onError === 'function') {
        onError(error);
      }
    }
    saveTimeout = null;
    pendingTransactions = null;
    pendingOnError = null;
  }, 300);
}

/**
 * Flush pending debounced saves
 */
export function flushPendingSave() {
  if (!saveTimeout || !pendingTransactions) {
    return;
  }

  clearTimeout(saveTimeout);
  saveTimeout = null;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingTransactions));
  } catch (error) {
    console.error('Failed to save transactions to localStorage:', error);
    if (typeof pendingOnError === 'function') {
      pendingOnError(error);
    }
  }

  pendingTransactions = null;
  pendingOnError = null;
}

/**
 * Load transactions from localStorage
 * @returns {import('../types.js').Transaction[]} Array of transaction objects
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
