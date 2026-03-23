/**
 * Chart module
 * Renders a doughnut chart for expenses by category - More in the future
 */

import { getFilteredTransactions } from '../data/transactions.js';

let expenseChart = null;

export function initChart() {
  renderExpenseChart();
}

export function renderExpenseChart() {
  const canvas = document.getElementById('expenseChart');
  const emptyState = document.getElementById('chart-empty');

  if (!canvas || typeof Chart === 'undefined') {
    return;
  }

  const transactions = getFilteredTransactions();
  const expenses = transactions.filter(t => t.type === 'Expense');

  const totals = new Map();
  expenses.forEach((transaction) => {
    const category = transaction.category || 'Uncategorized';
    const current = totals.get(category) || 0;
    totals.set(category, current + Math.abs(transaction.amount));
  });

  const labels = Array.from(totals.keys());
  const data = Array.from(totals.values());

  if (labels.length === 0) {
    if (expenseChart) {
      expenseChart.destroy();
      expenseChart = null;
    }
    canvas.style.display = 'none';
    if (emptyState) {
      emptyState.style.display = 'block';
    }
    return;
  }

  canvas.style.display = 'block';
  if (emptyState) {
    emptyState.style.display = 'none';
  }

  if (expenseChart) {
    expenseChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: getChartColors(labels.length),
          borderColor: '#ffffff',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function getChartColors(count) {
  const palette = [
    '#4a90e2',
    '#27ae60',
    '#ff6b35',
    '#9b59b6',
    '#f1c40f',
    '#e74c3c',
    '#16a085',
    '#2ecc71',
    '#2980b9',
    '#8e44ad'
  ];

  if (count <= palette.length) {
    return palette.slice(0, count);
  }

  const colors = [...palette];
  while (colors.length < count) {
    colors.push(palette[colors.length % palette.length]);
  }

  return colors;
}
