/**
 * Import UI module
 * Handles file input and import actions
 */

import { parseImportContent } from '../data/import.js';
import { importTransactions } from '../data/transactions.js';
import { renderTransactions, renderBalance } from './renderer.js';
import { showMessage } from '../utils/helpers.js';

export function initImport() {
  const importFile = document.getElementById('import-file');
  const importFormat = document.getElementById('import-format');
  const importBtn = document.getElementById('import-btn');

  if (!importFile || !importBtn || !importFormat) {
    return;
  }

  const exportDropdown = document.getElementById('export-dropdown');

  importBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!importFile.files || importFile.files.length === 0) {
      showMessage('Please choose a file to import.', 'error');
      return;
    }

    const file = importFile.files[0];
    const format = importFormat.value || 'json';

    try {
      const content = await readFileAsText(file);
      const rawTransactions = parseImportContent(content, format);

      if (rawTransactions.length === 0) {
        showMessage('No transactions found in the file.', 'error');
        return;
      }

      const result = importTransactions(rawTransactions);
      renderTransactions();
      renderBalance();

      const parts = [];
      if (result.imported > 0) {
        parts.push(`Imported ${result.imported} transaction${result.imported === 1 ? '' : 's'}`);
      }
      if (result.skipped > 0) {
        parts.push(`${result.skipped} duplicate skipped`);
      }
      if (result.invalid > 0) {
        parts.push(`${result.invalid} invalid skipped`);
      }

      const message = parts.length ? parts.join('. ') : 'No transactions imported.';
      showMessage(message, result.imported > 0 ? 'success' : 'error');

      importFile.value = '';

      // Close dropdown after import
      if (exportDropdown) {
        exportDropdown.classList.remove('show');
      }
    } catch (error) {
      showMessage(`Import failed: ${error.message}`, 'error');
    }
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.readAsText(file);
  });
}
