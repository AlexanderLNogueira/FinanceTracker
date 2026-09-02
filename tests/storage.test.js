import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { saveTransactions, loadTransactions } from '../js/storage.js';
import { TRANSACTION_TYPES } from '../js/constants.js';

// --- In-memory localStorage ---

function createLocalStorageMock() {
  let store = {};
  return {
    getItem(key) {
      return key in store ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
}

// --- Browser localStorage before each test ---

beforeEach(() => {
  globalThis.localStorage = createLocalStorageMock();
});

// Expected console.error calls from error-path tests.
beforeEach(() => {
  mock.method(console, 'error', () => {});
});

afterEach(() => {
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

// --- Tests ---

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
    ];
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadTransactions();
    assert.equal(loaded[0].amount, 199999);
    assert.equal(loaded[1].amount, -250);
    assert.equal(loaded.length, 2);
  });

  it('migrates legacy whole-dollar amounts to cents', () => {
    const legacy = [
      { id: '1', description: 'Salary', amount: 1000, category: 'Work', date: '2024-01-15', type: 'Income' },
    ];
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    assert.deepEqual(loadTransactions(), [{ ...legacy[0], amount: 100000 }]);
  });

  it('saves multiple transactions correctly', () => {
    const txns = [
      makeTransaction({ id: 'a', description: 'A', amount: 1000, category: 'C', date: '2024-01-01', type: 'Income' }),
      makeTransaction({ id: 'b', description: 'B', amount: -2000, category: 'C', date: '2024-01-02', type: 'Expense' }),
      makeTransaction({ id: 'c', description: 'C', amount: 3000, category: 'C', date: '2024-01-03', type: 'Income' }),
    ];
    saveTransactions(txns);
    assert.deepEqual(loadTransactions(), txns);
  });

  it('overwrites previous data on new save', () => {
    saveTransactions([makeTransaction({ id: 'old', description: 'Old', amount: 100, date: '2024-01-01' })]);
    saveTransactions([makeTransaction({ id: 'new', description: 'New', amount: 200, date: '2024-01-02' })]);
    const loaded = loadTransactions();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].id, 'new');
  });

  it('saveTransactions throws on serialization error', () => {
    const circular = {};
    circular.self = circular;
    assert.throws(() => saveTransactions(circular), /Converting circular structure to JSON/);
  });
});
