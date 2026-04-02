/**
 * Edit panel module
 */

import { clearAllErrors } from './form.js';

let currentEditTransaction = null;
let isPanelOpen = false;

/**
 * Edit panel DOM elements.
 * @returns {Object}
 */
export function getEditPanelElements() {
  return {
    overlay: document.getElementById('edit-panel-overlay'),
    panel: document.getElementById('edit-panel'),
    closeBtn: document.getElementById('close-edit-panel'),
    cancelBtn: document.getElementById('cancel-edit-btn'),
    form: document.getElementById('edit-transaction-form')
  };
}

/**
 * Check if panel is open.
 * @returns {boolean}
 */
export function isEditPanelOpen() {
  return isPanelOpen;
}

/**
 * Get current transaction being edited.
 * @returns {import('../types.js').Transaction|null}
 */
export function getCurrentEditTransaction() {
  return currentEditTransaction;
}

/**
 * Open edit panel and populate form.
 * @param {import('../types.js').Transaction} transaction
 */
export function openEditPanel(transaction) {
  if (!transaction) {
    return;
  }

  currentEditTransaction = transaction;
  populateEditForm(transaction);
  showPanel();
}

/**
 * Close edit panel and clear state.
 */
export function closeEditPanel() {
  const { overlay, panel } = getEditPanelElements();

  if (overlay && panel) {
    overlay.classList.remove('show');
    panel.classList.remove('show');
    isPanelOpen = false;
    currentEditTransaction = null;
  }
}

/**
 * Build update data from edit form.
 * @param {import('../types.js').Transaction} original
 * @param {HTMLFormElement} form
 * @returns {{hasChanges:boolean, updateData:Partial<import('../types.js').Transaction>}}
 */
export function getEditUpdateData(original, form) {
  const updateData = {};
  let hasChanges = false;

  const fields = ['description', 'amount', 'category', 'date', 'type'];
  fields.forEach(field => {
    const currentValue = form.elements[field].value;
    const originalValue = original[field];

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

  return { hasChanges, updateData };
}

function populateEditForm(transaction) {
  const { form } = getEditPanelElements();
  if (!form) return;

  form.elements.description.value = transaction.description || '';
  form.elements.amount.value = Math.abs(transaction.amount);
  form.elements.category.value = transaction.category || '';
  form.elements.date.value = transaction.date || '';
  form.elements.type.value = transaction.type || '';

  clearAllErrors(form);
}

function showPanel() {
  const { overlay, panel } = getEditPanelElements();

  if (overlay && panel) {
    overlay.classList.add('show');
    panel.classList.add('show');
    isPanelOpen = true;
  }
}
