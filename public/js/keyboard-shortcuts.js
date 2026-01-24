// Keyboard Shortcuts Module
// Global keyboard navigation and shortcuts

const KeyboardShortcuts = {
  shortcuts: new Map(),

  init() {
    this.registerDefaultShortcuts();
    this.setupEventListeners();
  },

  setupEventListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
  },

  registerDefaultShortcuts() {
    // Tab switching
    this.register('ctrl+1', () => switchTab('dashboard'), 'Switch to Dashboard');
    this.register('ctrl+2', () => switchTab('inventory'), 'Switch to Inventory');
    this.register('ctrl+3', () => switchTab('reports'), 'Switch to Reports');
    this.register('ctrl+4', () => switchTab('settings'), 'Switch to Settings');

    // Quick actions
    this.register('ctrl+n', () => this.openNewProductModal(), 'New Product');
    this.register('ctrl+b', () => this.openNewBatchModal(), 'New Batch');
    this.register('ctrl+f', () => this.focusSearch(), 'Focus Search');
    this.register('ctrl+k', () => CommandPalette.toggle(), 'Command Palette');

    // Navigation
    this.register('escape', () => this.handleEscape(), 'Close/Clear');
    this.register('?', () => this.showHelp(), 'Show Shortcuts Help');
  },

  register(key, callback, description = '') {
    this.shortcuts.set(key, { callback, description });
  },

  handleKeyPress(e) {
    // Build key combination string
    let key = '';
    if (e.ctrlKey || e.metaKey) key += 'ctrl+';
    if (e.altKey) key += 'alt+';
    if (e.shiftKey && e.key !== 'Shift') key += 'shift+';
    key += e.key.toLowerCase();

    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) && !e.ctrlKey) {
        return;
      }

      e.preventDefault();
      shortcut.callback();
    }
  },

  openNewProductModal() {
    const btn = document.querySelector('[onclick="openAddProductModal()"]');
    if (btn) btn.click();
  },

  openNewBatchModal() {
    // Only works if a product is selected
    if (window.selectedProductId) {
      const btn = document.querySelector('[onclick="openAddBatchModal()"]');
      if (btn) btn.click();
    }
  },

  focusSearch() {
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  },

  handleEscape() {
    // Close any open modals
    const activeModal = document.querySelector('.modal.show');
    if (activeModal) {
      activeModal.classList.remove('show');
      return;
    }

    // Close command palette
    if (CommandPalette.isOpen()) {
      CommandPalette.close();
      return;
    }

    // Clear search
    const searchInput = document.getElementById('productSearch');
    if (searchInput && searchInput.value) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.blur();
    }
  },

  showHelp() {
    const shortcuts = Array.from(this.shortcuts.entries())
      .map(([key, {description}]) => `<tr><td><kbd>${key}</kbd></td><td>${description}</td></tr>`)
      .join('');

    const html = `
      <div class="shortcuts-help">
        <h2>Keyboard Shortcuts</h2>
        <table>
          <tbody>
            ${shortcuts}
          </tbody>
        </table>
        <p class="help-footer">Press <kbd>ESC</kbd> to close</p>
      </div>
    `;

    // Show in a modal or overlay
    showNotification('Press ESC to close help', 'info');
    console.table(Array.from(this.shortcuts.entries()));
  },

  getShortcuts() {
    return Array.from(this.shortcuts.entries());
  }
};

// Command Palette
const CommandPalette = {
  init() {
    // CommandPalette creates itself on first toggle
    // No initialization needed
    console.log('✓ Command palette ready');
  },

  isOpen() {
    const palette = document.getElementById('commandPalette');
    return palette && palette.classList.contains('show');
  },

  toggle() {
    const palette = document.getElementById('commandPalette');
    if (!palette) {
      this.create();
      return;
    }
    
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  },

  create() {
    const html = `
      <div id="commandPalette" class="command-palette">
        <div class="command-palette-content">
          <input type="text" id="commandInput" placeholder="Type a command..." autocomplete="off">
          <div id="commandResults" class="command-results"></div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    this.setupPaletteListeners();
    this.open();
  },

  open() {
    const palette = document.getElementById('commandPalette');
    if (palette) {
      palette.classList.add('show');
      const input = document.getElementById('commandInput');
      if (input) {
        input.focus();
        this.updateResults('');
      }
    }
  },

  close() {
    const palette = document.getElementById('commandPalette');
    if (palette) {
      palette.classList.remove('show');
      const input = document.getElementById('commandInput');
      if (input) input.value = '';
    }
  },

  setupPaletteListeners() {
    const input = document.getElementById('commandInput');
    if (input) {
      input.addEventListener('input', (e) => this.updateResults(e.target.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.close();
        }
      });
    }

    const palette = document.getElementById('commandPalette');
    if (palette) {
      palette.addEventListener('click', (e) => {
        if (e.target === palette) this.close();
      });
    }
  },

  updateResults(query) {
    const commands = this.getCommands();
    const filtered = query
      ? commands.filter(cmd => 
          cmd.name.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description.toLowerCase().includes(query.toLowerCase())
        )
      : commands;

    const html = filtered.slice(0, 8).map(cmd => `
      <div class="command-item" onclick="CommandPalette.execute('${cmd.id}')">
        <div class="command-icon">${cmd.icon}</div>
        <div class="command-info">
          <div class="command-name">${cmd.name}</div>
          <div class="command-description">${cmd.description}</div>
        </div>
        ${cmd.shortcut ? `<kbd>${cmd.shortcut}</kbd>` : ''}
      </div>
    `).join('');

    const results = document.getElementById('commandResults');
    if (results) {
      results.innerHTML = html || '<div class="no-results">No commands found</div>';
    }
  },

  getCommands() {
    return [
      { id: 'dashboard', name: 'Dashboard', description: 'Go to dashboard', icon: '🏠', shortcut: 'Ctrl+1', action: () => switchTab('dashboard') },
      { id: 'inventory', name: 'Inventory', description: 'Go to inventory', icon: '📦', shortcut: 'Ctrl+2', action: () => switchTab('inventory') },
      { id: 'reports', name: 'Reports', description: 'View reports', icon: '📊', shortcut: 'Ctrl+3', action: () => switchTab('reports') },
      { id: 'settings', name: 'Settings', description: 'Open settings', icon: '⚙️', shortcut: 'Ctrl+4', action: () => switchTab('settings') },
      { id: 'new-product', name: 'New Product', description: 'Add a new product', icon: '➕', shortcut: 'Ctrl+N', action: () => KeyboardShortcuts.openNewProductModal() },
      { id: 'search', name: 'Search', description: 'Focus search box', icon: '🔍', shortcut: 'Ctrl+F', action: () => KeyboardShortcuts.focusSearch() },
      { id: 'dark-mode', name: 'Toggle Dark Mode', description: 'Switch theme', icon: '🌙', action: () => DarkMode.toggle() },
      { id: 'export', name: 'Export Data', description: 'Export inventory to CSV', icon: '📥', action: () => window.location.href = '/api/export/inventory' }
    ];
  },

  execute(commandId) {
    const command = this.getCommands().find(c => c.id === commandId);
    if (command && command.action) {
      command.action();
      this.close();
    }
  }
};

// Initialize keyboard shortcuts
KeyboardShortcuts.init();