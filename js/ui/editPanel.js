/**
 * Edit panel module
 * Handles the slide-out panel for editing transactions
 */

import { showMessage } from '../utils/helpers.js';

// Panel state
let currentEditTransaction = null;
let isPanelOpen = false;

/**
 * Initialize the edit panel
 */
export function initEditPanel() {
    const overlay = document.getElementById('edit-panel-overlay');
    const panel = document.getElementById('edit-panel');
    const closeBtn = document.getElementById('close-edit-panel');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const form = document.getElementById('edit-transaction-form');
    
    if (!overlay || !panel || !closeBtn || !form) {
        console.error('Edit panel elements not found');
        return;
    }
    
    // Close panel when clicking overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeEditPanel();
        }
    });
    
    // Close panel when clicking close button
    closeBtn.addEventListener('click', closeEditPanel);
    
    // Close panel when clicking cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeEditPanel);
    }
    
    // Close panel with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isPanelOpen) {
            closeEditPanel();
        }
    });
    
    // Handle form submission
    form.addEventListener('submit', handleEditSubmit);
}

/**
 * Open edit panel for a specific transaction
 * @param {number} id - Transaction ID to edit
 */
export function openEditPanel(id) {
    try {
        // Import here to avoid circular dependency
        import('../data/transactions.js').then(({ getAllTransactions }) => {
            const transactions = getAllTransactions();
            const transaction = transactions.find(t => t.id === id);
            
            if (!transaction) {
                showMessage('Transaction not found', 'error');
                return;
            }
            
            currentEditTransaction = transaction;
            populateEditForm(transaction);
            showPanel();
        });
        
    } catch (error) {
        console.error('Error opening edit panel:', error);
        showMessage('Error opening edit panel', 'error');
    }
}

/**
 * Close the edit panel
 */
export function closeEditPanel() {
    const overlay = document.getElementById('edit-panel-overlay');
    const panel = document.getElementById('edit-panel');
    
    if (overlay && panel) {
        overlay.classList.remove('show');
        panel.classList.remove('show');
        isPanelOpen = false;
        currentEditTransaction = null;
    }
}

/**
 * Populate the edit form with transaction data
 * @param {Object} transaction - Transaction data
 */
function populateEditForm(transaction) {
    const form = document.getElementById('edit-transaction-form');
    if (!form) return;
    
    // Set form values
    form.elements.description.value = transaction.description || '';
    form.elements.amount.value = Math.abs(transaction.amount); // Always show positive amount
    form.elements.category.value = transaction.category || '';
    form.elements.date.value = transaction.date || '';
    form.elements.type.value = transaction.type || '';
    
    // Clear any existing error messages
    clearFormErrors();
}

/**
 * Handle edit form submission
 * @param {Event} e - Form submission event
 */
function handleEditSubmit(e) {
    e.preventDefault();
    
    if (!currentEditTransaction) {
        showMessage('No transaction selected for editing', 'error');
        return;
    }
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Build update data object (only include changed fields)
    const updateData = {};
    let hasChanges = false;
    
    // Check each field for changes
    const fields = ['description', 'amount', 'category', 'date', 'type'];
    fields.forEach(field => {
        const currentValue = form.elements[field].value;
        const originalValue = currentEditTransaction[field];
        
        // Special handling for amount (convert to number and handle sign)
        if (field === 'amount') {
            const newAmount = parseFloat(currentValue);
            if (!isNaN(newAmount) && newAmount !== Math.abs(originalValue)) {
                updateData.amount = newAmount;
                hasChanges = true;
            }
        } else if (currentValue !== originalValue) {
            updateData[field] = currentValue;
            hasChanges = true;
        }
    });
    
    if (!hasChanges) {
        showMessage('No changes to save', 'success');
        return;
    }
    
    try {
        // Import update function
        import('../data/transactions.js').then(({ updateTransaction }) => {
            // Update the transaction
            const updatedTransaction = updateTransaction(currentEditTransaction.id, updateData);
            
            // Close panel and show success message
            closeEditPanel();
            showMessage('Transaction updated successfully!', 'success');
            
            // Re-render transactions to reflect changes
            import('./renderer.js').then(({ renderTransactions, renderBalance }) => {
                renderTransactions();
                renderBalance();
            });
        });
        
    } catch (error) {
        console.error('Error updating transaction:', error);
        showMessage('Error updating transaction: ' + error.message, 'error');
    }
}

/**
 * Show the edit panel with animation
 */
function showPanel() {
    const overlay = document.getElementById('edit-panel-overlay');
    const panel = document.getElementById('edit-panel');
    
    if (overlay && panel) {
        overlay.classList.add('show');
        panel.classList.add('show');
        isPanelOpen = true;
    }
}

/**
 * Clear form error messages
 */
function clearFormErrors() {
    const form = document.getElementById('edit-transaction-form');
    if (!form) return;

    const errorElements = form.querySelectorAll('.error-message');
    errorElements.forEach(el => el.textContent = '');

    const errorFields = form.querySelectorAll('.error');
    errorFields.forEach(field => {
        field.classList.remove('error');
        field.style.borderColor = '';
    });
}
