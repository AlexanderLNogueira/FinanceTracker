/**
 * Shared JSDoc typedefs.
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} description
 * @property {number} amount
 * @property {string} category
 * @property {string} date
 * @property {string} type
 */

/**
 * @typedef {Object} Filters
 * @property {string} type
 * @property {string} dateRange
 * @property {string} searchQuery
 */

/**
 * @typedef {Object} Sort
 * @property {string} by
 * @property {boolean} ascending
 */

/**
 * @typedef {Object} Pagination
 * @property {number} page
 * @property {number} pageSize
 * @property {number} [totalItems]
 * @property {number} [totalPages]
 */

/**
 * @typedef {Object} Totals
 * @property {number} income
 * @property {number} expenses
 * @property {number} balance
 */

/**
 * @typedef {Object} ViewState
 * @property {Filters} filters
 * @property {Sort} sort
 * @property {Pagination} pagination
 * @property {Transaction[]} pageTransactions
 * @property {Transaction[]} filteredTransactions
 * @property {Totals} totals
 */
