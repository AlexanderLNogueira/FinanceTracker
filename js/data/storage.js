/**
 * localStorage management module
 * Handles all persistence operations for the Finance Tracker
 */

const STORAGE_KEY = 'finance_tracker_transactions';

/**
 * Save transactions to localStorage
 * @param {Array} transactions - Array of transaction objects
 */
export function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to save transactions to localStorage:', error);
    throw new Error('Unable to save data. Please check your browser settings.');
  }
}

/**
 * Load transactions from localStorage
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

/**
 * Clear all transactions from localStorage
 */
export function clearTransactions() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear transactions from localStorage:', error);
    throw new Error('Unable to clear data.');
  }
}