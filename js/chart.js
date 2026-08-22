// --- Chart module: Doughnut chart of expenses. ---

let expenseChart = null;

/**
 * Render (or destroy) the expenses-by-category chart.
 * @param {Object[]} transactions
*/
export function renderExpenseChart(transactions = []) {
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

  const expenses = transactions.filter(t => t.type === 'Expense');

  const totals = new Map();
  expenses.forEach((t) => {
    const category = t.category || 'Uncategorized';
    totals.set(category, (totals.get(category) || 0) + Math.abs(t.amount));
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
