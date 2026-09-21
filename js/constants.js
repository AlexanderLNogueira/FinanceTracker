/**
 * Shared domain constants.
 * Central source of truth for transaction types, filters, sort orders,
 * and their defaults. All exports are frozen to keep them immutable.
 */

export const TRANSACTION_TYPES = Object.freeze({
  INCOME: 'Income',
  EXPENSE: 'Expense',
});

export const TYPE_FILTERS = Object.freeze({
  ALL: 'all',
  INCOME: TRANSACTION_TYPES.INCOME,
  EXPENSE: TRANSACTION_TYPES.EXPENSE,
});

export const SORT_ORDERS = Object.freeze({
  DATE_NEWEST: 'date-newest',
  DATE_OLDEST: 'date-oldest',
  AMOUNT_HIGH: 'amount-high',
  AMOUNT_LOW: 'amount-low',
  DESCRIPTION_AZ: 'description-az',
  DESCRIPTION_ZA: 'description-za',
});

export const DEFAULT_CATEGORY = 'Uncategorized';
export const DEFAULT_FILTER = TYPE_FILTERS.ALL;
export const DEFAULT_SORT_ORDER = SORT_ORDERS.DATE_NEWEST;

// Earliest date accepted by validation
export const MIN_DATE_STRING = '2000-01-01';

export const VALID_TRANSACTION_TYPES = Object.freeze(Object.values(TRANSACTION_TYPES));
export const VALID_TYPE_FILTERS = Object.freeze(Object.values(TYPE_FILTERS));
export const VALID_SORT_ORDERS = Object.freeze(Object.values(SORT_ORDERS));