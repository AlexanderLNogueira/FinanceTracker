/**
 * Export data serialization
 */

import { filterTransactionsByDateRange } from './dateRange.js';

/**
 * Export transactions to JSON string.
 * @param {import('../types.js').Transaction[]} transactions
 * @param {string} dateRange
 * @returns {string}
 */
export function exportToJSON(transactions, dateRange = 'all') {
    const exportData = {
        exportDate: new Date().toISOString(),
        dateRange: dateRange,
        totalTransactions: transactions.length,
        transactions: transactions.map(t => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            category: t.category,
            date: t.date,
            type: t.type
        }))
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Export transactions to CSV string.
 * @param {import('../types.js').Transaction[]} transactions
 * @param {string} separator
 * @returns {string}
 */
export function exportToCSV(transactions, separator = ',') {
    if (transactions.length === 0) {
        return '';
    }

    // CSV header
    const headers = ['ID', 'Description', 'Amount', 'Category', 'Date', 'Type'];
    const csvRows = [headers.join(separator)];

    // CSV data rows
    transactions.forEach(transaction => {
        const row = [
            transaction.id,
            escapeCSVField(transaction.description, separator),
            escapeCSVField(String(transaction.amount), separator),
            escapeCSVField(transaction.category, separator),
            transaction.date,
            transaction.type
        ];
        csvRows.push(row.join(separator));
    });

    return csvRows.join('\n');
}

function escapeCSVField(field, separator) {
  let fieldStr = String(field);

  // Prevent CSV injection by prepending single quote to formula-like values
  if (fieldStr.startsWith('=') || fieldStr.startsWith('+') || fieldStr.startsWith('-') || fieldStr.startsWith('@')) {
    fieldStr = "'" + fieldStr;
  }

  if (fieldStr.includes(separator) || fieldStr.includes('"') || fieldStr.includes('\n')) {
    return `"${fieldStr.replace(/"/g, '""')}"`;
  }

  return fieldStr;
}

/**
 * Generate export filename.
 * @param {string} format
 * @param {string} dateRange
 * @returns {string}
 */
export function generateFilename(format, dateRange) {
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0];
  const rangeLabel = dateRange === 'all' ? 'all-time' : dateRange;
  return `finance-tracker-${rangeLabel}-${timestamp}.${format}`;
}

/**
 * Get date range label for display
 * @param {string} range - Range identifier
 * @returns {string} Human-readable label
 */
export function getDateRangeLabel(range) {
    const labels = {
        'all': 'All Time',
        '30days': 'Last 30 Days',
        '6months': 'Last 6 Months',
        '1year': 'Last 1 Year'
    };
    return labels[range] || range;
}

/**
 * Build export payload by format and date range.
 * @param {import('../types.js').Transaction[]} transactions
 * @param {string} dateRange
 * @param {string} format
 * @returns {Object}
 */
export function buildExportPayload(transactions, dateRange, format) {
  const filteredTransactions = filterTransactionsByDateRange(transactions, dateRange);

  if (filteredTransactions.length === 0) {
    return { empty: true, count: 0 };
  }

  let content;
  let filename;
  let mimeType;

  if (format === 'json') {
    content = exportToJSON(filteredTransactions, dateRange);
    filename = generateFilename('json', dateRange);
    mimeType = 'application/json';
  } else if (format === 'csv-comma') {
    content = exportToCSV(filteredTransactions, ',');
    filename = generateFilename('csv', dateRange);
    mimeType = 'text/csv';
  } else if (format === 'csv-semicolon') {
    content = exportToCSV(filteredTransactions, ';');
    filename = generateFilename('csv', dateRange);
    mimeType = 'text/csv';
  } else {
    throw new Error('Invalid export format');
  }

  return {
    empty: false,
    count: filteredTransactions.length,
    content,
    filename,
    mimeType,
    rangeLabel: getDateRangeLabel(dateRange)
  };
}
