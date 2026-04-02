/**
 * Central render pipeline
 */

import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateBalance,
  applyFilters,
  paginateTransactions,
  sortTransactions
} from '../data/transactions.js';
import { renderTransactions, renderBalance, renderSortControls, renderFilterControls } from '../ui/renderer.js';
import { renderExpenseChart } from '../ui/chart.js';

/**
 * Derive view state from app state.
 * @param {{transactions: import('../types.js').Transaction[], filters: import('../types.js').Filters, sort: import('../types.js').Sort, pagination: import('../types.js').Pagination}} state
 * @returns {import('../types.js').ViewState}
 */
export function deriveViewState(state) {
  const filteredTransactions = applyFilters(state.transactions, state.filters);
  const visibleTransactions = sortTransactions(state.sort.by, state.sort.ascending, filteredTransactions);
  const pagination = paginateTransactions(visibleTransactions, state.pagination);

  const totals = {
    income: calculateTotalIncome(state.transactions),
    expenses: calculateTotalExpenses(state.transactions),
    balance: calculateBalance(state.transactions)
  };

  return {
    filters: state.filters,
    sort: state.sort,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages
    },
    pageTransactions: pagination.pageTransactions,
    filteredTransactions,
    totals
  };
}

/**
 * Render the application view.
 * @param {import('../types.js').ViewState} viewState
 */
export function renderApp(viewState) {
  renderTransactions(viewState.pageTransactions, viewState.pagination);
  renderBalance(viewState.totals);
  renderSortControls(viewState.sort);
  renderFilterControls(viewState.filters);
  renderExpenseChart(viewState.filteredTransactions);
}
