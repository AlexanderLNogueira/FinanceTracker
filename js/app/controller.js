/**
 * Application controller
 * Owns mutations and side effects
 */

import { getState, updateState, subscribe } from '../state/state.js';
import { saveTransactions } from '../data/storage.js';
import {
  buildNewTransaction,
  updateTransactionInList,
  removeTransactionById,
  importTransactionsIntoList,
  normalizePageSize
} from '../data/transactions.js';
import { buildExportPayload } from '../data/export.js';
import { openEditPanel as openEditPanelUI } from '../ui/editPanel.js';
import { showMessage, downloadFile } from '../utils/helpers.js';
import { deriveViewState, renderApp } from './render.js';

function persistTransactions(transactions) {
  saveTransactions(transactions, () => {
    showMessage('Unable to save data. Please check your browser settings.', 'error');
  });
}

/**
 * Initialize controller subscriptions and initial render.
 */
export function initController() {
  subscribe((state) => {
    const viewState = deriveViewState(state);
    const pagination = viewState.pagination;

    if (
      pagination.page !== state.pagination.page ||
      pagination.pageSize !== state.pagination.pageSize
    ) {
      updateState(prev => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          page: pagination.page,
          pageSize: pagination.pageSize
        }
      }));
      return;
    }

    renderApp(viewState);
  });

  renderApp(deriveViewState(getState()));
}

/**
 * Add a transaction and update state/storage.
 * @param {Object} transactionData
 * @param {Object} [options]
 * @returns {import('../types.js').Transaction|null}
 */
export function addTransaction(transactionData, options = {}) {
  const { silent = false } = options;

  try {
    const newTransaction = buildNewTransaction(transactionData);
    const current = getState().transactions;
    const nextTransactions = [...current, newTransaction];

    persistTransactions(nextTransactions);
    updateState({ transactions: nextTransactions });

    if (!silent) {
      showMessage('Transaction added successfully!', 'success');
    }

    return newTransaction;
  } catch (error) {
    if (!silent) {
      showMessage('Error adding transaction: ' + error.message, 'error');
    }
    return null;
  }
}

/**
 * Update an existing transaction by id.
 * @param {string} id
 * @param {Object} newData
 * @param {Object} [options]
 * @returns {import('../types.js').Transaction|null}
 */
export function updateTransaction(id, newData, options = {}) {
  const { silent = false } = options;

  try {
    const current = getState().transactions;
    const { nextTransactions, updatedTransaction } = updateTransactionInList(current, id, newData);

    persistTransactions(nextTransactions);
    updateState({ transactions: nextTransactions });

    if (!silent) {
      showMessage('Transaction updated successfully!', 'success');
    }

    return updatedTransaction;
  } catch (error) {
    if (!silent) {
      showMessage('Error updating transaction: ' + error.message, 'error');
    }
    return null;
  }
}

/**
 * Remove a transaction by id.
 * @param {string} id
 * @param {Object} [options]
 * @returns {boolean}
 */
export function removeTransaction(id, options = {}) {
  const { silent = false } = options;

  const current = getState().transactions;
  const nextTransactions = removeTransactionById(current, id);

  if (nextTransactions.length === current.length) {
    if (!silent) {
      showMessage('Transaction not found', 'error');
    }
    return false;
  }

  persistTransactions(nextTransactions);
  updateState({ transactions: nextTransactions });

  if (!silent) {
    showMessage('Transaction deleted successfully!', 'success');
  }

  return true;
}

/**
 * Clear all transactions.
 * @param {Object} [options]
 */
export function clearAllTransactions(options = {}) {
  const { silent = false } = options;

  persistTransactions([]);
  updateState({ transactions: [] });

  if (!silent) {
    showMessage('All transactions cleared!', 'success');
  }
}


/**
 * Update filter state and reset pagination to page 1.
 * @param {Partial<import('../types.js').Filters>} partial
 */
export function updateFilters(partial) {
  updateState(prev => ({
    ...prev,
    filters: {
      ...prev.filters,
      ...partial
    },
    pagination: {
      ...prev.pagination,
      page: 1
    }
  }));
}

/**
 * Set sorting field.
 * @param {string} sortBy
 */
export function setSortBy(sortBy) {
  updateState(prev => ({
    ...prev,
    sort: {
      ...prev.sort,
      by: sortBy
    }
  }));
}

/**
 * Toggle sort order.
 */
export function toggleSortOrder() {
  updateState(prev => ({
    ...prev,
    sort: {
      ...prev.sort,
      ascending: !prev.sort.ascending
    }
  }));
}

/**
 * Set pagination page.
 * @param {number} page
 */
export function setPage(page) {
  updateState(prev => ({
    ...prev,
    pagination: {
      ...prev.pagination,
      page
    }
  }));
}

/**
 * Set pagination page size.
 * @param {number} pageSize
 */
export function setPageSize(pageSize) {
  const normalizedSize = normalizePageSize(pageSize);
  updateState(prev => ({
    ...prev,
    pagination: {
      ...prev.pagination,
      pageSize: normalizedSize,
      page: 1
    }
  }));
}

/**
 * Import raw transactions and merge into state.
 * @param {Array} rawTransactions
 * @returns {{imported:number, skipped:number, invalid:number}|null}
 */
export function importTransactions(rawTransactions) {
  try {
    const current = getState().transactions;
    const { nextTransactions, result } = importTransactionsIntoList(current, rawTransactions);

    if (nextTransactions.length === current.length) {
      showMessage('No transactions imported.', 'error');
      return result;
    }

    persistTransactions(nextTransactions);
    updateState({ transactions: nextTransactions });

    const parts = [];
    if (result.imported > 0) {
      parts.push(`Imported ${result.imported} transaction${result.imported === 1 ? '' : 's'}`);
    }
    if (result.skipped > 0) {
      parts.push(`${result.skipped} duplicate skipped`);
    }
    if (result.invalid > 0) {
      parts.push(`${result.invalid} invalid skipped`);
    }

    const message = parts.length ? parts.join('. ') : 'No transactions imported.';
    showMessage(message, result.imported > 0 ? 'success' : 'error');

    return result;
  } catch (error) {
    showMessage(`Import failed: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Export formated data as requested.
 * @param {string} format
 * @param {string} dateRange
 * @returns {Object|null}
 */
export function exportData(format, dateRange) {
  try {
    const transactions = getState().transactions;
    const payload = buildExportPayload(transactions, dateRange, format);

    if (payload.empty) {
      showMessage('No transactions found for the selected date range', 'error');
      return null;
    }

    downloadFile(payload.content, payload.filename, payload.mimeType);
    showMessage(`Exported ${payload.count} transactions (${payload.rangeLabel})`, 'success');

    return payload;
  } catch (error) {
    showMessage('Failed to export data: ' + error.message, 'error');
    return null;
  }
}

/**
 * Open the edit panel for transaction id.
 * @param {string} id
 */
export function openEditPanel(id) {
  const transaction = getState().transactions.find(t => String(t.id) === String(id));
  if (!transaction) {
    showMessage('Transaction not found', 'error');
    return;
  }

  openEditPanelUI(transaction);
}

/**
 * Add batch of transactions (used by seed helper).
 * @param {Array} transactionInputs
 * @param {Object} [options]
 * @returns {{added:number, failed:number}}
 */
export function addTransactionsBatch(transactionInputs, options = {}) {
  const { showToast = false } = options;

  const current = getState().transactions;
  const nextTransactions = [...current];

  let added = 0;
  let failed = 0;

  transactionInputs.forEach((input) => {
    try {
      const transaction = buildNewTransaction(input);
      nextTransactions.push(transaction);
      added += 1;
    } catch (error) {
      failed += 1;
    }
  });

  if (added > 0) {
    persistTransactions(nextTransactions);
    updateState({ transactions: nextTransactions });
  }

  if (showToast) {
    if (added > 0) {
      const summary = failed > 0
        ? `Seeded ${added} transactions (${failed} failed).`
        : `Seeded ${added} transactions.`;
      showMessage(summary, 'success');
    } else {
      showMessage('No transactions were seeded.', 'error');
    }
  }

  return { added, failed };
}
