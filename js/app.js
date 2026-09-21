import { loadTransactions, saveTransactions } from './storage.js';
import {
  createTransaction,
  updateTransactionInList,
  removeTransactionById,
  totalIncome,
  totalExpenses,
  balance,
  filterByType,
  sortTransactions,
  normalizeTransactionInput,
  validateAndNormalizeStoredTransactions,
  validateTransactionInput
} from './transactions.js';
import { renderExpenseChart } from './chart.js';
import { formatCurrency, formatDate } from './format.js';
import { loadSettings, saveSettings, DEFAULT_SETTINGS, VALID_CURRENCIES, VALID_LOCALES, VALID_THEMES } from './settings.js';
import { FIELD_BY_LABEL, toFieldErrors, labelsFromError } from './form-errors.js';
import { applyTheme, THEME_LABELS } from './theme.js';
import {
  TRANSACTION_TYPES,
  DEFAULT_FILTER,
  DEFAULT_SORT_ORDER,
  MIN_DATE_STRING
} from './constants.js';

// --- State: Plain module variables ---
let transactions = [];
let currentFilter = DEFAULT_FILTER;
let currentSortOrder = DEFAULT_SORT_ORDER;
let settings = { ...DEFAULT_SETTINGS };
let editingId = null;

// --- DOM references ---
const form = document.getElementById('transaction-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeSelect = document.getElementById('type');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const filterSelect = document.getElementById('filter-type');
const sortSelect = document.getElementById('sort-order');
const transactionsList = document.getElementById('transactions-list');
const messageArea = document.getElementById('message-area');
const currencySelect = document.getElementById('currency-select');
const localeSelect = document.getElementById('locale-select');
const themeSelect = document.getElementById('theme-select');

// Form fields that can surface a validation message, derived from the label > field map, so the two lists can never drift apart.
const FIELD_IDS = Object.keys(FIELD_BY_LABEL);

function getTodayDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Native date input in sync with validateTransaction
 */
function refreshDateConstraints() {
  dateInput.min = MIN_DATE_STRING;
  dateInput.max = getTodayDate();
}

// --- Status message ---
let messageTimeout = null;

function showMessage(text, type = 'success') {
  if (!messageArea) return;

  messageArea.textContent = text;
  messageArea.className = `message ${type}`;

  if (messageTimeout) clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    messageArea.textContent = '';
    messageArea.className = 'message';
  }, 3000);
}

// --- Field-level validation messages ---
function fieldErrorElement(field) {
  return document.getElementById(`${field}-error`);
}

function clearFieldError(field) {
  const input = document.getElementById(field);
  const errorElement = fieldErrorElement(field);

  if (input) input.removeAttribute('aria-invalid');
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.hidden = true;
  }
}

function clearFieldErrors() {
  FIELD_IDS.forEach((field) => clearFieldError(field));
}

/**
 * Paint messages returned by validateTransaction next to their fields.
 * Flag the inputs for assistive tech, and focus first invalid.
 * @param {string[]} labels error labels such as 'Description'
 */
function renderFieldErrors(labels) {
  const fieldErrors = toFieldErrors(labels);
  clearFieldErrors();

  let firstInvalid = null;

  Object.entries(fieldErrors).forEach(([field, message]) => {
    const input = document.getElementById(field);
    const errorElement = fieldErrorElement(field);

    if (input) {
      input.setAttribute('aria-invalid', 'true');
      if (!firstInvalid) firstInvalid = input;
    }
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = false;
    }
  });

  if (firstInvalid) firstInvalid.focus();
}

// --- Rendering ---
function render() {
  renderBalance();
  renderList();
  renderExpenseChart(transactions, settings);
}

function renderBalance() {
  const incomeTotal = document.getElementById('total-income');
  const expensesTotal = document.getElementById('total-expenses');
  const balanceTotal = document.getElementById('balance');

  incomeTotal.textContent = formatCurrency(totalIncome(transactions), settings);
  expensesTotal.textContent = formatCurrency(totalExpenses(transactions), settings);

  const amount = balance(transactions);
  balanceTotal.textContent = formatCurrency(amount, settings);
  balanceTotal.className = 'value balance-amount';
}

function renderList() {
  const visible = sortTransactions(filterByType(transactions, currentFilter), currentSortOrder);

  transactionsList.innerHTML = '';

  if (visible.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No transactions yet. Add one above!';
    transactionsList.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'transactions-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Date', 'Description', 'Category', 'Type', 'Amount', ''].forEach((text) => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement('tbody');

  visible.forEach((t) => {
    const tr = document.createElement('tr');

    const dateTd = document.createElement('td');
    dateTd.textContent = formatDate(t.date, settings);

    const descTd = document.createElement('td');
    descTd.textContent = t.description;

    const catTd = document.createElement('td');
    catTd.textContent = t.category;

    const typeTd = document.createElement('td');
    typeTd.textContent = t.type;
    typeTd.className = t.type === TRANSACTION_TYPES.INCOME ? 'type-income' : 'type-expense';

    const amountTd = document.createElement('td');
    amountTd.textContent = formatCurrency(Math.abs(t.amount), settings);
    amountTd.className = t.type === TRANSACTION_TYPES.INCOME ? 'amount-income' : 'amount-expense';

    const actionsTd = document.createElement('td');
    actionsTd.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.dataset.action = 'edit';
    editBtn.dataset.id = String(t.id);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.dataset.id = String(t.id);

    actionsTd.append(editBtn, deleteBtn);
    tr.append(dateTd, descTd, catTd, typeTd, amountTd, actionsTd);
    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  transactionsList.appendChild(table);
}

// --- Form actions ---
function readFormInput() {
  return {
    description: descriptionInput.value,
    amount: amountInput.value,
    category: categoryInput.value,
    date: dateInput.value,
    type: typeSelect.value
  };
}

function handleSubmit(e) {
  e.preventDefault();

  const input = readFormInput();

  // Single validation: the form is novalidate, so every rule is checked and reported next to the field it belongs to.
  const { valid, errors } = validateTransactionInput(input);
  if (!valid) {
    renderFieldErrors(errors);
    showMessage('Please fix the highlighted fields.', 'error');
    return;
  }

  clearFieldErrors();

  try {
    if (editingId) {
      // updateTransactionInList takes a normalized patch (amount in cents), so cross the form -> stored boundary explicitly.
      const { nextTransactions, updated } = updateTransactionInList(
        transactions,
        editingId,
        normalizeTransactionInput(input)
      );
      if (!updated) {
        showMessage('Transaction not found.', 'error');
        return;
      }
      transactions = nextTransactions;
      saveTransactions(transactions);
      showMessage('Transaction updated.');
      exitEditMode();
    } else {
      const transaction = createTransaction(input);
      transactions = [transaction, ...transactions];
      saveTransactions(transactions);
      showMessage('Transaction added.');
      form.reset();
      dateInput.value = getTodayDate();
    }
  } catch (error) {
    // createTransaction / updateTransactionInList are the domain guard.
    // Map their labels back to fields when possible.
    const labels = labelsFromError(error);
    if (Object.keys(toFieldErrors(labels)).length > 0) {
      renderFieldErrors(labels);
      showMessage('Please fix the highlighted fields.', 'error');
    } else {
      showMessage(error.message, 'error');
    }
    return;
  }

  render();
}

function handleEdit(id) {
  const transaction = transactions.find(t => String(t.id) === String(id));
  if (!transaction) return;

  clearFieldErrors();
  editingId = transaction.id;
  descriptionInput.value = transaction.description;
  amountInput.value = Math.abs(transaction.amount) / 100;
  typeSelect.value = transaction.type;
  categoryInput.value = transaction.category;
  dateInput.value = transaction.date;

  submitBtn.textContent = 'Update Transaction';
  cancelEditBtn.hidden = false;

  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  descriptionInput.focus();
}

function exitEditMode() {
  editingId = null;
  submitBtn.textContent = 'Add Transaction';
  cancelEditBtn.hidden = true;
  clearFieldErrors();
  form.reset();
  dateInput.value = getTodayDate();
}

function handleDelete(id) {
  if (!confirm('Delete this transaction?')) return;

  transactions = removeTransactionById(transactions, id);
  saveTransactions(transactions);

  if (editingId && String(editingId) === String(id)) {
    exitEditMode();
  }

  showMessage('Transaction deleted.');
  render();
}

function handleClearAll() {
  if (transactions.length === 0 || !confirm('Delete all transactions? This cannot be undone.')) return;

  transactions = [];
  saveTransactions(transactions);
  exitEditMode();
  showMessage('All transactions cleared.');
  render();
}

function handleListClick(e) {
  const button = e.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === 'edit') {
    handleEdit(id);
  } else if (action === 'delete') {
    handleDelete(id);
  }
}

// --- Settings UI ---
function populateSettingsSelects() {
  currencySelect.replaceChildren(
    ...VALID_CURRENCIES.map((c) => {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = c;
      return option;
    })
  );
  currencySelect.value = settings.currency;

  localeSelect.replaceChildren(
    ...VALID_LOCALES.map((l) => {
      const option = document.createElement('option');
      option.value = l;
      option.textContent = l;
      return option;
    })
  );
  localeSelect.value = settings.locale;

  themeSelect.replaceChildren(
    ...VALID_THEMES.map((theme) => {
      const option = document.createElement('option');
      option.value = theme;
      option.textContent = THEME_LABELS[theme] || theme;
      return option;
    })
  );
  themeSelect.value = settings.theme;
}

function onSettingsChange() {
  settings = {
    ...settings,
    currency: currencySelect.value,
    locale: localeSelect.value,
    theme: themeSelect.value,
  };
  applyTheme(settings.theme);
  saveSettings(settings);
  render();
}

// --- Init ---
function init() {
  transactions = validateAndNormalizeStoredTransactions(loadTransactions());

  // Persist the one-time storage migration and self-heal invalid records.
  try {
    saveTransactions(transactions);
  } catch (error) {
    console.error('Failed to persist transactions:', error);
  }

  dateInput.value = getTodayDate();
  refreshDateConstraints();

  // Settings
  settings = loadSettings();
  populateSettingsSelects();
  currencySelect.addEventListener('change', onSettingsChange);
  localeSelect.addEventListener('change', onSettingsChange);
  themeSelect.addEventListener('change', onSettingsChange);

  // Apply the stored theme after settings are loaded.
  applyTheme(settings.theme);

  form.addEventListener('submit', handleSubmit);
  cancelEditBtn.addEventListener('click', exitEditMode);

  // Clear field error as soon as the user edits it.
  FIELD_IDS.forEach((field) => {
    const input = document.getElementById(field);
    if (!input) return;
    input.addEventListener('input', () => clearFieldError(field));
    input.addEventListener('change', () => clearFieldError(field));
  });

  filterSelect.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    render();
  });
  sortSelect.addEventListener('change', (e) => {
    currentSortOrder = e.target.value;
    render();
  });
  document.getElementById('clear-all-btn').addEventListener('click', handleClearAll);
  transactionsList.addEventListener('click', handleListClick);

  // Refresh the native date-max constraint on long-lived tabs.
  window.addEventListener('focus', refreshDateConstraints);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshDateConstraints();
  });

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}