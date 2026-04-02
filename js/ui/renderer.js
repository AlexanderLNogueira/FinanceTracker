/**
 * DOM rendering module
 * Handles all DOM manipulation and rendering for the Finance Tracker
 */

import { formatCurrency, formatDate } from '../utils/helpers.js';
import { PAGE_SIZES } from '../config/constants.js';

/**
 * Render transactions table with pagination controls.
 * @param {import('../types.js').Transaction[]} transactions
 * @param {import('../types.js').Pagination} pagination
 */
export function renderTransactions(transactions, pagination) {
  const container = document.getElementById('transactions-list');

  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    const emptyState = createElement('div', 'empty-state');
    const message = createElement('p', null, "It's... empty...");
    emptyState.appendChild(message);
    container.appendChild(emptyState);
    return;
  }

  const topControls = createPaginationControls(pagination);
  const wrapper = createElement('div', 'transactions-table-wrapper');
  const table = createElement('table', 'transactions-table');
  table.setAttribute('role', 'table');
  table.setAttribute('aria-label', 'Transactions list');
  const thead = createElement('thead');
  const headerRow = createElement('tr');
  const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Actions'];

  headers.forEach(text => {
    const th = createElement('th', null, text);
    th.setAttribute('scope', 'col');
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);

  const tbody = createElement('tbody');

  transactions.forEach(transaction => {
    const row = createElement('tr', 'transaction-row');
    row.dataset.transactionId = String(transaction.id);
    row.style.cursor = 'pointer';

    row.appendChild(createElement('td', null, formatDate(transaction.date)));
    row.appendChild(createElement('td', null, transaction.description));
    row.appendChild(createElement('td', null, transaction.category));
    row.appendChild(createElement('td', null, transaction.type));

    const amountCell = createElement(
      'td',
      transaction.amount >= 0 ? 'amount-income' : 'amount-expense',
      formatCurrency(Math.abs(transaction.amount))
    );
    row.appendChild(amountCell);

    const actionsCell = createElement('td', 'actions-cell');
    const editBtn = createElement('button', 'btn btn-secondary btn-sm', 'Edit');
    editBtn.type = 'button';
    editBtn.dataset.action = 'edit';
    editBtn.dataset.transactionId = String(transaction.id);
    editBtn.setAttribute('aria-label', `Edit transaction: ${transaction.description}`);

    const deleteBtn = createElement('button', 'btn btn-danger btn-sm', 'Delete');
    deleteBtn.type = 'button';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.dataset.transactionId = String(transaction.id);
    deleteBtn.setAttribute('aria-label', `Delete transaction: ${transaction.description}`);

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  wrapper.appendChild(table);
  const bottomControls = createPaginationControls(pagination);

  container.appendChild(topControls);
  container.appendChild(wrapper);
  container.appendChild(bottomControls);
}

/**
 * Render summary totals.
 * @param {import('../types.js').Totals} totals
 */
export function renderBalance(totals) {
  if (!totals) return;

  const totalIncomeEl = document.getElementById('total-income');
  const totalExpensesEl = document.getElementById('total-expenses');
  const balanceEl = document.getElementById('balance');

  if (!totalIncomeEl || !totalExpensesEl || !balanceEl) {
    return;
  }

  totalIncomeEl.textContent = formatCurrency(totals.income);
  totalExpensesEl.textContent = formatCurrency(totals.expenses);
  balanceEl.textContent = formatCurrency(totals.balance);

  balanceEl.className = 'value';
  if (totals.balance > 0) {
    balanceEl.classList.add('income');
  } else if (totals.balance < 0) {
    balanceEl.classList.add('expense');
  }
}

/**
 * Render sort controls state.
 * @param {import('../types.js').Sort} sort
 */
export function renderSortControls(sort) {
  const sortBySelect = document.getElementById('sort-by');
  const sortOrderBtn = document.getElementById('sort-order-btn');

  if (!sortBySelect || !sortOrderBtn || !sort) {
    return;
  }

  if (sortBySelect.value !== sort.by) {
    sortBySelect.value = sort.by;
  }

  sortOrderBtn.setAttribute('aria-pressed', String(sort.ascending));

  if (sort.ascending) {
    sortOrderBtn.innerHTML = '↑ Ascending';
    sortOrderBtn.classList.add('btn-sort-asc');
    sortOrderBtn.classList.remove('btn-sort-desc');
  } else {
    sortOrderBtn.innerHTML = '↓ Descending';
    sortOrderBtn.classList.add('btn-sort-desc');
    sortOrderBtn.classList.remove('btn-sort-asc');
  }
}

/**
 * Render filter controls state.
 * @param {import('../types.js').Filters} filters
 */
export function renderFilterControls(filters) {
  const filterType = document.getElementById('filter-type');
  const filterRange = document.getElementById('filter-date-range');
  const searchInput = document.getElementById('search-query');

  if (!filterType || !filterRange || !searchInput || !filters) {
    return;
  }

  if (filterType.value !== filters.type) {
    filterType.value = filters.type || 'all';
  }

  if (filterRange.value !== filters.dateRange) {
    filterRange.value = filters.dateRange || 'all';
  }

  if (searchInput.value !== (filters.searchQuery || '')) {
    searchInput.value = filters.searchQuery || '';
  }
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function createPaginationControls({ page, pageSize, totalPages, totalItems }) {
  const controls = createElement('div', 'pagination-controls');

  const pageGroup = createElement('div', 'pagination-group');
  const prevBtn = createElement('button', 'btn btn-secondary btn-sm', 'Prev');
  prevBtn.type = 'button';
  prevBtn.disabled = page <= 1;
  prevBtn.dataset.action = 'page-prev';
  prevBtn.dataset.page = String(page - 1);
  prevBtn.setAttribute('aria-label', `Go to page ${Math.max(1, page - 1)}`);

  const nextBtn = createElement('button', 'btn btn-secondary btn-sm', 'Next');
  nextBtn.type = 'button';
  nextBtn.disabled = page >= totalPages;
  nextBtn.dataset.action = 'page-next';
  nextBtn.dataset.page = String(page + 1);
  nextBtn.setAttribute('aria-label', `Go to page ${Math.min(totalPages, page + 1)}`);

  const info = createElement('span', 'pagination-info', `Page ${page} of ${totalPages}`);

  pageGroup.appendChild(prevBtn);
  pageGroup.appendChild(info);
  pageGroup.appendChild(nextBtn);

  const sizeGroup = createElement('div', 'pagination-group');
  const sizeLabel = createElement('span', 'pagination-info', `Total: ${totalItems}`);
  const sizeSelect = createElement('select', 'page-size-select');
  PAGE_SIZES.forEach((size) => {
    const option = createElement('option', null, String(size));
    option.value = String(size);
    if (size === pageSize) {
      option.selected = true;
    }
    sizeSelect.appendChild(option);
  });

  sizeGroup.appendChild(sizeLabel);
  sizeGroup.appendChild(sizeSelect);

  controls.appendChild(pageGroup);
  controls.appendChild(sizeGroup);

  return controls;
}
