/**
 * Transaction data helpers
 */

import { filterTransactionsByDateRange } from './dateRange.js';
import { parseDateYMD } from '../utils/date.js';
import { PAGE_SIZES, DESCRIPTION_MAX_LEN, CATEGORY_MAX_LEN } from '../config/constants.js';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Validate transaction object.
 * @param {import('../types.js').Transaction} transaction
 * @returns {{valid:boolean, errors:string[]}}
 */
export function validateTransaction(transaction) {
  const errors = [];

  if (!transaction || typeof transaction !== 'object') {
    return { valid: false, errors: ['Transaction is required'] };
  }

  if (typeof transaction.description !== 'string' || transaction.description.trim() === '') {
    errors.push('Description');
  } else if (transaction.description.trim().length > DESCRIPTION_MAX_LEN) {
    errors.push('Description');
  }

  if (!Number.isFinite(transaction.amount) || Math.abs(transaction.amount) <= 0) {
    errors.push('Amount');
  }

  if (typeof transaction.category !== 'string' || transaction.category.trim() === '') {
    errors.push('Category');
  } else if (transaction.category.trim().length > CATEGORY_MAX_LEN) {
    errors.push('Category');
  }

  if (typeof transaction.date !== 'string' || transaction.date.trim() === '') {
    errors.push('Date');
  } else {
    const parsed = parseDateYMD(transaction.date);
    if (!parsed) {
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

/**
 * Normalize transaction input from UI / Import.
 * @param {Partial<import('../types.js').Transaction>} transactionData
 * @param {Object} [options]
 * @returns {Partial<import('../types.js').Transaction>}
 */
export function normalizeTransactionInput(transactionData, options = {}) {
  if (!transactionData || typeof transactionData !== 'object') {
    return {
      description: '',
      amount: NaN,
      category: '',
      date: '',
      type: ''
    };
  }

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
 * Normalize transactions from storage.
 * @param {import('../types.js').Transaction[]} transactions
 * @returns {import('../types.js').Transaction[]}
 */
export function normalizeStoredTransactions(transactions) {
  if (!Array.isArray(transactions)) return [];

  return transactions.map((transaction) => {
    const normalized = { ...transaction };

    if (normalized.id === undefined || normalized.id === null) {
      normalized.id = generateId();
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

/**
 * Build new validated transaction with id.
 * @param {Partial<import('../types.js').Transaction>} transactionData
 * @returns {import('../types.js').Transaction}
 */
export function buildNewTransaction(transactionData) {
  const normalized = normalizeTransactionInput(transactionData);
  const validation = validateTransaction(normalized);
  if (!validation.valid) {
    throw new Error(`Invalid transaction: ${validation.errors.join(', ')}`);
  }

  return {
    id: generateId(),
    ...normalized
  };
}

/**
 * Update transaction list and return next list + updated item.
 * @param {import('../types.js').Transaction[]} transactions
 * @param {string} id
 * @param {Partial<import('../types.js').Transaction>} newData
 * @returns {{nextTransactions: import('../types.js').Transaction[], updatedTransaction: import('../types.js').Transaction}}
 */
export function updateTransactionInList(transactions, id, newData) {
  const normalizedId = String(id);
  const index = transactions.findIndex(t => String(t.id) === normalizedId);

  if (index === -1) {
    throw new Error('Transaction not found');
  }

  const current = transactions[index];
  const updated = {
    ...current,
    ...newData
  };

  if (typeof updated.description === 'string') {
    updated.description = updated.description.trim();
  }

  if (typeof updated.category === 'string') {
    updated.category = updated.category.trim();
  }

  if (newData.type !== undefined) {
    const resolvedType = resolveType(newData.type);
    updated.type = resolvedType || newData.type;
  }

  if (newData.amount !== undefined) {
    updated.amount = normalizeAmount(newData.amount, updated.type === 'Expense' ? 'Expense' : 'Income');
  } else if (newData.type !== undefined) {
    updated.amount = normalizeAmount(Math.abs(current.amount), updated.type === 'Expense' ? 'Expense' : 'Income');
  }

  const validation = validateTransaction(updated);
  if (!validation.valid) {
    throw new Error(`Invalid transaction: ${validation.errors.join(', ')}`);
  }

  const nextTransactions = [...transactions];
  nextTransactions[index] = updated;

  return { nextTransactions, updatedTransaction: updated };
}

/**
 * Remove transaction by id.
 * @param {import('../types.js').Transaction[]} transactions
 * @param {string} id
 * @returns {import('../types.js').Transaction[]}
 */
export function removeTransactionById(transactions, id) {
  const normalizedId = String(id);
  return transactions.filter(t => String(t.id) !== normalizedId);
}

/**
 * Sum income transactions.
 * @param {import('../types.js').Transaction[]} transactions
 * @returns {number}
 */
export function calculateTotalIncome(transactions) {
  return transactions
    .filter(t => t.type === 'Income')
    .reduce((total, t) => total + Math.abs(t.amount), 0);
}

/**
 * Sum expense transactions.
 * @param {import('../types.js').Transaction[]} transactions
 * @returns {number}
 */
export function calculateTotalExpenses(transactions) {
  return transactions
    .filter(t => t.type === 'Expense')
    .reduce((total, t) => total + Math.abs(t.amount), 0);
}

/**
 * Calculate balance (income - expenses).
 * @param {import('../types.js').Transaction[]} transactions
 * @returns {number}
 */
export function calculateBalance(transactions) {
  return calculateTotalIncome(transactions) - calculateTotalExpenses(transactions);
}

/**
 * Sort transactions.
 * @param {string} sortBy
 * @param {boolean} ascending
 * @param {import('../types.js').Transaction[]} transactions
 * @returns {import('../types.js').Transaction[]}
 */
export function sortTransactions(sortBy = 'date', ascending = false, transactions = []) {
  const list = [...transactions];

  return list.sort((a, b) => {
    let valueA;
    let valueB;

    switch (sortBy) {
      case 'date':
        valueA = parseDateYMD(a.date) || new Date(0);
        valueB = parseDateYMD(b.date) || new Date(0);
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
        valueA = parseDateYMD(a.date) || new Date(0);
        valueB = parseDateYMD(b.date) || new Date(0);
    }

    const timeA = valueA instanceof Date ? valueA.getTime() : valueA;
    const timeB = valueB instanceof Date ? valueB.getTime() : valueB;

    if (timeA < timeB) return ascending ? -1 : 1;
    if (timeA > timeB) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * Apply type/date/search filters.
 * @param {import('../types.js').Transaction[]} transactions
 * @param {import('../types.js').Filters} filters
 * @returns {import('../types.js').Transaction[]}
 */
export function applyFilters(transactions, filters) {
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
 * Normalize page size.
 * @param {number} value
 * @param {number[]} allowed
 * @returns {number}
 */
export function normalizePageSize(value, allowed = PAGE_SIZES) {
  const size = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : allowed[0];
  return allowed.includes(size) ? size : allowed[0];
}

/**
 * Normalize page number.
 * @param {number} value
 * @param {number} totalPages
 * @returns {number}
 */
export function normalizePage(value, totalPages) {
  const page = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 1;
  if (page < 1) return 1;
  if (page > totalPages) return totalPages;
  return page;
}

/**
 * Paginate list of transactions.
 * @param {import('../types.js').Transaction[]} transactions
 * @param {import('../types.js').Pagination} pagination
 * @returns {{page:number, pageSize:number, totalItems:number, totalPages:number, pageTransactions: import('../types.js').Transaction[]}}
 */
export function paginateTransactions(transactions, pagination) {
  const pageSize = normalizePageSize(pagination.pageSize);
  const totalItems = transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = normalizePage(pagination.page, totalPages);
  const startIndex = (page - 1) * pageSize;
  const pageTransactions = transactions.slice(startIndex, startIndex + pageSize);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    pageTransactions
  };
}

/**
 * Import transactions into list and return counts.
 * @param {import('../types.js').Transaction[]} current
 * @param {Array<Partial<import('../types.js').Transaction>>} imported
 * @returns {{nextTransactions: import('../types.js').Transaction[], result:{imported:number, skipped:number, invalid:number}}}
 */
export function importTransactionsIntoList(current, imported) {
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

  return {
    nextTransactions,
    result: { imported: importedCount, skipped: skippedCount, invalid: invalidCount }
  };
}
