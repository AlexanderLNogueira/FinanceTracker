import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { saveTransactions, loadTransactions } from '../js/storage.js';
import { TRANSACTION_TYPES } from '../js/constants.js';
import { createLocalStorageMock, silenceExpectedConsoleErrors } from './support/local-storage.js';

// --- Browser localStorage before each test ---

beforeEach(() => {
  globalThis.localStorage = createLocalStorageMock();
  // Expected console.error calls from error-path tests.
  silenceExpectedConsoleErrors();
});

afterEach(() => {
  delete globalThis.localStorage;
  mock.restoreAll();
});

// --- Helpers ---

const STORAGE_KEY = 'finance_tracker_transactions';

function makeTransaction(overrides = {}) {
  return {
    id: 'tx-1',
    description: 'Salary',
    amount: 5000, // integer cents
    category: 'Work',
    date: '2024-01-15',
    type: TRANSACTION_TYPES.INCOME,
    ...overrides,
  };
}

describe('saveTransactions / loadTransactions', () => {
  it('saves and loads a round-trip of transactions', () => {
    const txns = [
      makeTransaction(),
      makeTransaction({ id: '2', description: 'Coffee', amount: -500, category: 'Food', date: '2024-01-16', type: 'Expense' }),
    ];
    saveTransactions(txns);
    assert.deepEqual(loadTransactions(), txns);
  });

  it('loads empty array when no data is stored', () => {
    assert.deepEqual(loadTransactions(), []);
  });

  it('loads empty array when corrupted JSON is stored', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, '{ not valid json');
    assert.deepEqual(loadTransactions(), []);
  });

  it('loads empty array when stored JSON is not a supported shape', () => {
    for (const value of ['text', 123, null, { version: 2 }, { transactions: 'nope' }]) {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      assert.deepEqual(loadTransactions(), []);
    }
  });

  it('writes the versioned envelope using saveTransactions', () => {
    const txns = [makeTransaction()];
    saveTransactions(txns);

    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw);
    assert.equal(parsed.version, 2);
    assert.deepEqual(parsed.transactions, txns);
  });

  it('migrates legacy v1 dollar-float amounts to integer cents', () => {
    const legacy = [
      { id: '1', description: 'Salary', amount: 1999.99, category: 'Work', date: '2024-01-15', type: 'Income' },
      { id: '2', description: 'Coffee', amount: -2.5, category: 'Food', date: '2024-01-16', type: 'Expense' },
      { id: '3', description: 'Rent', amount: 1000, category: 'Home', date: '2024-01-17', type: 'Expense' },
    ];
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    // 1999.99 -> 199999, -2.5 -> -250, whole dollars -> cents.
    assert.deepEqual(loadTransactions(), [
      { ...legacy[0], amount: 199999 },
      { ...legacy[1], amount: -250 },
      { ...legacy[2], amount: 100000 },
    ]);
  });

  it('saveTransactions throws on serialization error', () => {
    const circular = {};
    circular.self = circular;
    // "Converting circular structure to JSON".
    assert.throws(() => saveTransactions(circular), /circular/i);
  });
});
