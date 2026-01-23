/**
 * Keyboard Shortcuts Module
 * Global keyboard navigation
 * v0.8.0
 */

const SHORTCUTS = [
  { key: 'ctrl+n', action: 'newProduct', desc: 'New Product' },
  { key: 'ctrl+b', action: 'newBatch', desc: 'New Batch' },
  { key: 'ctrl+f', action: 'focusSearch', desc: 'Focus Search' },
  { key: 'ctrl+k', action: 'commandPalette', desc: 'Command Palette' },
  { key: 'ctrl+1', action: 'tabDashboard', desc: 'Dashboard Tab' },
  { key: 'ctrl+2', action: 'tabInventory', desc: 'Inventory Tab' },
  { key: 'ctrl+3', action: 'tabReports', desc: 'Reports Tab' },
  { key: 'ctrl+4', action: 'tabSettings', desc: 'Settings Tab' },
  { key: 'esc', action: 'escape', desc: 'Close/Cancel' },
  { key: 'ctrl+/', action: 'showHelp', desc: 'Show Shortcuts' },
  { key: '?', action: 'showHelp', desc: 'Show Shortcuts' },
  { key: 'ctrl+d', action: 'toggleDark', desc: 'Toggle Dark Mode' },
  { key: 'ctrl+e', action: 'exportData', desc: 'Export CSV' }
];

let shortcutsEnabled = true;

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeyPress);
  console.log('⌨️ Keyboard shortcuts enabled');
}

// Handle key press
function handleKeyPress(e) {
  if (!shortcutsEnabled) return;
  
  // Don't trigger shortcuts when typing in inputs
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    // Except ESC
    if (e.key === 'Escape') {
      e.target.blur();
      return;
    }
    return;
  }
  
  const key = buildKeyString(e);
  const shortcut = SHORTCUTS.find(s => s.key === key);
  
  if (shortcut) {
    e.preventDefault();
    executeShortcut(shortcut.action);
  }
}

// Build key string from event
function buildKeyString(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  
  const key = e.key.toLowerCase();
  if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
    parts.push(key);
  }
  
  return parts.join('+');
}

// Execute shortcut action
function executeShortcut(action) {
  const actions = {
    newProduct: () => {
      if (typeof openAddProductModal === 'function') {
        openAddProductModal();
      }
    },
    newBatch: () => {
      if (typeof openAddBatchModal === 'function') {
        openAddBatchModal();
      }
    },
    focusSearch: () => {
      const search = document.getElementById('productSearch');
      if (search) search.focus();
    },
    commandPalette: () => {
      if (typeof toggleCommandPalette === 'function') {
        toggleCommandPalette();
      }
    },
    tabDashboard: () => switchTab('dashboard'),
    tabInventory: () => switchTab('inventory'),
    tabReports: () => switchTab('reports'),
    tabSettings: () => switchTab('settings'),
    escape: () => {
      // Close any open modals
      const closeButtons = document.querySelectorAll('.modal-close, [onclick*="closeModal"]');
      if (closeButtons.length > 0) {
        closeButtons[0].click();
      }
    },
    showHelp: () => showShortcutsHelp(),
    toggleDark: () => {
      if (typeof toggleTheme === 'function') {
        toggleTheme();
      }
    },
    exportData: () => {
      if (currentTab === 'reports' && typeof exportReport === 'function') {
        exportReport();
      } else if (currentTab === 'inventory') {
        window.location.href = '/api/export/inventory';
      }
    }
  };
  
  if (actions[action]) {
    actions[action]();
  }
}

// Show shortcuts help modal
function showShortcutsHelp() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content max-w-2xl">
      <div class="modal-header">
        <h2>⌨️ Keyboard Shortcuts</h2>
        <button onclick="this.closest('.modal-overlay').remove()" class="modal-close">×</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-2 gap-4">
          ${SHORTCUTS.map(s => `
            <div class="flex justify-between items-center p-2 border-b">
              <span class="text-gray-700">${s.desc}</span>
              <kbd class="px-3 py-1 bg-gray-200 rounded text-sm font-mono">${s.key.replace('ctrl', '⌘')}</kbd>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Enable/disable shortcuts
function setShortcutsEnabled(enabled) {
  shortcutsEnabled = enabled;
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initKeyboardShortcuts);
} else {
  initKeyboardShortcuts();
}