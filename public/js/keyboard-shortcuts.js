/**
 * Keyboard Shortcuts Module
 * Global keyboard navigation
 * v0.8.0
 */

const KeyboardShortcuts = (() => {
  const shortcuts = {
    'ctrl+n': () => openAddProductModal(),
    'ctrl+b': () => openAddBatchModal(),
    'ctrl+f': () => focusSearch(),
    'ctrl+k': () => CommandPalette.toggle(),
    'ctrl+1': () => switchTab('dashboard'),
    'ctrl+2': () => switchTab('inventory'),
    'ctrl+3': () => switchTab('reports'),
    'ctrl+4': () => switchTab('settings'),
    'escape': () => handleEscape(),
    '?': () => showShortcutsHelp()
  };

  /**
   * Initialize keyboard shortcuts
   */
  function init() {
    document.addEventListener('keydown', handleKeydown);
  }

  /**
   * Handle keydown event
   */
  function handleKeydown(e) {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') {
        handleEscape();
      }
      return;
    }

    // Build shortcut key
    const key = [];
    if (e.ctrlKey) key.push('ctrl');
    if (e.shiftKey) key.push('shift');
    if (e.altKey) key.push('alt');
    key.push(e.key.toLowerCase());
    
    const shortcutKey = key.join('+');

    // Execute shortcut if exists
    if (shortcuts[shortcutKey]) {
      e.preventDefault();
      shortcuts[shortcutKey]();
    }
  }

  /**
   * Focus search bar
   */
  function focusSearch() {
    const searchInput = document.getElementById('productSearch');
    if (searchInput && searchInput.offsetParent !== null) {
      searchInput.focus();
      searchInput.select();
    }
  }

  /**
   * Handle escape key
   */
  function handleEscape() {
    // Close any open modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (modal.style.display === 'flex') {
        modal.style.display = 'none';
      }
    });

    // Close sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
      toggleMenu();
    }

    // Clear search
    const searchInput = document.getElementById('productSearch');
    if (searchInput && document.activeElement === searchInput) {
      searchInput.value = '';
      searchInput.blur();
    }
  }

  /**
   * Show shortcuts help modal
   */
  function showShortcutsHelp() {
    const helpHTML = `
      <div class="shortcuts-help">
        <h3>⌨️ Keyboard Shortcuts</h3>
        <div class="shortcuts-grid">
          <div class="shortcut-item">
            <kbd>Ctrl+N</kbd>
            <span>New Product</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl+B</kbd>
            <span>New Batch</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl+F</kbd>
            <span>Focus Search</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl+K</kbd>
            <span>Command Palette</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl+1/2/3/4</kbd>
            <span>Switch Tabs</span>
          </div>
          <div class="shortcut-item">
            <kbd>Esc</kbd>
            <span>Close/Clear</span>
          </div>
          <div class="shortcut-item">
            <kbd>?</kbd>
            <span>Show Help</span>
          </div>
        </div>
      </div>
    `;

    showNotification(helpHTML, 'info', 5000);
  }

  return {
    init
  };
})();

// Make globally available
if (typeof window !== 'undefined') {
  window.KeyboardShortcuts = KeyboardShortcuts;
}