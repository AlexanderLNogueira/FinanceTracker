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
  parseDateYMD
} from './transactions.js';
import { renderExpenseChart } from './chart.js';

// --- State: Plain module variables ---
let transactions = [];
let currentFilter = 'all';
let currentSortOrder = 'date-newest';
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

// --- Formatting ---
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr) {
  const date = parseDateYMD(dateStr);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

function getTodayDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

// --- Rendering ---
function render() {
  renderBalance();
  renderList();
  renderExpenseChart(filterByType(transactions, currentFilter));
}

function renderBalance() {
  const incomeTotal = document.getElementById('total-income');
  const expensesTotal = document.getElementById('total-expenses');
  const balanceTotal = document.getElementById('balance');

  incomeTotal.textContent = formatCurrency(totalIncome(transactions));
  expensesTotal.textContent = formatCurrency(totalExpenses(transactions));

  const amount = balance(transactions);
  balanceTotal.textContent = formatCurrency(amount);
  balanceTotal.className = `value balance-amount${amount > 0 ? ' positive' : amount < 0 ? ' negative' : ''}`;

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
    dateTd.textContent = formatDate(t.date);

    const descTd = document.createElement('td');
    descTd.textContent = t.description;

    const catTd = document.createElement('td');
    catTd.textContent = t.category;

    const typeTd = document.createElement('td');
    typeTd.textContent = t.type;
    typeTd.className = t.type === 'Income' ? 'type-income' : 'type-expense';

    const amountTd = document.createElement('td');
    amountTd.textContent = formatCurrency(Math.abs(t.amount));
    amountTd.className = t.type === 'Income' ? 'amount-income' : 'amount-expense';

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
function handleSubmit(e) {
  e.preventDefault();

  const input = {
    description: descriptionInput.value,
    amount: amountInput.value,
    category: categoryInput.value,
    date: dateInput.value,
    type: typeSelect.value
  };

  try {
    if (editingId) {
      const { nextTransactions, updated } = updateTransactionInList(transactions, editingId, input);
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
    showMessage(error.message, 'error');
    return;
  }

  render();
}

function handleEdit(id) {
  const transaction = transactions.find(t => String(t.id) === String(id));
  if (!transaction) return;

  editingId = transaction.id;
  descriptionInput.value = transaction.description;
  amountInput.value = Math.abs(transaction.amount);
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

// --- Init ---
function init() {
  transactions = loadTransactions()
    .filter(t => t && typeof t === 'object')
    .map(t => ({
      id: String(t.id),
      description: String(t.description || ''),
      amount: Number(t.amount) || 0,
      category: String(t.category || ''),
      date: String(t.date || ''),
      type: t.type === 'Expense' ? 'Expense' : 'Income'
    }));

  dateInput.value = getTodayDate();

  form.addEventListener('submit', handleSubmit);
  cancelEditBtn.addEventListener('click', exitEditMode);
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

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}