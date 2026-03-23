/**
 * Export functionality module
 * Handles exporting transaction data to various formats
 */

import { getAllTransactions } from './transactions.js';
import { filterTransactionsByDateRange } from './dateRange.js';
import { showMessage } from '../utils/helpers.js';

export { filterTransactionsByDateRange };

/**
 * Export transactions to JSON format
 * @param {Array} transactions - Transactions to export
 * @param {string} dateRange - Date range identifier
 * @returns {string} JSON string
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
 * Export transactions to CSV format
 * @param {Array} transactions - Transactions to export
 * @param {string} separator - CSV separator (',' or ';')
 * @returns {string} CSV string
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
            transaction.amount,
            escapeCSVField(transaction.category, separator),
            transaction.date,
            transaction.type
        ];
        csvRows.push(row.join(separator));
    });

    return csvRows.join('\n');
}

/**
 * Escape CSV field if it contains special characters
 * @param {string} field - Field value
 * @param {string} separator - CSV separator
 * @returns {string} Escaped field
 */
function escapeCSVField(field, separator) {
    const fieldStr = String(field);
    
    // Check if field needs escaping
    if (fieldStr.includes(separator) || fieldStr.includes('"') || fieldStr.includes('\n')) {
        // Escape quotes by doubling them and wrap in quotes
        return `"${fieldStr.replace(/"/g, '""')}"`;
    }
    
    return fieldStr;
}

/**
 * Download file to user's computer
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 * @param {string} format - File format ('csv' or 'json')
 * @param {string} dateRange - Date range identifier
 * @returns {string} Generated filename
 */
function generateFilename(format, dateRange) {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
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
 * Main export function
 * @param {string} format - Export format ('csv-comma', 'csv-semicolon', 'json')
 * @param {string} dateRange - Date range ('all', '30days', '6months', '1year')
 */
export function exportData(format, dateRange) {
    try {
        // Get all transactions
        const allTransactions = getAllTransactions();
        
        // Filter by date range
        const filteredTransactions = filterTransactionsByDateRange(allTransactions, dateRange);
        
        if (filteredTransactions.length === 0) {
            showMessage('No transactions found for the selected date range', 'error');
            return;
        }

        let content, filename, mimeType;

        // Generate export based on format
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
            showMessage('Invalid export format', 'error');
            return;
        }

        // Download the file
        downloadFile(content, filename, mimeType);
        
        // Show success message
        const rangeLabel = getDateRangeLabel(dateRange);
        showMessage(`Exported ${filteredTransactions.length} transactions (${rangeLabel})`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showMessage('Failed to export data: ' + error.message, 'error');
    }
}

/**
 * Initialize export functionality
 */
export function initExport() {
    const exportToggle = document.getElementById('export-toggle');
    const exportDropdown = document.getElementById('export-dropdown');
    const exportBtn = document.getElementById('export-btn');
    const dateRangeSelect = document.getElementById('export-date-range');
    const formatSelect = document.getElementById('export-format');

    if (!exportToggle || !exportDropdown) {
        console.warn('Export elements not found');
        return;
    }

    // Toggle dropdown
    exportToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        exportDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!exportDropdown.contains(e.target) && !exportToggle.contains(e.target)) {
            exportDropdown.classList.remove('show');
        }
    });

    // Export button click
    if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const dateRange = dateRangeSelect ? dateRangeSelect.value : 'all';
            const format = formatSelect ? formatSelect.value : 'json';
            
            exportData(format, dateRange);
            
            // Close dropdown after export
            exportDropdown.classList.remove('show');
        });
    }
}
