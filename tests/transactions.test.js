import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDateYMD,
  parseAmountToCents,
  normalizeCategory,
  validateTransaction,
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

// ---------- Helpers ----------

function makeTransaction(overrides = {}) {
  return {
    id: 'tx-1',
    description: 'Salary',
    amount: 5000, // integer cents
    category: 'Work',
    date: '2024-01-15',
    type: 'Income',
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

  it('returns null for invalid format', () => {
    assert.equal(parseDateYMD('01/15/2024'), null);
    assert.equal(parseDateYMD('2024-1-5'), null);
    assert.equal(parseDateYMD('not-a-date'), null);
    assert.equal(parseDateYMD(''), null);
  });

  it('returns null for impossible calendar dates', () => {
    assert.equal(parseDateYMD('2024-02-30'), null);
    assert.equal(parseDateYMD('2024-13-01'), null);
    assert.equal(parseDateYMD('2024-00-15'), null);
  });

  it('returns null for non-string input', () => {
    assert.equal(parseDateYMD(null), null);
    assert.equal(parseDateYMD(undefined), null);
    assert.equal(parseDateYMD(20240115), null);
  });
});

// ---------- parseAmountToCents ----------

describe('parseAmountToCents', () => {
  it('converts decimal strings to cents', () => {
    assert.equal(parseAmountToCents('19.99'), 1999);
    assert.equal(parseAmountToCents('0.05'), 5);
    assert.equal(parseAmountToCents('1'), 100);
  });

  it('preserves the input sign', () => {
    assert.equal(parseAmountToCents('-2.5'), -250);
    assert.equal(parseAmountToCents('-0.10'), -10);
  });

  it('accepts numeric input', () => {
    assert.equal(parseAmountToCents(5), 500);
    assert.equal(parseAmountToCents(19.99), 1999);
  });

  it('returns NaN for missing or non-numeric input', () => {
    assert.ok(Number.isNaN(parseAmountToCents('abc')));
    assert.ok(Number.isNaN(parseAmountToCents('')));
    assert.ok(Number.isNaN(parseAmountToCents('   ')));
    assert.ok(Number.isNaN(parseAmountToCents(null)));
    assert.ok(Number.isNaN(parseAmountToCents(undefined)));
  });
});

// ---------- normalizeCategory ----------

describe('normalizeCategory', () => {
  it('trims leading and trailing whitespace', () => {
    assert.equal(normalizeCategory('  Food  '), 'Food');
  });

  it('collapses inner whitespace', () => {
    assert.equal(normalizeCategory('mobile   data'), 'Mobile Data');
  });

  it('title-cases words', () => {
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

  it('rejects empty description', () => {
    const { valid, errors } = validateTransaction(makeTransaction({ description: '' }));
    assert.equal(valid, false);
    assert.ok(errors.includes('Description'));
  });

  it('rejects zero amount', () => {
    const { valid, errors } = validateTransaction(makeTransaction({ amount: 0 }));
    assert.equal(valid, false);
    assert.ok(errors.includes('Amount'));
  });

  it('accepts negative amounts (expenses stored as negative)', () => {
    const { valid } = validateTransaction(makeTransaction({ amount: -5, type: 'Expense' }));
    assert.equal(valid, true);
  });

  it('rejects NaN amounts', () => {
    const { valid, errors } = validateTransaction(makeTransaction({ amount: NaN }));
    assert.equal(valid, false);
    assert.ok(errors.includes('Amount'));
  });

  it('rejects non-integer amounts (amounts are stored in cents)', () => {
    const { valid, errors } = validateTransaction(makeTransaction({ amount: 19.99 }));
    assert.equal(valid, false);
    assert.ok(errors.includes('Amount'));
  });

  it('rejects future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 1);
    const futureStr = future.toISOString().slice(0, 10);
    const { valid, errors } = validateTransaction(makeTransaction({ date: futureStr }));
    assert.equal(valid, false);
    assert.ok(errors.includes('Date'));
  });

  it('rejects invalid type', () => {
    const { valid, errors } = validateTransaction(makeTransaction({ type: 'Transfer' }));
    assert.equal(valid, false);
    assert.ok(errors.includes('Type'));
  });

  it('rejects empty category', () => {
    const { valid, errors } = validateTransaction(makeTransaction({ category: '' }));
    assert.equal(valid, false);
    assert.ok(errors.includes('Category'));
  });
});

// ---------- createTransaction ----------

describe('createTransaction', () => {
  it('creates an income transaction with positive amount', () => {
    const t = createTransaction({
      description: 'Freelance',
      amount: '1000',
      category: 'Work',
      date: '2024-03-01',
      type: 'Income',
    });
    assert.ok(t.id);
    assert.equal(t.type, 'Income');
    assert.equal(t.amount, 100000);
    assert.equal(t.description, 'Freelance');
  });

  it('creates an expense transaction with negative amount', () => {
    const t = createTransaction({
      description: 'Groceries',
      amount: '50',
      category: 'Food',
      date: '2024-03-01',
      type: 'Expense',
    });
    assert.equal(t.type, 'Expense');
    assert.equal(t.amount, -5000);
  });

  it('normalizes a negative amount string for income', () => {
    const t = createTransaction({
      description: 'Bonus',
      amount: '-200',
      category: 'Work',
      date: '2024-03-01',
      type: 'Income',
    });
    assert.equal(t.amount, 20000);
  });

  it('trims description and category', () => {
    const t = createTransaction({
      description: '  Salary  ',
      amount: '1000',
      category: '  Work  ',
      date: '2024-03-01',
      type: 'Income',
    });
    assert.equal(t.description, 'Salary');
    assert.equal(t.category, 'Work');
  });

  it('parses decimal dollar amounts into integer cents', () => {
    const t = createTransaction({
      description: 'Groceries',
      amount: '19.99',
      category: 'Food',
      date: '2024-03-01',
      type: 'Expense',
    });
    assert.equal(t.amount, -1999);
  });

  it('parses whole-dollar strings into cents', () => {
    const t = createTransaction({
      description: 'Salary',
      amount: '1000',
      category: 'Work',
      date: '2024-03-01',
      type: 'Income',
    });
    assert.equal(t.amount, 100000);
  });

  it('title-cases and collapses whitespace in category', () => {
    const t = createTransaction({
      description: 'Groceries',
      amount: '10',
      category: '  grocery   store  ',
      date: '2024-03-01',
      type: 'Expense',
    });
    assert.equal(t.category, 'Grocery Store');
  });

  it('throws on invalid input', () => {
    assert.throws(
      () => createTransaction({ description: '', amount: 'abc', category: '', date: 'bad', type: 'Foo' }),
      /Invalid transaction/
    );
  });

  it('throws on unknown type', () => {
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

  it('drops invalid stored records', () => {
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
  });

  it('returns empty array for non-array input', () => {
    assert.deepEqual(validateAndNormalizeStoredTransactions({}), []);
  });
});

// ---------- updateTransactionInList ----------

describe('updateTransactionInList', () => {
  const base = makeTransaction({ amount: 100 });

  it('updates an existing transaction by id', () => {
    const { nextTransactions, updated } = updateTransactionInList([base], base.id, {
      description: 'Updated Desc',
      amount: '200',
      category: 'UpdatedCat',
      date: '2024-06-01',
      type: 'Expense',
    });
    assert.equal(nextTransactions.length, 1);
    assert.equal(updated.description, 'Updated Desc');
    assert.equal(updated.amount, -20000);
    assert.equal(updated.type, 'Expense');
  });

  it('returns updated: null when id not found', () => {
    const { nextTransactions, updated } = updateTransactionInList([base], 'nonexistent', {
      description: 'X',
      amount: '200',
      category: 'Y',
      date: '2024-06-01',
      type: 'Income',
    });
    assert.equal(updated, null);
    assert.equal(nextTransactions.length, 1);
    assert.equal(nextTransactions[0].description, 'Salary');
  });

  it('throws on invalid update data', () => {
    assert.throws(
      () => updateTransactionInList([base], base.id, {
        description: '',
        amount: '200',
        category: 'Y',
        date: '2024-06-01',
        type: 'Income',
      }),
      /Invalid transaction/
    );
  });

  it('does not mutate the original array', () => {
    const original = [base];
    updateTransactionInList(original, base.id, {
      description: 'New',
      amount: '300',
      category: 'Cat',
      date: '2024-06-01',
      type: 'Income',
    });
    assert.equal(original[0].description, 'Salary');
  });
});

// ---------- removeTransactionById ----------

describe('removeTransactionById', () => {
  it('removes the correct transaction', () => {
    const list = [makeTransaction({ id: 'a' }), makeTransaction({ id: 'b' })];
    const result = removeTransactionById(list, 'a');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'b');
  });

  it('does not mutate the original array', () => {
    const list = [makeTransaction({ id: 'a' }), makeTransaction({ id: 'b' })];
    removeTransactionById(list, 'a');
    assert.equal(list.length, 2);
  });

  it('returns all when id not found', () => {
    const list = [makeTransaction({ id: 'a' })];
    const result = removeTransactionById(list, 'zzz');
    assert.equal(result.length, 1);
  });
});

// ---------- totalIncome / totalExpenses / balance ----------

describe('totalIncome', () => {
  it('sums income amounts (absolute)', () => {
    const list = [
      makeTransaction({ type: 'Income', amount: 1000 }),
      makeTransaction({ type: 'Expense', amount: -50 }),
      makeTransaction({ type: 'Income', amount: 200 }),
    ];
    assert.equal(totalIncome(list), 1200);
  });

  it('returns 0 for empty list', () => {
    assert.equal(totalIncome([]), 0);
  });
});

describe('totalExpenses', () => {
  it('sums expense amounts (absolute)', () => {
    const list = [
      makeTransaction({ type: 'Income', amount: 1000 }),
      makeTransaction({ type: 'Expense', amount: -50 }),
      makeTransaction({ type: 'Expense', amount: -30 }),
    ];
    assert.equal(totalExpenses(list), 80);
  });

  it('returns 0 for empty list', () => {
    assert.equal(totalExpenses([]), 0);
  });
});

describe('balance', () => {
  it('computes income minus expenses', () => {
    const list = [
      makeTransaction({ type: 'Income', amount: 1000 }),
      makeTransaction({ type: 'Expense', amount: -300 }),
    ];
    assert.equal(balance(list), 700);
  });

  it('can be negative', () => {
    const list = [
      makeTransaction({ type: 'Income', amount: 100 }),
      makeTransaction({ type: 'Expense', amount: -200 }),
    ];
    assert.equal(balance(list), -100);
  });
});

// ---------- expensesByCategory ----------

describe('expensesByCategory', () => {
  it('groups expenses by category and sums cents', () => {
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

  it('uses "Uncategorized" for a missing category', () => {
    const list = [makeTransaction({ type: 'Expense', category: '', amount: -100 })];
    assert.deepEqual(expensesByCategory(list), [{ category: 'Uncategorized', amountCents: 100 }]);
  });

  it('returns an empty array when there are no expenses', () => {
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
    assert.equal(filterByType(list, 'all').length, 3);
  });

  it('returns all when type is empty', () => {
    assert.equal(filterByType(list, '').length, 3);
  });

  it('filters Income', () => {
    const result = filterByType(list, 'Income');
    assert.equal(result.length, 2);
    assert.ok(result.every(t => t.type === 'Income'));
  });

  it('filters Expense', () => {
    const result = filterByType(list, 'Expense');
    assert.equal(result.length, 1);
    assert.ok(result.every(t => t.type === 'Expense'));
  });
});

// ---------- sortTransactions ----------

describe('sortTransactions', () => {
  const list = [
    makeTransaction({ id: '1', date: '2024-01-10', description: 'Zebra', amount: -10 }),
    makeTransaction({ id: '2', date: '2024-03-05', description: 'Apple', amount: -5 }),
    makeTransaction({ id: '3', date: '2024-02-20', description: 'Mango', amount: -20 }),
  ];

  it('does not mutate the original array', () => {
    const original = [...list];
    sortTransactions(list, 'date-newest');
    assert.deepEqual(
      list.map(t => t.id),
      original.map(t => t.id)
    );
  });

  it('sorts by date-newest (newest first)', () => {
    const result = sortTransactions(list, 'date-newest');
    assert.equal(result[0].id, '2');
    assert.equal(result[1].id, '3');
    assert.equal(result[2].id, '1');
  });

  it('sorts by date-oldest (oldest first)', () => {
    const result = sortTransactions(list, 'date-oldest');
    assert.equal(result[0].id, '1');
    assert.equal(result[1].id, '3');
    assert.equal(result[2].id, '2');
  });

  it('sorts by amount-high', () => {
    const result = sortTransactions(list, 'amount-high');
    assert.equal(result[0].id, '3'); // 20
    assert.equal(result[1].id, '1'); // 10
    assert.equal(result[2].id, '2'); // 5
  });

  it('sorts by amount-low', () => {
    const result = sortTransactions(list, 'amount-low');
    assert.equal(result[0].id, '2'); // 5
    assert.equal(result[1].id, '1'); // 10
    assert.equal(result[2].id, '3'); // 20
  });

  it('sorts by description-az', () => {
    const result = sortTransactions(list, 'description-az');
    assert.equal(result[0].description, 'Apple');
    assert.equal(result[1].description, 'Mango');
    assert.equal(result[2].description, 'Zebra');
  });

  it('sorts by description-za', () => {
    const result = sortTransactions(list, 'description-za');
    assert.equal(result[0].description, 'Zebra');
    assert.equal(result[1].description, 'Mango');
    assert.equal(result[2].description, 'Apple');
  });

  it('defaults to date-newest for unknown sort order', () => {
    const result = sortTransactions(list, 'unknown-sort');
    assert.equal(result[0].id, '2');
  });

  it('default parameter is date-newest', () => {
    const result = sortTransactions(list);
    assert.equal(result[0].id, '2');
  });
});
