// --- Theme: applies the selected theme. ---

import { DEFAULT_SETTINGS, VALID_THEMES } from './settings.js';

export const THEME_LABELS = Object.freeze({
  light: 'Light',
  dark: 'Dark',
});

function resolveTheme(theme) {
  return VALID_THEMES.includes(theme) ? theme : DEFAULT_SETTINGS.theme;
}

/**
 * Apply a theme to the document root.
 * Called on init and on every theme change; chart re-reads CSS custom properties on the following render.
 * @param {string} theme
 * @returns {string} the applied theme
 */
export function applyTheme(theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  return resolved;
}