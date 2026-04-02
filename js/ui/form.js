/**
 * Form UI
 * Validation and data extraction for the transaction form
 */

import { getTodayDate } from '../utils/helpers.js';
import { normalizeTransactionInput, validateTransaction } from '../data/transactions.js';
import { DESCRIPTION_MAX_LEN, CATEGORY_MAX_LEN } from '../config/constants.js';

/**
 * Extract form data into plain object.
 * @param {HTMLFormElement} form
 * @returns {Object}
 */
export function getFormData(form) {
  const formData = new FormData(form);
  return {
    description: formData.get('description'),
    amount: formData.get('amount'),
    category: formData.get('category'),
    date: formData.get('date'),
    type: formData.get('type')
  };
}

/**
 * Set date input to now date.
 * @param {HTMLInputElement} dateInput
 */
export function setDefaultDate(dateInput) {
  if (dateInput) {
    dateInput.value = getTodayDate();
  }
}

/**
 * Reset form and restore default date.
 * @param {HTMLFormElement} form
 */
export function resetForm(form) {
  form.reset();
  const dateInput = form.querySelector('#date');
  if (dateInput) {
    dateInput.value = getTodayDate();
  }
}

/**
 * Validate individual form field and show errors.
 * @param {HTMLElement} field
 * @returns {boolean}
 */
export function validateField(field) {
  if (!field) return false;
  const fieldName = field.name;

  clearError(field);

  const formData = field.form ? getFormData(field.form) : { [fieldName]: field.value };
  const { errorsByField } = getValidationResult(formData);

  if (errorsByField[fieldName]) {
    showError(field, errorsByField[fieldName]);
    return false;
  }

  return true;
}

/**
 * Validate required form fields.
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
export function validateForm(form) {
  if (!form) return false;
  const { valid, errorsByField } = getValidationResult(getFormData(form));

  clearAllErrors(form);

  Object.entries(errorsByField).forEach(([name, message]) => {
    const element = form.querySelector(`[name="${name}"]`);
    if (element) {
      showError(element, message);
    }
  });

  return valid;
}

function showError(field, message) {
  const errorElement = getErrorElement(field);
  if (errorElement) {
    errorElement.textContent = message;
    field.classList.add('error');
    field.style.borderColor = '#dc3545';
  }
}

/**
 * Clear validation error for field.
 * @param {HTMLElement} field
 */
export function clearError(field) {
  const errorElement = getErrorElement(field);
  if (errorElement) {
    errorElement.textContent = '';
    field.classList.remove('error');
    field.style.borderColor = '';
  }
}

/**
 * Clear all validation errors in root element.
 * @param {HTMLElement|Document} root
 */
export function clearAllErrors(root = document) {
  const errorElements = root.querySelectorAll('.error-message');
  errorElements.forEach(el => el.textContent = '');

  const errorFields = root.querySelectorAll('.error');
  errorFields.forEach(field => {
    field.classList.remove('error');
    field.style.borderColor = '';
  });
}

function getErrorElement(field) {
  if (!field) return null;

  const id = field.id || '';
  const name = field.name || '';
  const candidates = [];

  if (id) candidates.push(`${id}-error`);
  if (name) candidates.push(`${name}-error`);

  const root = field.form || document;
  for (const candidate of candidates) {
    const scoped = root.querySelector(`#${candidate}`);
    if (scoped) return scoped;
    const global = document.getElementById(candidate);
    if (global) return global;
  }

  return null;
}

function getValidationResult(formData) {
  const normalized = normalizeTransactionInput(formData);
  const { valid, errors } = validateTransaction(normalized);
  return {
    valid,
    errorsByField: mapErrorsToFields(errors)
  };
}

function mapErrorsToFields(errors = []) {
  const messages = {};
  const errorSet = new Set(errors);

  if (errorSet.has('Description')) {
    messages.description = `Description is required and must be ${DESCRIPTION_MAX_LEN} characters or less.`;
  }

  if (errorSet.has('Amount')) {
    messages.amount = 'Amount must be a positive number.';
  }

  if (errorSet.has('Category')) {
    messages.category = `Category is required and must be ${CATEGORY_MAX_LEN} characters or less.`;
  }

  if (errorSet.has('Date')) {
    messages.date = 'Please select a valid date (not future).';
  }

  if (errorSet.has('Type')) {
    messages.type = 'Please select a transaction type.';
  }

  return messages;
}
