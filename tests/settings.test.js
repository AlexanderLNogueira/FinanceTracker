import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../js/settings.js';
import { createLocalStorageMock, silenceExpectedConsoleErrors } from './support/local-storage.js';

beforeEach(() => {
  globalThis.localStorage = createLocalStorageMock();
  // Expected console.error calls from the unreadable/unwritable storage tests.
  silenceExpectedConsoleErrors();
});

afterEach(() => {
  delete globalThis.localStorage;
  mock.restoreAll();
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
    assert.deepEqual(loadSettings(), { currency: 'BRL', locale: DEFAULT_SETTINGS.locale, theme: DEFAULT_SETTINGS.theme });

    globalThis.localStorage.setItem('settings', JSON.stringify({ locale: 'pt-BR' }));
    assert.deepEqual(loadSettings(), { currency: DEFAULT_SETTINGS.currency, locale: 'pt-BR', theme: DEFAULT_SETTINGS.theme });
  });

  it('falls back to defaults for invalid currency/locale values', () => {
    globalThis.localStorage.setItem('settings', JSON.stringify({ currency: 'XXX', locale: 'xx-XX' }));
    assert.deepEqual(loadSettings(), { ...DEFAULT_SETTINGS });
  });

  it('saves and loads a round-trip of settings', () => {
    const settings = { currency: 'BRL', locale: 'pt-BR', theme: 'dark' };
    saveSettings(settings);
    assert.deepEqual(loadSettings(), settings);
  });

  // --- Theme ---

  it('falls back to the default theme for an unknown value', () => {
    for (const theme of ['neon', 'DARK', '', 42, null]) {
      globalThis.localStorage.setItem('settings', JSON.stringify({ theme }));
      assert.equal(loadSettings().theme, DEFAULT_SETTINGS.theme);
    }
  });

  // --- Removed currencies ---

  it('falls back to the default currency when a removed currency is stored', () => {
    // Zero-decimal currencies are not offered; stale value must not break formatting.
    globalThis.localStorage.setItem('settings', JSON.stringify({ currency: 'JPY', locale: 'ja-JP' }));
    assert.deepEqual(loadSettings(), {
      currency: DEFAULT_SETTINGS.currency,
      locale: 'ja-JP',
      theme: DEFAULT_SETTINGS.theme,
    });
  });

  // --- Storage failures ---

  it('falls back to defaults when localStorage is unreadable', () => {
    globalThis.localStorage = {
      getItem() {
        throw new Error('storage disabled');
      },
    };

    assert.deepEqual(loadSettings(), { ...DEFAULT_SETTINGS });
  });

  it('does not throw when localStorage rejects writes', () => {
    globalThis.localStorage = {
      setItem() {
        throw new Error('QuotaExceededError');
      },
    };

    assert.doesNotThrow(() => saveSettings({ ...DEFAULT_SETTINGS }));
  });
});