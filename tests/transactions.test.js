import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDateYMD,
  parseAmountToCents,
  normalizeCategory,
  normalizeTransactionInput,
  validateTransaction,
  validateTransactionInput,
  createTransaction,
  updateTransactionInList,
  removeTransactionById,
  validateAndNormalizeStoredTransactions,
  totalIncome,
  totalExpenses,
  balance,
  expensesByCategory,
  filterByType,
  sortTransactions,
} from '../js/transactions.js';
import { TRANSACTION_TYPES, TYPE_FILTERS, SORT_ORDERS, MIN_DATE_STRING } from '../js/constants.js';

// ---------- Helpers ----------

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

// Raw form input, before it crosses the form -> stored boundary.
function rawInput(overrides = {}) {
  return {
    description: 'Coffee',
    amount: '4.55',
    category: 'food',
    date: '2024-03-01',
    type: 'Expense',
    ...overrides,
  };
}

// ---------- parseDateYMD ----------

describe('parseDateYMD', () => {
  it('parses a valid YYYY-MM-DD string', () => {
    const d = parseDateYMD('2024-01-15');
    assert.ok(d instanceof Date);
    assert.equal(d.getFullYear(), 2024);
    assert.equal(d.getMonth(), 0); // January
    assert.equal(d.getDate(), 15);
  });

  it('returns null for malformed dates and non-string input', () => {
    ['01/15/2024', '2024-1-5', 'not-a-date', '', null, undefined, 20240115].forEach((value) => {
      assert.equal(parseDateYMD(value), null);
    });
  });

  it('returns null for impossible calendar dates', () => {
    ['2024-02-30', '2024-13-01', '2024-00-15'].forEach((value) => {
      assert.equal(parseDateYMD(value), null);
    });
  });
});

// ---------- parseAmountToCents ----------

describe('parseAmountToCents', () => {
  it('converts strings and numbers into signed integer cents', () => {
    assert.equal(parseAmountToCents('19.99'), 1999);
    assert.equal(parseAmountToCents('0.05'), 5);
    assert.equal(parseAmountToCents('1'), 100);
    assert.equal(parseAmountToCents(5), 500);
    assert.equal(parseAmountToCents(19.99), 1999);
    assert.equal(parseAmountToCents('-2.5'), -250); // sign is preserved, hopefully
    assert.equal(parseAmountToCents('-0.10'), -10);
  });

  it('rounds float noise away when converting to cents', () => {
    assert.equal(parseAmountToCents('1.005'), 101);
    assert.equal(parseAmountToCents('2.675'), 268);
    assert.equal(parseAmountToCents('0.615'), 62);
  });

  it('returns NaN for missing or non-numeric input', () => {
    ['abc', '', '   ', null, undefined].forEach((value) => {
      assert.ok(Number.isNaN(parseAmountToCents(value)));
    });
  });
});

// ---------- normalizeCategory ----------

describe('normalizeCategory', () => {
  it('trims, collapses whitespace and title-cases words', () => {
    assert.equal(normalizeCategory('  Food  '), 'Food');
    assert.equal(normalizeCategory('mobile   data'), 'Mobile Data');
    assert.equal(normalizeCategory('groceries'), 'Groceries');
    assert.equal(normalizeCategory('rent'), 'Rent');
  });

  it('returns empty string for non-string input', () => {
    assert.equal(normalizeCategory(null), '');
    assert.equal(normalizeCategory(undefined), '');
  });
});

// ---------- validateTransaction ----------

describe('validateTransaction', () => {
  it('accepts a fully valid transaction', () => {
    const { valid, errors } = validateTransaction(makeTransaction());
    assert.equal(valid, true);
    assert.deepEqual(errors, []);
  });

  it('rejects non-object input', () => {
    const { valid, errors } = validateTransaction(null);
    assert.equal(valid, false);
    assert.equal(errors[0], 'Transaction is required');
  });

  it('accepts negative amounts, since expenses are stored negative', () => {
    assert.equal(validateTransaction(makeTransaction({ amount: -5, type: 'Expense' })).valid, true);
  });

  it('accepts the earliest allowed date', () => {
    assert.equal(validateTransaction(makeTransaction({ date: MIN_DATE_STRING })).valid, true);
  });

  it('rejects each invalid field with its own label', () => {
    const cases = [
      ['empty description', { description: '' }, 'Description'],
      ['over-long description', { description: 'x'.repeat(101) }, 'Description'],
      ['zero amount', { amount: 0 }, 'Amount'],
      ['NaN amount', { amount: NaN }, 'Amount'],
      ['non-integer amount', { amount: 19.99 }, 'Amount'],
      ['empty category', { category: '' }, 'Category'],
      ['over-long category', { category: 'x'.repeat(51) }, 'Category'],
      ['future date', { date: '2999-01-01' }, 'Date'],
      ['date before the earliest allowed', { date: '1999-12-31' }, 'Date'],
      ['unknown type', { type: 'Transfer' }, 'Type'],
    ];

    cases.forEach(([name, overrides, label]) => {
      const { valid, errors } = validateTransaction(makeTransaction(overrides));
      assert.equal(valid, false, `${name} should be invalid`);
      assert.ok(errors.includes(label), `${name} should report ${label}`);
    });
  });
});

// ---------- validateTransactionInput ----------

describe('validateTransactionInput', () => {
  it('accepts raw form input without throwing', () => {
    const { valid, errors } = validateTransactionInput(rawInput());
    assert.equal(valid, true);
    assert.deepEqual(errors, []);
  });

  it('reports every missing field and an unknown type', () => {
    const { valid, errors } = validateTransactionInput({
      description: '',
      amount: '',
      category: '',
      date: '',
      type: 'Expense',
    });

    assert.equal(valid, false);
    assert.deepEqual(errors, ['Description', 'Amount', 'Category', 'Date']);

    assert.deepEqual(validateTransactionInput(rawInput({ type: 'Transfer' })).errors, ['Type']);
  });

  it('rejects zero and non-numeric amounts', () => {
    assert.ok(validateTransactionInput(rawInput({ amount: '0' })).errors.includes('Amount'));
    assert.ok(validateTransactionInput(rawInput({ amount: 'abc' })).errors.includes('Amount'));
  });

  it('accepts amounts with more than 2 decimals', () => {
    assert.equal(validateTransactionInput(rawInput({ amount: '1.005' })).valid, true);
  });

  it('reports dates outside the allowed range', () => {
    assert.ok(validateTransactionInput(rawInput({ date: '1999-12-31' })).errors.includes('Date'));
    assert.ok(validateTransactionInput(rawInput({ date: '2999-01-01' })).errors.includes('Date'));
  });

  it('never throws, even for empty or missing input', () => {
    [{}, null, undefined, 'nope'].forEach((input) => {
      assert.equal(validateTransactionInput(input).valid, false);
    });
  });
});

// ---------- normalizeTransactionInput ----------

describe('normalizeTransactionInput', () => {
  it('converts raw form input into the stored shape without an id', () => {
    assert.deepEqual(
      normalizeTransactionInput({
        description: '  Coffee  ',
        amount: '4.55',
        category: '  food  ',
        date: ' 2024-03-01 ',
        type: 'Expense',
      }),
      {
        description: 'Coffee',
        amount: -455,
        category: 'Food',
        date: '2024-03-01',
        type: 'Expense',
      }
    );
  });

  it('signs the amount from the transaction type, ignoring the input sign', () => {
    assert.equal(normalizeTransactionInput({ amount: '10', type: 'Income' }).amount, 1000);
    assert.equal(normalizeTransactionInput({ amount: '-10', type: 'Income' }).amount, 1000);
    assert.equal(normalizeTransactionInput({ amount: '10', type: 'Expense' }).amount, -1000);
  });

  it('never throws on missing or malformed input', () => {
    [null, undefined, '', 42, {}].forEach((input) => {
      const normalized = normalizeTransactionInput(input);
      assert.equal(normalized.description, '');
      assert.equal(normalized.type, '');
      assert.ok(Number.isNaN(normalized.amount));
    });
  });
});

// ---------- createTransaction ----------

describe('createTransaction', () => {
  it('creates a transaction with a generated id and type-signed cents', () => {
    const income = createTransaction({
      description: 'Freelance',
      amount: '1000',
      category: 'Work',
      date: '2024-03-01',
      type: 'Income',
    });
    assert.ok(income.id);
    assert.equal(income.type, 'Income');
    assert.equal(income.amount, 100000);
    assert.equal(income.description, 'Freelance');

    const expense = createTransaction({
      description: 'Groceries',
      amount: '-50',
      category: 'Food',
      date: '2024-03-01',
      type: 'Expense',
    });
    assert.ok(expense.id);
    assert.notEqual(expense.id, income.id);
    assert.equal(expense.amount, -5000);
  });

  it('throws on invalid input or an unknown type', () => {
    assert.throws(
      () => createTransaction({ description: '', amount: 'abc', category: '', date: 'bad', type: 'Foo' }),
      /Invalid transaction/
    );

    assert.throws(
      () => createTransaction({
        description: 'Test',
        amount: '100',
        category: 'Misc',
        date: '2024-03-01',
        type: 'SomethingElse',
      }),
      /Invalid transaction: Type/
    );
  });
});

// ---------- validateAndNormalizeStoredTransactions ----------

describe('validateAndNormalizeStoredTransactions', () => {
  it('keeps valid stored transactions and normalizes their shape', () => {
    const result = validateAndNormalizeStoredTransactions([
      {
        id: 123,
        description: '  Groceries  ',
        amount: '50',
        category: '  Food  ',
        date: '2024-03-01',
        type: 'Expense',
      },
    ]);

    assert.deepEqual(result, [
      {
        id: '123',
        description: 'Groceries',
        amount: -50,
        category: 'Food',
        date: '2024-03-01',
        type: 'Expense',
      },
    ]);
  });

  it('drops invalid stored records and non-array input', () => {
    const valid = makeTransaction({ id: 'valid', amount: 25 });
    const result = validateAndNormalizeStoredTransactions([
      valid,
      null,
      'bad',
      makeTransaction({ id: '', amount: 25 }),
      makeTransaction({ id: 'bad-type', type: 'Transfer' }),
      makeTransaction({ id: 'bad-amount', amount: 'abc' }),
      makeTransaction({ id: 'bad-date', date: 'not-a-date' }),
    ]);

    assert.deepEqual(result, [valid]);
    assert.deepEqual(validateAndNormalizeStoredTransactions({}), []);
  });
});

// ---------- updateTransactionInList ----------

describe('updateTransactionInList', () => {
  const base = makeTransaction({ amount: 100 });

  it('applies a normalized patch, never changing the id or unknown keys', () => {
    const { nextTransactions, updated } = updateTransactionInList([base], base.id, {
      id: 'hacked',
      extra: true,
      description: 'Updated Desc',
      amount: -20000,
      category: 'UpdatedCat',
      date: '2024-06-01',
      type: 'Expense',
    });

    assert.equal(nextTransactions.length, 1);
    assert.equal(updated.id, base.id);
    assert.equal('extra' in updated, false);
    assert.equal(updated.description, 'Updated Desc');
    assert.equal(updated.amount, -20000); // cents applied as-is
    assert.equal(updated.type, 'Expense');
  });

  it('applies a partial patch without touching the stored amount', () => {
    const { updated } = updateTransactionInList([base], base.id, { description: 'Renamed' });
    assert.equal(updated.description, 'Renamed');
    assert.equal(updated.amount, 100);
  });

  it('accepts a null patch as "no changes" and accepts normalizeTransactionInput output', () => {
    assert.deepEqual(updateTransactionInList([base], base.id, null).updated, base);

    const patch = normalizeTransactionInput({
      description: 'Coffee',
      amount: '4.55',
      category: 'food',
      date: '2024-06-01',
      type: 'Expense',
    });
    const { updated } = updateTransactionInList([base], base.id, patch);
    assert.equal(updated.amount, -455);
    assert.equal(updated.category, 'Food');
    assert.equal(updated.type, 'Expense');
  });

  it('returns updated: null when the id is not found, without mutating the list', () => {
    const list = [base];
    const { nextTransactions, updated } = updateTransactionInList(list, 'nonexistent', {
      description: 'X',
    });

    assert.equal(updated, null);
    assert.equal(nextTransactions.length, 1);
    assert.equal(list[0].description, 'Salary');
  });

  it('throws when patch is invalid', () => {
    assert.throws(
      () => updateTransactionInList([base], base.id, { description: '' }),
      /Invalid transaction/
    );
    // Form-unit amount instead of cents must be rejected.
    assert.throws(
      () => updateTransactionInList([base], base.id, { amount: 19.99 }),
      /Invalid transaction: Amount/
    );
  });
});

// ---------- removeTransactionById ----------

describe('removeTransactionById', () => {
  it('removes the matching transaction without mutating original list', () => {
    const list = [makeTransaction({ id: 'a' }), makeTransaction({ id: 'b' })];
    const result = removeTransactionById(list, 'a');

    assert.deepEqual(result.map(t => t.id), ['b']);
    assert.equal(list.length, 2);
  });

  it('returns all when id not found', () => {
    const list = [makeTransaction({ id: 'a' })];
    assert.equal(removeTransactionById(list, 'zzz').length, 1);
  });
});

// ---------- totalIncome / totalExpenses / balance ----------

describe('totalIncome', () => {
  it('sums income as positive cents and ignores expenses', () => {
    const list = [
      makeTransaction({ type: 'Income', amount: 1000 }),
      makeTransaction({ type: 'Expense', amount: -50 }),
      makeTransaction({ type: 'Income', amount: 200 }),
    ];
    assert.equal(totalIncome(list), 1200);
    assert.equal(totalIncome([]), 0);
  });
});

describe('totalExpenses', () => {
  it('sums expenses as positive cents and ignores income', () => {
    const list = [
      makeTransaction({ type: 'Income', amount: 1000 }),
      makeTransaction({ type: 'Expense', amount: -50 }),
      makeTransaction({ type: 'Expense', amount: -30 }),
    ];
    assert.equal(totalExpenses(list), 80);
    assert.equal(totalExpenses([]), 0);
  });
});

describe('balance', () => {
  it('computes income minus expenses, including negative balances', () => {
    assert.equal(balance([
      makeTransaction({ type: 'Income', amount: 1000 }),
      makeTransaction({ type: 'Expense', amount: -300 }),
    ]), 700);

    assert.equal(balance([
      makeTransaction({ type: 'Income', amount: 100 }),
      makeTransaction({ type: 'Expense', amount: -200 }),
    ]), -100);
  });
});

// ---------- expensesByCategory ----------

describe('expensesByCategory', () => {
  it('groups expenses by category, sums cents and sorts by amount descending', () => {
    const list = [
      makeTransaction({ type: 'Expense', category: 'Food', amount: -1999 }),
      makeTransaction({ type: 'Expense', category: 'Food', amount: -501 }),
      makeTransaction({ type: 'Income', category: 'Work', amount: 500000 }),
      makeTransaction({ type: 'Expense', category: 'Transport', amount: -3000 }),
    ];

    assert.deepEqual(expensesByCategory(list), [
      { category: 'Transport', amountCents: 3000 },
      { category: 'Food', amountCents: 2500 },
    ]);
  });

  it('uses "Uncategorized" for a missing category and returns empty without expenses', () => {
    const uncategorized = [makeTransaction({ type: 'Expense', category: '', amount: -100 })];
    assert.deepEqual(expensesByCategory(uncategorized), [{ category: 'Uncategorized', amountCents: 100 }]);

    assert.deepEqual(expensesByCategory([]), []);
    assert.deepEqual(expensesByCategory([makeTransaction({ type: 'Income', amount: 5000 })]), []);
  });
});

// ---------- filterByType ----------

describe('filterByType', () => {
  const list = [
    makeTransaction({ type: 'Income' }),
    makeTransaction({ type: 'Expense' }),
    makeTransaction({ type: 'Income' }),
  ];

  it('returns all when type is "all"', () => {
    assert.equal(filterByType(list, TYPE_FILTERS.ALL).length, 3);
  });

  it('filters Income and Expense', () => {
    const income = filterByType(list, TRANSACTION_TYPES.INCOME);
    assert.equal(income.length, 2);
    assert.ok(income.every(t => t.type === TRANSACTION_TYPES.INCOME));

    const expense = filterByType(list, TRANSACTION_TYPES.EXPENSE);
    assert.equal(expense.length, 1);
    assert.ok(expense.every(t => t.type === TRANSACTION_TYPES.EXPENSE));
  });

  it('falls back to all for empty or unknown type values', () => {
    ['', 'bad-type', undefined].forEach((type) => {
      assert.equal(filterByType(list, type).length, 3);
    });
  });
});

// ---------- sortTransactions ----------

describe('sortTransactions', () => {
  // Mixed signs and magnitudes
  const list = [
    makeTransaction({ id: '1', date: '2024-01-10', description: 'Zebra', amount: 1000, type: 'Income' }),
    makeTransaction({ id: '2', date: '2024-03-05', description: 'Apple', amount: -500, type: 'Expense' }),
    makeTransaction({ id: '3', date: '2024-02-20', description: 'Mango', amount: 200, type: 'Income' }),
  ];

  it('does not mutate the original array', () => {
    const original = [...list];
    sortTransactions(list, SORT_ORDERS.DATE_NEWEST);
    assert.deepEqual(
      list.map(t => t.id),
      original.map(t => t.id)
    );
  });

  it('defaults to date-newest for a missing or unknown sort order', () => {
    assert.equal(sortTransactions(list).at(0).id, '2');
    assert.equal(sortTransactions(list, 'unknown-sort').at(0).id, '2');
  });

  it('sorts by date-newest (newest first)', () => {
    const result = sortTransactions(list, SORT_ORDERS.DATE_NEWEST);
    assert.deepEqual(result.map(t => t.id), ['2', '3', '1']);
  });

  it('sorts by date-oldest (oldest first)', () => {
    const result = sortTransactions(list, SORT_ORDERS.DATE_OLDEST);
    assert.deepEqual(result.map(t => t.id), ['1', '3', '2']);
  });

  it('sorts by amount-high (largest magnitude first, regardless of sign)', () => {
    const result = sortTransactions(list, SORT_ORDERS.AMOUNT_HIGH);
    assert.deepEqual(result.map(t => t.id), ['1', '2', '3']); // +1000, -500, +200
  });

  it('sorts by amount-low (smallest magnitude first, regardless of sign)', () => {
    const result = sortTransactions(list, SORT_ORDERS.AMOUNT_LOW);
    assert.deepEqual(result.map(t => t.id), ['3', '2', '1']); // +200, -500, +1000
  });

  it('sorts by description-az', () => {
    const result = sortTransactions(list, SORT_ORDERS.DESCRIPTION_AZ);
    assert.deepEqual(result.map(t => t.description), ['Apple', 'Mango', 'Zebra']);
  });

  it('sorts by description-za', () => {
    const result = sortTransactions(list, SORT_ORDERS.DESCRIPTION_ZA);
    assert.deepEqual(result.map(t => t.description), ['Zebra', 'Mango', 'Apple']);
  });
});
