import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TRANSACTION_TYPES,
  TYPE_FILTERS,
  SORT_ORDERS,
  DEFAULT_CATEGORY,
  DEFAULT_FILTER,
  DEFAULT_SORT_ORDER,
  VALID_TRANSACTION_TYPES,
  VALID_TYPE_FILTERS,
  VALID_SORT_ORDERS,
} from '../js/constants.js';

describe('constants', () => {
  it('freezes the exported objects', () => {
    assert.ok(Object.isFrozen(TRANSACTION_TYPES));
    assert.ok(Object.isFrozen(TYPE_FILTERS));
    assert.ok(Object.isFrozen(SORT_ORDERS));
    assert.ok(Object.isFrozen(VALID_TRANSACTION_TYPES));
    assert.ok(Object.isFrozen(VALID_TYPE_FILTERS));
    assert.ok(Object.isFrozen(VALID_SORT_ORDERS));
  });

  it('exposes exactly the two transaction types', () => {
    assert.deepEqual(VALID_TRANSACTION_TYPES, ['Income', 'Expense']);
  });

  it('type filters include all plus the two transaction types', () => {
    assert.deepEqual(VALID_TYPE_FILTERS, ['all', 'Income', 'Expense']);
  });

  it('exposes all six sort orders with unique values', () => {
    assert.deepEqual(VALID_SORT_ORDERS, [
      'date-newest',
      'date-oldest',
      'amount-high',
      'amount-low',
      'description-az',
      'description-za',
    ]);
    // Every value is distinct.
    assert.equal(new Set(VALID_SORT_ORDERS).size, VALID_SORT_ORDERS.length);
  });

  it('defaults reference their groups', () => {
    assert.ok(VALID_TRANSACTION_TYPES.includes(DEFAULT_CATEGORY) || DEFAULT_CATEGORY === 'Uncategorized');
    assert.ok(VALID_TYPE_FILTERS.includes(DEFAULT_FILTER));
    assert.ok(VALID_SORT_ORDERS.includes(DEFAULT_SORT_ORDER));
  });
});