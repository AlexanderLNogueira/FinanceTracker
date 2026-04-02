/**
 * Main application entry point
 */

import { initTheme } from './utils/helpers.js';
import { initState } from './state/state.js';
import * as controller from './app/controller.js';
import { initBindings } from './app/bindings.js';
import { attachSeedHelper } from './dev/seed.js';
import { flushPendingSave } from './data/storage.js';

function initApp() {
  initState();
  initTheme();
  controller.initController();
  initBindings(controller);
  attachSeedHelper();

  console.log('Finance Tracker initialized successfully!');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

window.addEventListener('beforeunload', () => {
  flushPendingSave();
});
