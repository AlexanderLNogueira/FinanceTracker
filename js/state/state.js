/**
 * Application state
 * Owns in-memory state and notifies subscribers on changes
 */

import { loadTransactions } from '../data/storage.js';
import { normalizeStoredTransactions } from '../data/transactions.js';

const DEFAULT_FILTERS = {
  type: 'all',
  dateRange: 'all',
  searchQuery: ''
};

const DEFAULT_SORT = {
  by: 'date',
  ascending: false
};

const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 25
};

let state = {
  transactions: [],
  filters: { ...DEFAULT_FILTERS },
  sort: { ...DEFAULT_SORT },
  pagination: { ...DEFAULT_PAGINATION }
};

const listeners = new Set();

/**
 * Initialize state from storage
 */
export function initState() {
  const stored = loadTransactions();
  state = {
    ...state,
    transactions: normalizeStoredTransactions(stored)
  };
}

/**
 * Get current state
 * @returns {{transactions: import('../types.js').Transaction[], filters: import('../types.js').Filters, sort: import('../types.js').Sort, pagination: import('../types.js').Pagination}} state
 */
export function getState() {
  return state;
}

/**
 * Update state with partial data or updater function
 * @param {Partial<{transactions: import('../types.js').Transaction[], filters: import('../types.js').Filters, sort: import('../types.js').Sort, pagination: import('../types.js').Pagination}>|function(Object):Object} updater
 */
export function updateState(updater) {
  const nextPartial = typeof updater === 'function' ? updater(state) : updater;
  if (!nextPartial || typeof nextPartial !== 'object') {
    return;
  }

  state = {
    ...state,
    ...nextPartial
  };

  notify();
}

/**
 * Subscribe to > state changes
 * @param {Function} listener
 * @returns {Function} unsubscribe
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      console.error('State listener failed:', error);
    }
  });
}
