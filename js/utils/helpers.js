/**
 * Utility functions module
 * Shared helper functions for the Finance Tracker
 */

/**
 * Format currency with locale settings
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Format date for display
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Format date for input field (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
export function getTodayDate() {
  return formatDateForInput(new Date());
}

/**
 * Themes Management
 */
export const THEMES = {
  'light-blue': 'Light Blue',
  'light-green': 'Light Green', 
  'dark-blue': 'Dark Blue',
  'dark-green': 'Dark Green',
  'dark-orange': 'Dark Orange'
};

/**
 * Get current theme from localStorage or default
 * @returns {string} Current theme name
 */
export function getCurrentTheme() {
  return localStorage.getItem('finance-tracker-theme') || 'light-blue';
}

/**
 * Set theme and update DOM
 * @param {string} theme - Theme name
 */
export function setTheme(theme) {
  if (!THEMES[theme]) {
    console.warn(`Unknown theme: ${theme}`);
    return;
  }
  
  // Update localStorage
  localStorage.setItem('finance-tracker-theme', theme);
  
  // Update DOM
  document.documentElement.setAttribute('data-theme', theme);
  
  // Update active state in dropdown
  updateThemeDropdown(theme);
}

/**
 * Initialize theme from localStorage
 */
export function initTheme() {
  const savedTheme = getCurrentTheme();
  setTheme(savedTheme);
}

/**
 * Update dropdown active states
 * @param {string} activeTheme - Currently active theme
 */
function updateThemeDropdown(activeTheme) {
  const dropdownItems = document.querySelectorAll('.dropdown-item');
  dropdownItems.forEach(item => {
    if (item.dataset.theme === activeTheme) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * Show message in message area
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success' or 'error')
 */
let toastTimeoutId = null;

export function showMessage(message, type = 'success') {
  const messageArea = document.getElementById('message-area');
  if (!messageArea) return;

  // Clear previous toast and timer
  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
    toastTimeoutId = null;
  }
  messageArea.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  messageArea.appendChild(toast);

  toastTimeoutId = setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 200);
    toastTimeoutId = null;
  }, 3000);
}
