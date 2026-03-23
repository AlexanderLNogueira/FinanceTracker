/**
 * Simple application state module
 * Owns in-memory state for transactions and filters
 */

import { loadTransactions, saveTransactions } from '../data/storage.js';

const state = {
  transactions: [],
  filters: {
    type: 'all',
    dateRange: 'all',
    searchQuery: '',
    page: 1,
    pageSize: 25
  }
};

/**
 * Initialize state from storage
 */
export function initState() {
  const stored = loadTransactions();
  state.transactions = normalizeStoredTransactions(stored);
}

/**
 * Get transactions from state
 * @returns {Array} transactions
 */
export function getTransactions() {
  return state.transactions;
}

/**
 * Replace transactions in state and persist
 * @param {Array} transactions - new transactions
 */
export function setTransactions(transactions) {
  state.transactions = transactions;
  saveTransactions(state.transactions);
}

/**
 * Update filters
 * @param {Object} partial - partial filters
 */
export function setFilters(partial) {
  state.filters = {
    ...state.filters,
    ...partial
  };
}

/**
 * Get filters
 * @returns {Object} filters
 */
export function getFilters() {
  return state.filters;
}

function normalizeStoredTransactions(transactions) {
  if (!Array.isArray(transactions)) return [];

  return transactions.map((transaction) => {
    const normalized = { ...transaction };

    if (normalized.id === undefined || normalized.id === null) {
      normalized.id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
    } else {
      normalized.id = String(normalized.id);
    }

    const type = normalized.type === 'Expense' ? 'Expense' : 'Income';
    normalized.type = type;

    const amount = Number(normalized.amount);
    if (Number.isFinite(amount)) {
      normalized.amount = type === 'Expense' ? -Math.abs(amount) : Math.abs(amount);
    } else {
      normalized.amount = 0;
    }

    return normalized;
  });
}
