import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formatCurrency, formatDate } from '../js/format.js';
import { DEFAULT_SETTINGS } from '../js/settings.js';

// Intl emits non-breaking spaces around currency symbols;
// Collapse all whitespace to a single regular space so assertions are robust.
const normalize = (str) => String(str).replace(/\s+/g, ' ');

describe('formatCurrency', () => {
  it('formats cents as USD with the default settings', () => {
    assert.equal(normalize(formatCurrency(123456)), '$1,234.56');
    assert.equal(normalize(formatCurrency(500)), '$5.00');
  });

  it('formats BRL with pt-BR separators and symbol', () => {
    assert.equal(normalize(formatCurrency(123456, { currency: 'BRL', locale: 'pt-BR' })), 'R$ 1.234,56');
  });

  it('formats EUR with de-DE separators and symbol', () => {
    assert.equal(normalize(formatCurrency(123456, { currency: 'EUR', locale: 'de-DE' })), '1.234,56 €');
  });

  it('handles negative amounts (expenses) correctly', () => {
    assert.equal(normalize(formatCurrency(-500, { currency: 'USD', locale: 'en-US' })), '-$5.00');
    assert.equal(normalize(formatCurrency(-123456, { currency: 'BRL', locale: 'pt-BR' })), '-R$ 1.234,56');
  });

  it('defaults to DEFAULT_SETTINGS when settings is omitted', () => {
    assert.equal(formatCurrency(100, undefined), formatCurrency(100, DEFAULT_SETTINGS));
  });
});

describe('formatDate', () => {
  it('formats a YYYY-MM-DD date as a localized string', () => {
    assert.equal(formatDate('2024-01-15'), 'Jan 15, 2024');
  });

  it('respects the locale', () => {
    assert.equal(normalize(formatDate('2024-01-15', { locale: 'pt-BR' })), '15 de jan. de 2024');
    assert.equal(normalize(formatDate('2024-01-15', { locale: 'de-DE' })), '15. Jan. 2024');
  });

  it('returns empty string for an invalid date', () => {
    assert.equal(formatDate('not-a-date'), '');
    assert.equal(formatDate(''), '');
  });
});