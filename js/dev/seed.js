/**
 * Seed helper for generating sample transactions
 */

import { addTransactionsBatch } from '../app/controller.js';
import { formatDateForInput } from '../utils/helpers.js';

const DEFAULT_COUNT = 150;
const DEFAULT_DAYS_BACK = 365;
const MAX_COUNT = 1000;

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Bonus',
  'Investment',
  'Gift'
];

const EXPENSE_CATEGORIES = [
  'Groceries',
  'Rent',
  'Utilities',
  'Transport',
  'Dining',
  'Health',
  'Entertainment'
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAmount(type) {
  if (type === 'Income') {
    return randomInt(200, 4000);
  }
  return randomInt(5, 600);
}

function randomDate(daysBack) {
  const safeDaysBack = Math.max(1, Math.floor(daysBack));
  const offset = randomInt(0, safeDaysBack - 1);
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return formatDateForInput(date);
}

function randomCategory(type) {
  if (type === 'Income') {
    return INCOME_CATEGORIES[randomInt(0, INCOME_CATEGORIES.length - 1)];
  }
  return EXPENSE_CATEGORIES[randomInt(0, EXPENSE_CATEGORIES.length - 1)];
}

function normalizeCount(value) {
  if (!Number.isFinite(value)) return DEFAULT_COUNT;
  const clamped = Math.min(Math.max(1, Math.floor(value)), MAX_COUNT);
  return clamped;
}

function normalizeDaysBack(value) {
  if (!Number.isFinite(value)) return DEFAULT_DAYS_BACK;
  return Math.max(1, Math.floor(value));
}

/**
 * Seed sample transactions into the app.
 * @param {number} [count]
 * @param {number} [daysBack]
 * @returns {{added:number, failed:number}}
 */
export function seedDataInTransactionsTab(count = DEFAULT_COUNT, daysBack = DEFAULT_DAYS_BACK) {
  const total = normalizeCount(Number(count));
  const span = normalizeDaysBack(Number(daysBack));

  const batch = [];
  for (let i = 0; i < total; i += 1) {
    const type = Math.random() < 0.5 ? 'Income' : 'Expense';
    const category = randomCategory(type);
    batch.push({
      description: `${category} ${i + 1}`,
      amount: randomAmount(type),
      category,
      date: randomDate(span),
      type
    });
  }

  return addTransactionsBatch(batch, { showToast: true });
}

/**
 * Expose seed helper on window for debugging.
 */
export function attachSeedHelper() {
  window.seedDataInTransactionsTab = seedDataInTransactionsTab;
}
