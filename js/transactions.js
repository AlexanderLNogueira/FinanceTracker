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
 * Amount must be a positive number regardless of sign (transactions
 * store expenses as negatives internally; both signs are valid here).
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

  if (!Number.isFinite(t.amount) || Math.abs(t.amount) <= 0) {
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
  const type = input.type === 'Expense' ? 'Expense' : 'Income';
  const transaction = {
    description: String(input.description || '').trim(),
    amount: normalizeAmount(input.amount, type),
    category: String(input.category || '').trim(),
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
    updated.category = updated.category.trim();
  }
  if (updated.amount !== undefined) {
    updated.amount = normalizeAmount(updated.amount, updated.type);
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
 * Sum of income amounts (always positive).
 * @param {Object[]} transactions
 * @returns {number}
 */
export function totalIncome(transactions) {
  return transactions
    .filter(t => t.type === 'Income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

/**
 * Sum of expense amounts (always positive).
 * @param {Object[]} transactions
 * @returns {number}
 */
export function totalExpenses(transactions) {
  return transactions
    .filter(t => t.type === 'Expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

/**
 * Balance = income - expenses.
 * @param {Object[]} transactions
 * @returns {number}
 */
export function balance(transactions) {
  return totalIncome(transactions) - totalExpenses(transactions);
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