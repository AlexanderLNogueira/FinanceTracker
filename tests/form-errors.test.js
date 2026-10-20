import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { FIELD_BY_LABEL, FIELD_MESSAGES, toFieldErrors, labelsFromError } from '../js/form-errors.js';

describe('toFieldErrors', () => {
  it('returns an empty map when there are no errors', () => {
    assert.deepEqual(toFieldErrors([]), {});
  });

  it('maps one or more labels to their fields', () => {
    assert.deepEqual(toFieldErrors(['Amount']), { amount: FIELD_MESSAGES.amount });
    assert.deepEqual(toFieldErrors(['Description', 'Date']), {
      description: FIELD_MESSAGES.description,
      date: FIELD_MESSAGES.date,
    });
  });

  it('maps every domain label to a field that has a message', () => {
    Object.keys(FIELD_BY_LABEL).forEach((label) => {
      const field = FIELD_BY_LABEL[label];
      assert.equal(typeof FIELD_MESSAGES[field], 'string');
      assert.ok(FIELD_MESSAGES[field].length > 0);
    });
  });

  it('ignores labels that do not belong to a field', () => {
    assert.deepEqual(toFieldErrors(['Transaction is required']), {});
  });

  it('keeps only the first message per field', () => {
    assert.deepEqual(toFieldErrors(['Amount', 'Amount']), { amount: FIELD_MESSAGES.amount });
  });

  it('returns an empty map for non-array input', () => {
    assert.deepEqual(toFieldErrors(null), {});
    assert.deepEqual(toFieldErrors(undefined), {});
    assert.deepEqual(toFieldErrors('Amount'), {});
  });
});

describe('labelsFromError', () => {
  it('extracts one or more labels from an Invalid transaction error', () => {
    assert.deepEqual(labelsFromError(new Error('Invalid transaction: Amount, Date')), ['Amount', 'Date']);
    assert.deepEqual(labelsFromError(new Error('Invalid transaction: Type')), ['Type']);
  });

  it('returns an empty array for anything unmappable', () => {
    assert.deepEqual(labelsFromError(new Error('QuotaExceededError')), []);
    assert.deepEqual(labelsFromError(null), []);
    assert.deepEqual(labelsFromError(undefined), []);
    // Not an Error instance (a thrown string) -> ignored.
    assert.deepEqual(labelsFromError('Invalid transaction: Amount'), []);
  });
});