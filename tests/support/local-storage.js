// --- Shared test support: in-memory localStorage ---

import { mock } from 'node:test';

/**
 * Minimal in-memory for browser localStorage.
 * Tests install on globalThis, before each test and remove afterwards.
 */
export function createLocalStorageMock() {
  let store = {};
  return {
    getItem(key) {
      return key in store ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
  };
}

/**
 * Silence console.error calls the error-path tests trigger on purpose.
 * mock.restoreAll() in the matching afterEach.
 */
export function silenceExpectedConsoleErrors() {
  mock.method(console, 'error', () => {});
}