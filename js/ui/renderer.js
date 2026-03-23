/**
 * DOM rendering module
 * Handles all DOM manipulation and rendering for the Finance Tracker
 */

import { 
    calculateTotalIncome, 
    calculateTotalExpenses, 
    calculateBalance,
    getVisibleTransactions,
    updateTransactionFilters
} from '../data/transactions.js';
import { formatCurrency, formatDate, showMessage } from '../utils/helpers.js';
import { renderExpenseChart } from './chart.js';
import { getFilters } from '../state/state.js';

// Current sort state
let currentSort = {
    by: 'date',
    ascending: false
};

/**
 * Initialize the renderer
 */
export function initRenderer() {
    renderTransactions();
    renderBalance();
    
    // Set up sort controls
    setupSortControls();
    setupFilterControls();
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

/**
 * Render all transactions to the DOM
 */
export function renderTransactions() {
    const transactions = getVisibleTransactions(currentSort.by, currentSort.ascending);
    const container = document.getElementById('transactions-list');

    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (transactions.length === 0) {
        const emptyState = createElement('div', 'empty-state');
        const message = createElement('p', null, "It's... empty...");
        emptyState.appendChild(message);
        container.appendChild(emptyState);
        renderExpenseChart();
        return;
    }

    const filters = getFilters();
    const pageSize = normalizePageSize(filters.pageSize);
    const totalItems = transactions.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = normalizePage(filters.page, totalPages);

    if (page !== filters.page || pageSize !== filters.pageSize) {
        updateTransactionFilters({ page, pageSize });
    }

    const startIndex = (page - 1) * pageSize;
    const pageTransactions = transactions.slice(startIndex, startIndex + pageSize);

    renderTransactionsTable(pageTransactions, container, {
        page,
        pageSize,
        totalItems,
        totalPages
    });

    renderExpenseChart();
}

/**
 * Render transactions as a compact table
 */
function renderTransactionsTable(transactions, container, pagination) {
    const topControls = createPaginationControls(pagination);
    const wrapper = createElement('div', 'transactions-table-wrapper');
    const table = createElement('table', 'transactions-table');
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Actions'];

    headers.forEach(text => {
        headerRow.appendChild(createElement('th', null, text));
    });

    thead.appendChild(headerRow);

    const tbody = createElement('tbody');

    transactions.forEach(transaction => {
        const row = createElement('tr', 'transaction-row');
        row.dataset.id = String(transaction.id);
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            editTransactionById(transaction.id);
        });

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
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editTransactionById(transaction.id);
        });

        const deleteBtn = createElement('button', 'btn btn-danger btn-sm', 'Delete');
        deleteBtn.type = 'button';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTransactionById(transaction.id);
        });

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

function normalizePage(value, totalPages) {
    const page = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 1;
    if (page < 1) return 1;
    if (page > totalPages) return totalPages;
    return page;
}

function normalizePageSize(value) {
    const allowed = [25, 50, 100];
    const size = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 25;
    return allowed.includes(size) ? size : 25;
}

function createPaginationControls({ page, pageSize, totalPages, totalItems }) {
    const controls = createElement('div', 'pagination-controls');

    const pageGroup = createElement('div', 'pagination-group');
    const prevBtn = createElement('button', 'btn btn-secondary btn-sm', 'Prev');
    prevBtn.type = 'button';
    prevBtn.disabled = page <= 1;
    prevBtn.addEventListener('click', () => {
        updateTransactionFilters({ page: page - 1 });
        renderTransactions();
    });

    const nextBtn = createElement('button', 'btn btn-secondary btn-sm', 'Next');
    nextBtn.type = 'button';
    nextBtn.disabled = page >= totalPages;
    nextBtn.addEventListener('click', () => {
        updateTransactionFilters({ page: page + 1 });
        renderTransactions();
    });

    const info = createElement('span', 'pagination-info', `Page ${page} of ${totalPages}`);

    pageGroup.appendChild(prevBtn);
    pageGroup.appendChild(info);
    pageGroup.appendChild(nextBtn);

    const sizeGroup = createElement('div', 'pagination-group');
    const sizeLabel = createElement('span', 'pagination-info', `Total: ${totalItems}`);
    const sizeSelect = createElement('select', 'page-size-select');
    [25, 50, 100].forEach((size) => {
        const option = createElement('option', null, String(size));
        option.value = String(size);
        if (size === pageSize) {
            option.selected = true;
        }
        sizeSelect.appendChild(option);
    });

    sizeSelect.addEventListener('change', (e) => {
        const nextSize = Number(e.target.value);
        updateTransactionFilters({ pageSize: nextSize, page: 1 });
        renderTransactions();
    });

    sizeGroup.appendChild(sizeLabel);
    sizeGroup.appendChild(sizeSelect);

    controls.appendChild(pageGroup);
    controls.appendChild(sizeGroup);

    return controls;
}

/**
 * Render balance summary
 */
export function renderBalance() {
    const totalIncome = calculateTotalIncome();
    const totalExpenses = calculateTotalExpenses();
    const balance = calculateBalance();
    
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('balance').textContent = formatCurrency(balance);
    
    // Update balance color based on value
    const balanceElement = document.getElementById('balance');
    balanceElement.className = 'value';
    if (balance > 0) {
        balanceElement.classList.add('income');
    } else if (balance < 0) {
        balanceElement.classList.add('expense');
    }
}

/**
 * Setup sort controls
 */
function setupSortControls() {
    const sortBySelect = document.getElementById('sort-by');
    const sortOrderBtn = document.getElementById('sort-order-btn');
    
    // Set initial sort option
    sortBySelect.value = currentSort.by;
    updateSortButton();
    
    // Event listeners
    sortBySelect.addEventListener('change', (e) => {
        currentSort.by = e.target.value;
        renderTransactions();
    });
    
    sortOrderBtn.addEventListener('click', () => {
        currentSort.ascending = !currentSort.ascending;
        renderTransactions();
        updateSortButton();
    });
}

/**
 * Setup filter controls
 */
function setupFilterControls() {
    const filterType = document.getElementById('filter-type');
    const filterRange = document.getElementById('filter-date-range');
    const searchInput = document.getElementById('search-query');

    if (!filterType || !filterRange || !searchInput) {
        return;
    }

    const filters = getFilters();
    filterType.value = filters.type || 'all';
    filterRange.value = filters.dateRange || 'all';
    searchInput.value = filters.searchQuery || '';

    filterType.addEventListener('change', (e) => {
        updateTransactionFilters({ type: e.target.value, page: 1 });
        renderTransactions();
    });

    filterRange.addEventListener('change', (e) => {
        updateTransactionFilters({ dateRange: e.target.value, page: 1 });
        renderTransactions();
    });

    searchInput.addEventListener('input', (e) => {
        updateTransactionFilters({ searchQuery: e.target.value, page: 1 });
        renderTransactions();
    });
}

/**
 * Update sort button text and icon
 */
function updateSortButton() {
    const btn = document.getElementById('sort-order-btn');
    if (currentSort.ascending) {
        btn.innerHTML = '↑ Ascending';
        btn.classList.add('btn-sort-asc');
        btn.classList.remove('btn-sort-desc');
    } else {
        btn.innerHTML = '↓ Descending';
        btn.classList.add('btn-sort-desc');
        btn.classList.remove('btn-sort-asc');
    }
}

/**
 * Edit a transaction
 * @param {number} id - Transaction ID to edit
 */
function editTransactionById(id) {
    try {
        // Import edit panel module
        import('./editPanel.js').then(({ openEditPanel }) => {
            openEditPanel(id);
        });
    } catch (error) {
        console.error('Error opening edit panel:', error);
        showMessage('Error opening edit panel', 'error');
    }
}

/**
 * Remove a transaction
 * @param {number} id - Transaction ID to remove
 */
function removeTransactionById(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        try {
            // Import here to avoid CD
            import('../data/transactions.js').then(({ removeTransaction }) => {
                removeTransaction(id);
                renderTransactions();
                renderBalance();
                showMessage('Transaction deleted successfully!', 'success');
            });
        } catch (error) {
            showMessage('Error deleting transaction: ' + error.message, 'error');
        }
    }
}
