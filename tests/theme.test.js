import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { applyTheme } from '../js/theme.js';
import { DEFAULT_SETTINGS } from '../js/settings.js';

// applyTheme only touches documentElement.dataset
let dataset;

beforeEach(() => {
  dataset = {};
  globalThis.document = { documentElement: { dataset } };
});

afterEach(() => {
  delete globalThis.document;
});

describe('applyTheme', () => {
  it('applies a valid theme to the document root and returns it', () => {
    assert.equal(applyTheme('dark'), 'dark');
    assert.equal(dataset.theme, 'dark');

    assert.equal(applyTheme('light'), 'light');
    assert.equal(dataset.theme, 'light');
  });

  it('falls back to the default theme for unsupported values', () => {
    for (const theme of ['neon', 'DARK', '', null, undefined, 42]) {
      assert.equal(applyTheme(theme), DEFAULT_SETTINGS.theme);
      assert.equal(dataset.theme, DEFAULT_SETTINGS.theme);
    }
  });
});