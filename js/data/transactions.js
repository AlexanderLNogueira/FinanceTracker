/**
 * Transaction data operations module
 * Handles all business logic for transaction management
 */

import { getTransactions, setTransactions, getFilters, setFilters } from '../state/state.js';
import { filterTransactionsByDateRange } from './dateRange.js';

/**
 * Generate a unique ID for new transactions
 * @returns {string} Unique transaction ID
 */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Validate a transaction object
 * @param {Object} transaction - Transaction data
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateTransaction(transaction) {
  const errors = [];

  if (!transaction || typeof transaction !== 'object') {
    return { valid: false, errors: ['Transaction is required'] };
  }

  if (typeof transaction.description !== 'string' || transaction.description.trim() === '') {
    errors.push('Description');
  }

  if (!Number.isFinite(transaction.amount) || Math.abs(transaction.amount) <= 0) {
    errors.push('Amount');
  }

  if (typeof transaction.category !== 'string' || transaction.category.trim() === '') {
    errors.push('Category');
  }

  if (typeof transaction.date !== 'string' || transaction.date.trim() === '') {
    errors.push('Date');
  } else {
    const parsed = new Date(transaction.date);
    if (Number.isNaN(parsed.getTime())) {
      errors.push('Date');
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsed > today) {
        errors.push('Date');
      }
    }
  }

  if (transaction.type !== 'Income' && transaction.type !== 'Expense') {
    errors.push('Type');
  }

  return { valid: errors.length === 0, errors };
}

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeAmount(amount, type) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return NaN;
  return type === 'Expense' ? -Math.abs(parsed) : Math.abs(parsed);
}

function resolveType(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'income') return 'Income';
  if (normalized === 'expense') return 'Expense';
  return null;
}

function normalizeTransactionInput(transactionData, options = {}) {
  const resolvedType = resolveType(transactionData.type);
  const amountType = resolvedType || 'Income';
  const normalized = {
    description: normalizeText(transactionData.description),
    amount: normalizeAmount(transactionData.amount, amountType),
    category: normalizeText(transactionData.category),
    date: normalizeText(transactionData.date),
    type: resolvedType || ''
  };

  if (options.allowId && transactionData.id !== undefined && transactionData.id !== null) {
    normalized.id = String(transactionData.id);
  }

  return normalized;
}

/**
 * Add a new transaction
 * @param {Object} transactionData - Transaction data without ID
 * @returns {Object} The created transaction with ID
 */
export function addTransaction(transactionData) {
  const normalized = normalizeTransactionInput(transactionData);
  const validation = validateTransaction(normalized);
  if (!validation.valid) {
    throw new Error(`Invalid transaction: ${validation.errors.join(', ')}`);
  }

  const newTransaction = {
    id: generateId(),
    ...normalized
  };

  const transactions = getTransactions();
  setTransactions([...transactions, newTransaction]);

  return newTransaction;
}

/**
 * Remove a transaction by ID
 * @param {string} id - Transaction ID to remove
 */
export function removeTransaction(id) {
  const normalizedId = String(id);
  const transactions = getTransactions();
  const filteredTransactions = transactions.filter(t => String(t.id) !== normalizedId);
  setTransactions(filteredTransactions);
}

/**
 * Get all transactions
 * @returns {Array} Array of all transactions
 */
export function getAllTransactions() {
  return getTransactions();
}

/**
 * Calculate total income
 * @returns {number} Total income amount
 */
export function calculateTotalIncome() {
  const transactions = getAllTransactions();
  return transactions
    .filter(t => t.type === 'Income')
    .reduce((total, t) => total + Math.abs(t.amount), 0);
}

/**
 * Calculate total expenses
 * @returns {number} Total expenses amount
 */
export function calculateTotalExpenses() {
  const transactions = getAllTransactions();
  return transactions
    .filter(t => t.type === 'Expense')
    .reduce((total, t) => total + Math.abs(t.amount), 0);
}

/**
 * Calculate balance (income - expenses)
 * @returns {number} Current balance
 */
export function calculateBalance() {
  return calculateTotalIncome() - calculateTotalExpenses();
}

/**
 * Sort transactions by a specific field
 * @param {string} sortBy - Field to sort by
 * @param {boolean} ascending - Sort order
 * @param {Array} transactions - Transactions to sort
 * @returns {Array} Sorted transactions
 */
export function sortTransactions(sortBy = 'date', ascending = false, transactions = []) {
  const list = [...transactions];

  return list.sort((a, b) => {
    let valueA, valueB;

    switch (sortBy) {
      case 'date':
        valueA = new Date(a.date);
        valueB = new Date(b.date);
        break;
      case 'amount':
        valueA = Math.abs(a.amount);
        valueB = Math.abs(b.amount);
        break;
      case 'description':
        valueA = a.description.toLowerCase();
        valueB = b.description.toLowerCase();
        break;
      case 'category':
        valueA = a.category.toLowerCase();
        valueB = b.category.toLowerCase();
        break;
      case 'type':
        valueA = a.type;
        valueB = b.type;
        break;
      default:
        valueA = new Date(a.date);
        valueB = new Date(b.date);
    }

    if (valueA < valueB) return ascending ? -1 : 1;
    if (valueA > valueB) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * Update an existing transaction
 * @param {string} id - Transaction ID to update
 * @param {Object} newData - New transaction data (partial updates allowed)
 * @returns {Object} Updated transaction
 */
export function updateTransaction(id, newData) {
  const normalizedId = String(id);
  const transactions = getTransactions();
  const transactionIndex = transactions.findIndex(t => String(t.id) === normalizedId);

  if (transactionIndex === -1) {
    throw new Error('Transaction not found');
  }

  const currentTransaction = transactions[transactionIndex];
  const updatedTransaction = {
    ...currentTransaction,
    ...newData
  };

  if (typeof updatedTransaction.description === 'string') {
    updatedTransaction.description = updatedTransaction.description.trim();
  }

  if (typeof updatedTransaction.category === 'string') {
    updatedTransaction.category = updatedTransaction.category.trim();
  }

  if (newData.type !== undefined) {
    const resolvedType = resolveType(newData.type);
    updatedTransaction.type = resolvedType || newData.type;
  }

  if (newData.amount !== undefined) {
    updatedTransaction.amount = normalizeAmount(newData.amount, updatedTransaction.type === 'Expense' ? 'Expense' : 'Income');
  } else if (newData.type !== undefined) {
    updatedTransaction.amount = normalizeAmount(Math.abs(currentTransaction.amount), updatedTransaction.type === 'Expense' ? 'Expense' : 'Income');
  }

  const validation = validateTransaction(updatedTransaction);
  if (!validation.valid) {
    throw new Error(`Invalid transaction: ${validation.errors.join(', ')}`);
  }

  const nextTransactions = [...transactions];
  nextTransactions[transactionIndex] = updatedTransaction;
  setTransactions(nextTransactions);

  return updatedTransaction;
}

/**
 * Clear all transactions
 */
export function clearAllTransactions() {
  setTransactions([]);
}

/**
 * Update filters
 * @param {Object} partial - filter updates
 */
export function updateTransactionFilters(partial) {
  setFilters(partial);
}

/**
 * Get filtered transactions based on current filters
 * @returns {Array} Filtered transactions
 */
export function getFilteredTransactions() {
  const transactions = getAllTransactions();
  const filters = getFilters();

  return applyFilters(transactions, filters);
}

/**
 * Get visible transactions (filtered + sorted)
 * @param {string} sortBy - Field to sort by
 * @param {boolean} ascending - Sort order
 * @returns {Array} Visible transactions
 */
export function getVisibleTransactions(sortBy = 'date', ascending = false) {
  const filtered = getFilteredTransactions();
  return sortTransactions(sortBy, ascending, filtered);
}

function applyFilters(transactions, filters) {
  let result = [...transactions];

  if (filters.type && filters.type !== 'all') {
    result = result.filter(t => t.type === filters.type);
  }

  if (filters.dateRange && filters.dateRange !== 'all') {
    result = filterTransactionsByDateRange(result, filters.dateRange);
  }

  if (filters.searchQuery && filters.searchQuery.trim() !== '') {
    const query = filters.searchQuery.trim().toLowerCase();
    result = result.filter((transaction) => {
      const description = String(transaction.description || '').toLowerCase();
      const category = String(transaction.category || '').toLowerCase();
      return description.includes(query) || category.includes(query);
    });
  }

  return result;
}

/**
 * Import transactions into state
 * @param {Array} imported - Array of raw transactions
 * @returns {{imported: number, skipped: number, invalid: number}}
 */
export function importTransactions(imported) {
  const current = getAllTransactions();
  const existingIds = new Set(current.map(t => String(t.id)));
  const nextTransactions = [...current];

  let importedCount = 0;
  let skippedCount = 0;
  let invalidCount = 0;

  imported.forEach((raw) => {
    const normalized = normalizeTransactionInput(raw, { allowId: true });
    const validation = validateTransaction(normalized);

    if (!validation.valid) {
      invalidCount += 1;
      return;
    }

    const id = normalized.id ? String(normalized.id) : generateId();
    if (existingIds.has(id)) {
      skippedCount += 1;
      return;
    }

    const transaction = {
      id,
      ...normalized
    };

    existingIds.add(id);
    nextTransactions.push(transaction);
    importedCount += 1;
  });

  setTransactions(nextTransactions);

  return { imported: importedCount, skipped: skippedCount, invalid: invalidCount };
}
