/**
 * Chart module
 * Renders a doughnut chart for expenses by category - More in the future
 */

let expenseChart = null;
let previousSignature = null;

/**
 * Render expenses by category chart.
 * @param {import('../types.js').Transaction[]} transactions
 */
export function renderExpenseChart(transactions = []) {
  const canvas = document.getElementById('expenseChart');
  const emptyState = document.getElementById('chart-empty');

  if (!canvas) {
    return;
  }

  if (typeof Chart === 'undefined') {
    canvas.style.display = 'none';
    if (emptyState) {
      emptyState.textContent = 'Chart library failed to load.';
      emptyState.style.display = 'block';
    }
    return;
  }

  // Skip re-render if transactions hasn't changed
  const signature = buildTransactionsSignature(transactions);
  if (signature === previousSignature) {
    return;
  }

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
    // Store transactions data for future comparison
    previousSignature = signature;
    return;
  }

  canvas.style.display = 'block';
  if (emptyState) {
    emptyState.style.display = 'none';
  }

  const ctx = canvas.getContext('2d');

  // If chart exists and labels match, update data in place
  if (expenseChart && labelsMatch(expenseChart.data.labels, labels)) {
    expenseChart.data.datasets[0].data = data;
    expenseChart.data.datasets[0].backgroundColor = getChartColors(labels.length);
    expenseChart.update();
  } else {
    // Labels changed or no chart exists - destroy and recreate
    if (expenseChart) {
      expenseChart.destroy();
    }

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

  // Store transactions data for future comparison
  previousSignature = signature;
}

function labelsMatch(oldLabels, newLabels) {
  if (oldLabels.length !== newLabels.length) return false;
  return oldLabels.every((label, i) => label === newLabels[i]);
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

function buildTransactionsSignature(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return '';
  }

  return transactions
    .map((transaction) => {
      const id = transaction.id ?? '';
      const type = transaction.type ?? '';
      const category = transaction.category ?? '';
      const amount = Number.isFinite(transaction.amount) ? transaction.amount : '';
      return `${id}|${type}|${category}|${amount}`;
    })
    .join(';');
}
