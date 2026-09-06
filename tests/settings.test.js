import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../js/settings.js';

// --- In-memory localStorage ---

function createLocalStorageMock() {
  let store = {};
  return {
    getItem(key) {
      return key in store ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
}

beforeEach(() => {
  globalThis.localStorage = createLocalStorageMock();
});

afterEach(() => {
  delete globalThis.localStorage;
});

describe('settings', () => {
  it('returns defaults when nothing is stored', () => {
    assert.deepEqual(loadSettings(), { ...DEFAULT_SETTINGS });
  });

  it('returns defaults when stored JSON is corrupted', () => {
    globalThis.localStorage.setItem('settings', '{ not valid json');
    assert.deepEqual(loadSettings(), { ...DEFAULT_SETTINGS });
  });

  it('returns defaults when stored data is not an object', () => {
    for (const value of ['text', 123, null, [1, 2]]) {
      globalThis.localStorage.setItem('settings', JSON.stringify(value));
      assert.deepEqual(loadSettings(), { ...DEFAULT_SETTINGS });
    }
  });

  it('merges per-field defaults over partial stored settings', () => {
    globalThis.localStorage.setItem('settings', JSON.stringify({ currency: 'BRL' }));
    assert.deepEqual(loadSettings(), { currency: 'BRL', locale: DEFAULT_SETTINGS.locale });

    globalThis.localStorage.setItem('settings', JSON.stringify({ locale: 'pt-BR' }));
    assert.deepEqual(loadSettings(), { currency: DEFAULT_SETTINGS.currency, locale: 'pt-BR' });
  });

  it('falls back to defaults for invalid currency/locale values', () => {
    globalThis.localStorage.setItem('settings', JSON.stringify({ currency: 'XXX', locale: 'xx-XX' }));
    assert.deepEqual(loadSettings(), { ...DEFAULT_SETTINGS });
  });

  it('saves and loads a round-trip of settings', () => {
    const settings = { currency: 'BRL', locale: 'pt-BR' };
    saveSettings(settings);
    assert.deepEqual(loadSettings(), settings);
  });

  it('round-trips the defaults too', () => {
    saveSettings({ ...DEFAULT_SETTINGS });
    assert.deepEqual(loadSettings(), { ...DEFAULT_SETTINGS });
  });
});