/**
 * Form handling and validation module
 * Manages the transaction form interactions and validation
 */

import { addTransaction } from '../data/transactions.js';
import { renderTransactions, renderBalance } from './renderer.js';
import { getTodayDate, showMessage } from '../utils/helpers.js';

/**
 * Initialize form handling
 */
export function initForm() {
    const form = document.getElementById('transaction-form');
    const dateInput = document.getElementById('date');
    
    // Set default date to today
    dateInput.value = getTodayDate();
    
    // Add event listeners
    form.addEventListener('submit', handleFormSubmit);
    
    // Clear all button
    document.getElementById('clear-all-btn').addEventListener('click', handleClearAll);
    
    // Real-time validation
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearError(input));
    });
}

/**
 * Handle form submission
 * @param {Event} e - Form submission event
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const transactionData = {
        description: formData.get('description'),
        amount: formData.get('amount'),
        category: formData.get('category'),
        date: formData.get('date'),
        type: formData.get('type')
    };
    
    // Validate form
    if (!validateForm(transactionData)) {
        return;
    }
    
    try {
        // Add transaction (data layer handles normalization/validation)
        addTransaction(transactionData);
        renderTransactions();
        renderBalance();
        
        // Reset form
        e.target.reset();
        document.getElementById('date').value = getTodayDate();
        
        // Show success message
        showMessage('Transaction added successfully!', 'success');
        
        // Clear any existing errors
        clearAllErrors();
        
    } catch (error) {
        showMessage('Error adding transaction: ' + error.message, 'error');
    }
}

/**
 * Handle clear all transactions
 */
function handleClearAll() {
    if (confirm('Are you sure you want to clear all transactions? This action cannot be undone.')) {
        try {
            // Import here to avoid circular dependency
            import('../data/transactions.js').then(({ clearAllTransactions }) => {
                clearAllTransactions();
                renderTransactions();
                renderBalance();
                showMessage('All transactions cleared!', 'success');
            });
        } catch (error) {
            showMessage('Error clearing transactions: ' + error.message, 'error');
        }
    }
}

/**
 * Validate individual form field
 * @param {HTMLElement} field - Form field element
 * @returns {boolean} Whether field is valid
 */
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    const errorElement = document.getElementById(fieldName + '-error');
    
    // Clear previous error
    clearError(field);
    
    // Check required fields
    if (field.hasAttribute('required') && !value) {
        showError(field, `${getFieldLabel(fieldName)} is required.`);
        return false;
    }
    
    // Specific validations
    if (fieldName === 'amount') {
        if (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
            showError(field, 'Amount must be a positive number.');
            return false;
        }
    }
    
    if (fieldName === 'type' && !value) {
        showError(field, 'Please select a transaction type.');
        return false;
    }
    
    if (fieldName === 'date') {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (isNaN(date.getTime()) || date > today) {
            showError(field, 'Please select a valid date (not future).');
            return false;
        }
    }
    
    return true;
}

/**
 * Validate entire form
 * @param {Object} data - Form data object
 * @returns {boolean} Whether form is valid
 */
function validateForm(data) {
    let isValid = true;
    
    // Check required fields
    const requiredFields = ['description', 'amount', 'category', 'date', 'type'];
    
    requiredFields.forEach(field => {
        const element = document.getElementById(field);
        if (!validateField(element)) {
            isValid = false;
        }
    });
    
    return isValid;
}

/**
 * Show error message for a field
 * @param {HTMLElement} field - Form field element
 * @param {string} message - Error message
 */
function showError(field, message) {
    const errorElement = document.getElementById(field.name + '-error');
    if (errorElement) {
        errorElement.textContent = message;
        field.classList.add('error');
        field.style.borderColor = '#dc3545';
    }
}

/**
 * Clear error message for a field
 * @param {HTMLElement} field - Form field element
 */
function clearError(field) {
    const errorElement = document.getElementById(field.name + '-error');
    if (errorElement) {
        errorElement.textContent = '';
        field.classList.remove('error');
        field.style.borderColor = '';
    }
}

/**
 * Clear all error messages
 */
function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => el.textContent = '');
    
    const errorFields = document.querySelectorAll('.error');
    errorFields.forEach(field => {
        field.classList.remove('error');
        field.style.borderColor = '';
    });
}
/**
 * Get field label for error messages
 * @param {string} fieldName - Field name
 * @returns {string} Human-readable field label
 */
function getFieldLabel(fieldName) {
    const labels = {
        'description': 'Description',
        'amount': 'Amount',
        'category': 'Category',
        'date': 'Date',
        'type': 'Type'
    };
    
    return labels[fieldName] || fieldName;
}
