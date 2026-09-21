/**
 * Transaction model
 * Validation, create/update/delete, totals, and filtering.
 */

import {
  TRANSACTION_TYPES,
  TYPE_FILTERS,
  SORT_ORDERS,
  DEFAULT_CATEGORY,
  DEFAULT_FILTER,
  DEFAULT_SORT_ORDER,
  MIN_DATE_STRING,
  VALID_TYPE_FILTERS,
  VALID_SORT_ORDERS,
} from './constants.js';

const DESCRIPTION_MAX_LEN = 100;
const CATEGORY_MAX_LEN = 50;

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Parse an amount in currency units (e.g. "19.99", 5, "-2.50") into
 * signed integer cents, preserving the input sign.
 * Returns NaN for missing or non-numeric values.
 * @param {string|number} value
 * @returns {number}
 */
export function parseAmountToCents(value) {
  if (value == null) return NaN;
  const str = typeof value === 'string' ? value.trim() : value;
  if (str === '') return NaN;

  const n = Number(str);
  if (!Number.isFinite(n)) return NaN;

  return Math.round((n + Number.EPSILON) * 100);
}

/**
 * Normalize a category label: trim, collapse inner whitespace, and title-case words.
 * @param {string} category
 * @returns {string}
 */
export function normalizeCategory(category) {
  if (typeof category !== 'string') return '';
  return category
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * Parse YYYY-MM-DD into a local Date. Returns null for invalid input.
 * @param {string} dateStr
 * @returns {Date|null}
 */
export function parseDateYMD(dateStr) {
  if (typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

// Earliest allowed date.
const MIN_DATE = parseDateYMD(MIN_DATE_STRING);

/**
 * Validate transaction fields.
 * Amount must be a non-zero integer (amounts are stored in cents);
 * either sign is accepted (expenses are stored negative).
 * @param {Object} t
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateTransaction(t) {
  const errors = [];

  if (!t || typeof t !== 'object') {
    return { valid: false, errors: ['Transaction is required'] };
  }

  if (typeof t.description !== 'string' || !t.description.trim() || t.description.trim().length > DESCRIPTION_MAX_LEN) {
    errors.push('Description');
  }

  if (!Number.isFinite(t.amount) || Math.abs(t.amount) <= 0 || !Number.isInteger(t.amount)) {
    errors.push('Amount');
  }

  if (typeof t.category !== 'string' || !t.category.trim() || t.category.trim().length > CATEGORY_MAX_LEN) {
    errors.push('Category');
  }

  const date = parseDateYMD(t.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!date || date < MIN_DATE || date > today) {
    errors.push('Date');
  }

  if (t.type !== TRANSACTION_TYPES.INCOME && t.type !== TRANSACTION_TYPES.EXPENSE) {
    errors.push('Type');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Normalize an amount's sign to match its transaction type.
 * Expenses are stored negative, income positive.
 * @param {number} amount
 * @param {string} type
 * @returns {number}
 */
function normalizeAmount(amount, type) {
  const abs = Math.abs(Number(amount));
  return type === TRANSACTION_TYPES.EXPENSE ? -abs : abs;
}

/**
 * Convert raw form input into stored transaction shape (without an id).
 * Single boundary where form units become stored units: `amount` is parsed from currency units (e.g. '19.99') into signed integer cents.
 * Used by createTransaction, validateTransactionInput.
 * @param {Object} input
 * @returns {{description: string, amount: number, category: string, date: string, type: string}}
 */
export function normalizeTransactionInput(input) {
  const source = input || {};
  const type = source.type == null ? '' : String(source.type);

  return {
    description: String(source.description || '').trim(),
    amount: normalizeAmount(parseAmountToCents(source.amount), type),
    category: normalizeCategory(String(source.category || '')),
    date: String(source.date || '').trim(),
    type
  };
}

/**
 * Validate raw form input without throwing, so the UI can render per-field errors.
 * Reports the same error labels as validateTransaction.
 * @param {Object} input
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateTransactionInput(input) {
  return validateTransaction(normalizeTransactionInput(input));
}

/**
 * Create a new transaction from raw form input.
 * @param {Object} input
 * @returns {Object}
 */
export function createTransaction(input) {
  const transaction = normalizeTransactionInput(input);

  const { valid, errors } = validateTransaction(transaction);
  if (!valid) {
    throw new Error(`Invalid transaction: ${errors.join(', ')}`);
  }

  return {
    id: generateId(),
    ...transaction
  };
}

/**
 * Normalize and validate transactions loaded from storage.
 * Invalid records are dropped.
 * @param {Array} storedTransactions
 * @returns {Object[]}
 */
export function validateAndNormalizeStoredTransactions(storedTransactions) {
  if (!Array.isArray(storedTransactions)) return [];

  return storedTransactions
    .filter(t => t && typeof t === 'object')
    .map(t => {
      const type = t.type == null ? '' : String(t.type);
      const amount = Number(t.amount);

      return {
        id: String(t.id || '').trim(),
        description: String(t.description || '').trim(),
        amount: Number.isFinite(amount) ? normalizeAmount(Math.round(amount), type) : NaN,
        category: normalizeCategory(String(t.category || '')),
        date: String(t.date || '').trim(),
        type
      };
    })
    .filter(t => t.id && validateTransaction(t).valid);
}

// Fields a patch may change; `id` is never editable.
const UPDATABLE_FIELDS = ['description', 'amount', 'category', 'date', 'type'];

/**
 * Update an existing transaction in the list.
 * @param {Object[]} transactions
 * @param {string} id
 * @param {Object} updates normalized patch
 * @returns {{nextTransactions: Object[], updated: Object|null}}
 */
export function updateTransactionInList(transactions, id, updates = {}) {
  const index = transactions.findIndex(t => String(t.id) === String(id));
  if (index === -1) {
    return { nextTransactions: transactions, updated: null };
  }

  const updated = { ...transactions[index] };
  // null/undefined == "no changes".
  const patch = updates || {};

  UPDATABLE_FIELDS.forEach((field) => {
    if (Object.hasOwn(patch, field)) {
      updated[field] = patch[field];
    }
  });

  const { valid, errors } = validateTransaction(updated);
  if (!valid) {
    throw new Error(`Invalid transaction: ${errors.join(', ')}`);
  }

  const nextTransactions = [...transactions];
  nextTransactions[index] = updated;

  return { nextTransactions, updated };
}

/**
 * Remove a transaction by id.
 * @param {Object[]} transactions
 * @param {string} id
 * @returns {Object[]}
 */
export function removeTransactionById(transactions, id) {
  return transactions.filter(t => String(t.id) !== String(id));
}

/**
 * Sum of income amounts in integer cents (always positive).
 * @param {Object[]} transactions
 * @returns {number}
 */
export function totalIncome(transactions) {
  return transactions
    .filter(t => t.type === TRANSACTION_TYPES.INCOME)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

/**
 * Sum of expense amounts in integer cents (always positive).
 * @param {Object[]} transactions
 * @returns {number}
 */
export function totalExpenses(transactions) {
  return transactions
    .filter(t => t.type === TRANSACTION_TYPES.EXPENSE)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

/**
 * Balance = income - expenses (in integer cents).
 * @param {Object[]} transactions
 * @returns {number}
 */
export function balance(transactions) {
  return totalIncome(transactions) - totalExpenses(transactions);
}

/**
 * Group expense transactions by category.
 * @param {Object[]} transactions
 * @returns {Object[]} entries of { category, amountCents }, sorted by amountCents descending
 */
export function expensesByCategory(transactions) {
  const totals = new Map();

  transactions.forEach((t) => {
    if (t.type !== TRANSACTION_TYPES.EXPENSE) return;
    const category = t.category || DEFAULT_CATEGORY;
    totals.set(category, (totals.get(category) || 0) + Math.abs(t.amount));
  });

  return Array.from(totals, ([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

/**
 * Filter transactions by type ('all' includes every transaction).
 * Unknown values fall back to the default filter.
 * @param {Object[]} transactions
 * @param {string} type
 * @returns {Object[]}
 */
export function filterByType(transactions, type) {
  if (!VALID_TYPE_FILTERS.includes(type)) {
    return filterByType(transactions, DEFAULT_FILTER);
  }
  if (type === TYPE_FILTERS.ALL) {
    return transactions;
  }
  return transactions.filter(t => t.type === type);
}

/**
 * Sort transactions by the given sort order.
 * Unknown values fall back to the default sort order.
 * Returns a new array.
 * @param {Object[]} transactions
 * @param {string} sortOrder
 * @returns {Object[]}
 */
export function sortTransactions(transactions, sortOrder = DEFAULT_SORT_ORDER) {
  if (!VALID_SORT_ORDERS.includes(sortOrder)) {
    sortOrder = DEFAULT_SORT_ORDER;
  }
  const sorted = [...transactions];

  const toTime = (dateStr) => parseDateYMD(dateStr)?.getTime() || 0;

  switch (sortOrder) {
    case SORT_ORDERS.DATE_OLDEST:
      sorted.sort((a, b) => toTime(a.date) - toTime(b.date));
      break;
    case SORT_ORDERS.AMOUNT_HIGH:
      sorted.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      break;
    case SORT_ORDERS.AMOUNT_LOW:
      sorted.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
      break;
    case SORT_ORDERS.DESCRIPTION_AZ:
      sorted.sort((a, b) => String(a.description || '').localeCompare(String(b.description || '')));
      break;
    case SORT_ORDERS.DESCRIPTION_ZA:
      sorted.sort((a, b) => String(b.description || '').localeCompare(String(a.description || '')));
      break;
    case SORT_ORDERS.DATE_NEWEST:
    default:
      sorted.sort((a, b) => toTime(b.date) - toTime(a.date));
      break;
  }

  return sorted;
}
