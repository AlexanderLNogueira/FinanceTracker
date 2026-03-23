/**
 * Main application entry point
 * Initializes all modules and sets up the Finance Tracker
 */

import { initForm } from './ui/form.js';
import { initRenderer } from './ui/renderer.js';
import { initEditPanel } from './ui/editPanel.js';
import { initTheme } from './utils/helpers.js';
import { initExport } from './data/export.js';
import { initImport } from './ui/importer.js';
import { initChart } from './ui/chart.js';
import { initState } from './state/state.js';
import { attachSeedHelper } from './dev/seed.js';

/**
 * Initialize the application
 */
function initApp() {
    // Initialize state from storage
    initState();

    // Initialize theme system first
    initTheme();
    
    // Initialize form handling
    initForm();
    
    // Initialize renderer
    initRenderer();

    // Initialize chart rendering
    initChart();
    
    // Initialize edit panel
    initEditPanel();
    
    // Initialize export functionality
    initExport();

    // Initialize import functionality
    initImport();
    
    // Initialize navbar functionality
    initNavbar();

    // Attach dev seed helper
    attachSeedHelper();
    
    // Log initialization
    console.log('Finance Tracker initialized successfully!');
}

/**
 * Initialize navbar functionality
 */
function initNavbar() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeDropdown = document.getElementById('theme-dropdown');
    const themeItems = document.querySelectorAll('.dropdown-item[data-theme]');
    
    // Theme dropdown toggle
    if (themeToggle && themeDropdown) {
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            themeDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!themeDropdown.contains(e.target) && !themeToggle.contains(e.target)) {
                themeDropdown.classList.remove('show');
            }
        });
    }
    
    // Theme selection
    themeItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const theme = item.dataset.theme;
            if (theme) {
                // Import theme utilities
                import('./utils/helpers.js').then(({ setTheme }) => {
                    setTheme(theme);
                    // Close dropdown after selection
                    themeDropdown.classList.remove('show');
                });
            }
        });
    });
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
