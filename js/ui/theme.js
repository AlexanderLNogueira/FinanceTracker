/**
 * Theme dropdown UI helpers
 */

import { THEMES } from '../utils/helpers.js';

const THEME_ICONS = {
  'light-blue': '🔵',
  'light-green': '🟢',
  'dark-blue': '🔵',
  'dark-green': '🟢',
  'dark-orange': '🟠'
};

/**
 * Render theme dropdown items.
 * @param {HTMLElement|null} container
 */
export function renderThemeOptions(container) {
  if (!container) return;
  container.innerHTML = '';

  Object.entries(THEMES).forEach(([theme, label]) => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.dataset.theme = theme;
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    const icon = THEME_ICONS[theme] ? `${THEME_ICONS[theme]} ` : '';
    item.textContent = `${icon}${label}`;

    container.appendChild(item);
  });
}
