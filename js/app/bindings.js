/**
 * UI bindings
 * Wires DOM events to controller actions
 */

import {
  getFormData,
  setDefaultDate,
  resetForm,
  validateField,
  validateForm,
  clearError,
  clearAllErrors
} from '../ui/form.js';
import {
  getEditPanelElements,
  closeEditPanel,
  getCurrentEditTransaction,
  getEditUpdateData,
  isEditPanelOpen
} from '../ui/editPanel.js';
import { readFileAsText } from '../ui/importer.js';
import { renderThemeOptions } from '../ui/theme.js';
import { parseImportContent } from '../data/import.js';
import { setTheme, getCurrentTheme, showMessage, debounce } from '../utils/helpers.js';

/**
 * Initialize UI bindings.
 * @param {Object} controller
 */
export function initBindings(controller) {
  bindForm(controller);
  bindToolbar(controller);
  bindTransactionsList(controller);
  bindEditPanel(controller);
  bindImportExport(controller);
  bindThemeSelector();
}

function bindForm(controller) {
  const form = document.getElementById('transaction-form');
  const dateInput = document.getElementById('date');

  if (!form) return;

  setDefaultDate(dateInput);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!validateForm(form)) {
      return;
    }

    const transactionData = getFormData(form);
    const created = controller.addTransaction(transactionData);

    if (created) {
      resetForm(form);
      clearAllErrors(form);
    }
  });

  const clearBtn = document.getElementById('clear-all-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all transactions? This action cannot be undone.')) {
        controller.clearAllTransactions();
      }
    });
  }

  const inputs = form.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => clearError(input));
  });
}

function bindToolbar(controller) {
  const sortBySelect = document.getElementById('sort-by');
  const sortOrderBtn = document.getElementById('sort-order-btn');
  const filterType = document.getElementById('filter-type');
  const filterRange = document.getElementById('filter-date-range');
  const searchInput = document.getElementById('search-query');

  if (sortBySelect) {
    sortBySelect.addEventListener('change', (e) => {
      controller.setSortBy(e.target.value);
    });
  }

  if (sortOrderBtn) {
    sortOrderBtn.addEventListener('click', () => {
      controller.toggleSortOrder();
    });
  }

  if (filterType) {
    filterType.addEventListener('change', (e) => {
      controller.updateFilters({ type: e.target.value });
    });
  }

  if (filterRange) {
    filterRange.addEventListener('change', (e) => {
      controller.updateFilters({ dateRange: e.target.value });
    });
  }

  if (searchInput) {
    const debouncedSearch = debounce((value) => {
      controller.updateFilters({ searchQuery: value });
    }, 500);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
  }
}

function bindTransactionsList(controller) {
  const container = document.getElementById('transactions-list');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      const action = actionEl.dataset.action;
      const id = actionEl.dataset.transactionId;
      const page = actionEl.dataset.page;

      if (action === 'edit' && id) {
        controller.openEditPanel(id);
        return;
      }

      if (action === 'delete' && id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
          controller.removeTransaction(id);
        }
        return;
      }

      if ((action === 'page-prev' || action === 'page-next') && page) {
        controller.setPage(Number(page));
        return;
      }
    }

    const row = e.target.closest('.transaction-row');
    if (row && row.dataset.transactionId) {
      controller.openEditPanel(row.dataset.transactionId);
    }
  });

  container.addEventListener('change', (e) => {
    const target = e.target;
    if (target && target.classList.contains('page-size-select')) {
      controller.setPageSize(Number(target.value));
    }
  });
}

function bindEditPanel(controller) {
  const { overlay, closeBtn, cancelBtn, form } = getEditPanelElements();

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeEditPanel();
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeEditPanel);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeEditPanel);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isEditPanelOpen()) {
      closeEditPanel();
    }
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!validateForm(form)) {
        return;
      }

      const current = getCurrentEditTransaction();
      if (!current) {
        showMessage('No transaction selected for editing', 'error');
        return;
      }

      const { hasChanges, updateData } = getEditUpdateData(current, form);
      if (!hasChanges) {
        showMessage('No changes to save', 'info');
        return;
      }

      const updated = controller.updateTransaction(current.id, updateData);
      if (updated) {
        closeEditPanel();
      }
    });

    const editInputs = form.querySelectorAll('input, select');
    editInputs.forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => clearError(input));
    });
  }
}

function bindImportExport(controller) {
  const exportToggle = document.getElementById('export-toggle');
  const exportDropdown = document.getElementById('export-dropdown');
  const exportBtn = document.getElementById('export-btn');
  const dateRangeSelect = document.getElementById('export-date-range');
  const formatSelect = document.getElementById('export-format');

  const { close: closeExportDropdown } = bindDropdown(exportToggle, exportDropdown, { stopPropagation: true });

  if (exportBtn) {
    exportBtn.addEventListener('click', (e) => {
      e.preventDefault();

      const dateRange = dateRangeSelect ? dateRangeSelect.value : 'all';
      const format = formatSelect ? formatSelect.value : 'json';

      controller.exportData(format, dateRange);

      closeExportDropdown();
    });
  }

  const importFile = document.getElementById('import-file');
  const importFormat = document.getElementById('import-format');
  const importBtn = document.getElementById('import-btn');

  if (importBtn) {
    importBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      if (!importFile || !importFile.files || importFile.files.length === 0) {
        showMessage('Please choose a file to import.', 'error');
        return;
      }

      const file = importFile.files[0];
      const format = importFormat ? importFormat.value || 'json' : 'json';

      try {
        const content = await readFileAsText(file);
        const rawTransactions = parseImportContent(content, format);

        if (rawTransactions.length === 0) {
          showMessage('No transactions found in the file.', 'error');
          return;
        }

        controller.importTransactions(rawTransactions);
        importFile.value = '';

        closeExportDropdown();
      } catch (error) {
        showMessage(`Import failed: ${error.message}`, 'error');
      }
    });
  }
}

function bindThemeSelector() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeDropdown = document.getElementById('theme-dropdown');
  const themeOptions = document.getElementById('theme-options');

  renderThemeOptions(themeOptions);
  setTheme(getCurrentTheme());
  const themeItems = themeDropdown ? themeDropdown.querySelectorAll('.dropdown-item[data-theme]') : [];

  const { close: closeThemeDropdown } = bindDropdown(themeToggle, themeDropdown);

  themeItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const theme = item.dataset.theme;
      if (theme) {
        setTheme(theme);
        closeThemeDropdown();
      }
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });
}

function bindDropdown(toggle, menu, options = {}) {
  if (!toggle || !menu) {
    return { close: () => {} };
  }

  const { stopPropagation = false } = options;

  const close = () => {
    menu.classList.remove('show');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    if (stopPropagation) {
      e.stopPropagation();
    }
    const isOpen = menu.classList.toggle('show');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) {
      close();
    }
  });

  return { close };
}
