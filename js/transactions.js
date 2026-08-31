/**
 * Transaction model
 * Validation, create/update/delete, totals, and filtering.
 */

const DESCRIPTION_MAX_LEN = 100;
const CATEGORY_MAX_LEN = 50;
const MIN_DATE = new Date(2000, 0, 1); // Earliest allowed date

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

  if (t.type !== 'Income' && t.type !== 'Expense') {
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
  return type === 'Expense' ? -abs : abs;
}

/**
 * Create a new transaction from raw input.
 * @param {Object} input
 * @returns {Object}
 */
export function createTransaction(input) {
  const type = input.type == null ? '' : String(input.type);
  const transaction = {
    description: String(input.description || '').trim(),
    amount: normalizeAmount(parseAmountToCents(input.amount), type),
    category: normalizeCategory(String(input.category || '')),
    date: String(input.date || '').trim(),
    type
  };

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

/**
 * Update an existing transaction in the list.
 * @param {Object[]} transactions
 * @param {string} id
 * @param {Object} updates
 * @returns {{nextTransactions: Object[], updated: Object|null}}
 */
export function updateTransactionInList(transactions, id, updates) {
  const index = transactions.findIndex(t => String(t.id) === String(id));
  if (index === -1) {
    return { nextTransactions: transactions, updated: null };
  }

  const updated = { ...transactions[index], ...updates };

  if (typeof updated.description === 'string') {
    updated.description = updated.description.trim();
  }
  if (typeof updated.category === 'string') {
    updated.category = normalizeCategory(updated.category);
  }
  if (updated.amount !== undefined) {
    updated.amount = normalizeAmount(parseAmountToCents(updated.amount), updated.type);
  }

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
    .filter(t => t.type === 'Income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

/**
 * Sum of expense amounts in integer cents (always positive).
 * @param {Object[]} transactions
 * @returns {number}
 */
export function totalExpenses(transactions) {
  return transactions
    .filter(t => t.type === 'Expense')
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
    if (t.type !== 'Expense') return;
    const category = t.category || 'Uncategorized';
    totals.set(category, (totals.get(category) || 0) + Math.abs(t.amount));
  });

  return Array.from(totals, ([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

/**
 * Filter transactions by type ('all', 'Income', 'Expense').
 * @param {Object[]} transactions
 * @param {string} type
 * @returns {Object[]}
 */
export function filterByType(transactions, type) {
  if (type === 'all' || type === '') {
    return transactions;
  }
  return transactions.filter(t => t.type === type);
}

/**
 * Sort transactions by the given sort order.
 * Returns new array.
 * @param {Object[]} transactions
 * @param {string} sortOrder
 * @returns {Object[]}
 */
export function sortTransactions(transactions, sortOrder = 'date-newest') {
  const sorted = [...transactions];

  const toTime = (dateStr) => parseDateYMD(dateStr)?.getTime() || 0;

  switch (sortOrder) {
    case 'date-oldest':
      sorted.sort((a, b) => toTime(a.date) - toTime(b.date));
      break;
    case 'amount-high':
      sorted.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      break;
    case 'amount-low':
      sorted.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
      break;
    case 'description-az':
      sorted.sort((a, b) => String(a.description || '').localeCompare(String(b.description || '')));
      break;
    case 'description-za':
      sorted.sort((a, b) => String(b.description || '').localeCompare(String(a.description || '')));
      break;
    case 'date-newest':
    default:
      sorted.sort((a, b) => toTime(b.date) - toTime(a.date));
      break;
  }

  return sorted;
}
