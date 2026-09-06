// --- Chart module: Doughnut chart of expenses. ---

import { formatCurrency } from './format.js';
import { expensesByCategory } from './transactions.js';
import { DEFAULT_SETTINGS } from './settings.js';

let expenseChart = null;

/**
 * Render (or destroy) the expenses-by-category chart.
 * @param {Object[]} transactions
 * @param {{currency: string, locale: string}} [settings]
 */
export function renderExpenseChart(transactions = [], settings = DEFAULT_SETTINGS) {
  const canvas = document.getElementById('expenseChart');
  if (!canvas) return;

  const emptyState = document.getElementById('chart-empty');

  if (typeof Chart === 'undefined') {
    if (emptyState) {
      emptyState.textContent = 'Chart library failed to load.';
      emptyState.style.display = 'block';
    }
    canvas.style.display = 'none';
    return;
  }

  const byCategory = expensesByCategory(transactions);
  const labels = byCategory.map((entry) => entry.category);
  const data = byCategory.map((entry) => entry.amountCents);

  if (labels.length === 0) {
    if (expenseChart) {
      expenseChart.destroy();
      expenseChart = null;
    }
    canvas.style.display = 'none';
    if (emptyState) {
      emptyState.textContent = 'No expense data yet.';
      emptyState.style.display = 'block';
    }
    return;
  }

  canvas.style.display = 'block';
  if (emptyState) {
    emptyState.style.display = 'none';
  }

  // Rebuild.
  if (expenseChart) {
    expenseChart.destroy();
  }

  expenseChart = new Chart(canvas, {
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
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((sum, value) => sum + value, 0);
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
              return ` ${ctx.label}: ${formatCurrency(ctx.parsed, settings)} (${pct}%)`;
            }
          }
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

  return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
}
