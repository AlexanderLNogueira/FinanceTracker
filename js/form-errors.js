// --- Form errors: maps domain validation labels to form fields and messages. ---

/**
 * Domain validation error label -> form field id.
 * Labels without a field (e.g. "Transaction is required") surface in the shared status message instead, since they are not attached to an input.
 */
export const FIELD_BY_LABEL = Object.freeze({
  Description: 'description',
  Amount: 'amount',
  Category: 'category',
  Date: 'date',
  Type: 'type',
});

// Message shown under each field when that field fails validation.
export const FIELD_MESSAGES = Object.freeze({
  description: 'Enter a description (up to 100 characters).',
  amount: 'Enter a positive amount, for example 19.99.',
  category: 'Enter a category (up to 50 characters).',
  date: 'Pick a date between Jan 1, 2000 and today.',
  type: 'Choose Income or Expense.',
});

/**
 * Convert the labels returned by validateTransaction into a per-field error map.
 * Unknown labels are ignored.
 * @param {string[]} errors
 * @returns {Object<string, string>} field id -> message
 */
export function toFieldErrors(errors) {
  const fieldErrors = {};
  if (!Array.isArray(errors)) return fieldErrors;

  errors.forEach((label) => {
    const field = FIELD_BY_LABEL[label];
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = FIELD_MESSAGES[field];
    }
  });

  return fieldErrors;
}

/**
 * Extraction of field labels from "Invalid transaction: Amount, Date" error thrown by createTransaction / updateTransactionInList.
 * @param {unknown} error
 * @returns {string[]} labels, or empty array when the error is not mappable
 */
export function labelsFromError(error) {
  const PREFIX = 'Invalid transaction: ';
  const message = error instanceof Error ? error.message : '';

  if (!message.startsWith(PREFIX)) return [];

  return message
    .slice(PREFIX.length)
    .split(', ')
    .filter(Boolean);
}