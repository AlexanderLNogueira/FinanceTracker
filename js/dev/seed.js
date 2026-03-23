/**
 * Seed helper for generating sample transactions
 */

import { addTransaction } from '../data/transactions.js';
import { renderTransactions, renderBalance } from '../ui/renderer.js';
import { formatDateForInput, showMessage } from '../utils/helpers.js';

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

export function seedDataInTransactionsTab(count = DEFAULT_COUNT, daysBack = DEFAULT_DAYS_BACK) {
  const total = normalizeCount(Number(count));
  const span = normalizeDaysBack(Number(daysBack));

  let added = 0;
  let failed = 0;

  for (let i = 0; i < total; i += 1) {
    const type = Math.random() < 0.5 ? 'Income' : 'Expense';
    const category = randomCategory(type);
    const transaction = {
      description: `${category} ${i + 1}`,
      amount: randomAmount(type),
      category,
      date: randomDate(span),
      type
    };

    try {
      addTransaction(transaction);
      added += 1;
    } catch (error) {
      failed += 1;
    }
  }

  renderTransactions();
  renderBalance();

  if (added > 0) {
    const summary = failed > 0
      ? `Seeded ${added} transactions (${failed} failed).`
      : `Seeded ${added} transactions.`;
    showMessage(summary, 'success');
  } else {
    showMessage('No transactions were seeded.', 'error');
  }

  return { added, failed };
}

export function attachSeedHelper() {
  window.seedDataInTransactionsTab = seedDataInTransactionsTab;
}
