// --- Settings: User currency/locale preference persisted in localStorage. ---
// Display-only: Amounts are stored as raw cents with no currency; only control how values are formatted, never their magnitude.

const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS = Object.freeze({
  currency: 'USD',
  locale: 'en-US',
});

// Currency and locale options for the settings UI.
export const VALID_CURRENCIES = Object.freeze(['USD', 'EUR', 'GBP', 'BRL', 'JPY', 'CAD', 'AUD', 'CHF']);
export const VALID_LOCALES = Object.freeze(['en-US', 'pt-BR', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'ja-JP', 'en-GB']);

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isValidValue(value, validValues) {
  return typeof value === 'string' && validValues.includes(value);
}

/**
 * Load user settings, merging per-field defaults over whatever is persisted. Corrupt or partial falls back.
 * @returns {{currency: string, locale: string}}
 */
export function loadSettings() {
  const stored = safeParse(localStorage.getItem(SETTINGS_KEY));
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_SETTINGS };

  return {
    currency: isValidValue(stored.currency, VALID_CURRENCIES) ? stored.currency : DEFAULT_SETTINGS.currency,
    locale: isValidValue(stored.locale, VALID_LOCALES) ? stored.locale : DEFAULT_SETTINGS.locale,
  };
}

/**
 * Persist the user settings.
 * @param {{currency: string, locale: string}} settings
 */
export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    currency: settings.currency,
    locale: settings.locale,
  }));
}