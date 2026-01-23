/**
 * Command Palette Module
 * Quick action access (Ctrl+K)
 * v0.8.0
 */

const CommandPalette = (() => {
  let isOpen = false;
  const commands = [
    { id: 'new-product', label: '➕ Add New Product', action: () => openAddProductModal() },
    { id: 'new-batch', label: '📦 Add New Batch', action: () => openAddBatchModal() },
    { id: 'new-category', label: '🏷️ Add New Category', action: () => openAddCategoryModal() },
    { id: 'new-supplier', label: '🏢 Add New Supplier', action: () => openAddSupplierModal() },
    { id: 'goto-dashboard', label: '📊 Go to Dashboard', action: () => switchTab('dashboard') },
    { id: 'goto-inventory', label: '📦 Go to Inventory', action: () => switchTab('inventory') },
    { id: 'goto-reports', label: '📈 Go to Reports', action: () => switchTab('reports') },
    { id: 'goto-settings', label: '⚙️ Go to Settings', action: () => switchTab('settings') },
    { id: 'export-csv', label: '💾 Export to CSV', action: () => exportCSV() },
    { id: 'create-backup', label: '💾 Create Backup', action: () => createBackup() },
    { id: 'toggle-theme', label: '🌙 Toggle Dark Mode', action: () => DarkMode.toggle() }
  ];

  /**
   * Initialize command palette
   */
  function init() {
    createPaletteHTML();
  }

  /**
   * Create palette HTML
   */
  function createPaletteHTML() {
    const palette = document.createElement('div');
    palette.id = 'commandPalette';
    palette.className = 'command-palette';
    palette.style.display = 'none';
    
    palette.innerHTML = `
      <div class="command-palette-overlay" onclick="CommandPalette.close()"></div>
      <div class="command-palette-content">
        <input type="text" id="commandSearch" placeholder="Type a command..." />
        <div id="commandList" class="command-list"></div>
      </div>
    `;

    document.body.appendChild(palette);

    // Setup search
    const searchInput = document.getElementById('commandSearch');
    searchInput.addEventListener('input', (e) => filterCommands(e.target.value));
    searchInput.addEventListener('keydown', handleCommandKeydown);
  }

  /**
   * Toggle palette visibility
   */
  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  /**
   * Open palette
   */
  function open() {
    const palette = document.getElementById('commandPalette');
    const searchInput = document.getElementById('commandSearch');
    
    palette.style.display = 'flex';
    isOpen = true;
    
    setTimeout(() => {
      searchInput.focus();
      filterCommands('');
    }, 50);
  }

  /**
   * Close palette
   */
  function close() {
    const palette = document.getElementById('commandPalette');
    const searchInput = document.getElementById('commandSearch');
    
    palette.style.display = 'none';
    searchInput.value = '';
    isOpen = false;
  }

  /**
   * Filter commands by search term
   */
  function filterCommands(term) {
    const filtered = commands.filter(cmd => 
      cmd.label.toLowerCase().includes(term.toLowerCase())
    );

    const commandList = document.getElementById('commandList');
    commandList.innerHTML = filtered.map((cmd, index) => `
      <div class="command-item ${index === 0 ? 'selected' : ''}" data-id="${cmd.id}" onclick="CommandPalette.execute('${cmd.id}')">
        ${cmd.label}
      </div>
    `).join('');
  }

  /**
   * Handle keyboard navigation
   */
  function handleCommandKeydown(e) {
    const commandList = document.getElementById('commandList');
    const items = commandList.querySelectorAll('.command-item');
    const selectedIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (selectedIndex < items.length - 1) {
        items[selectedIndex].classList.remove('selected');
        items[selectedIndex + 1].classList.add('selected');
        items[selectedIndex + 1].scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectedIndex > 0) {
        items[selectedIndex].classList.remove('selected');
        items[selectedIndex - 1].classList.add('selected');
        items[selectedIndex - 1].scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        const commandId = items[selectedIndex].dataset.id;
        execute(commandId);
      }
    } else if (e.key === 'Escape') {
      close();
    }
  }

  /**
   * Execute command
   */
  function execute(commandId) {
    const command = commands.find(cmd => cmd.id === commandId);
    if (command) {
      close();
      setTimeout(() => command.action(), 100);
    }
  }

  return {
    init,
    toggle,
    open,
    close,
    execute
  };
})();

// Make globally available
if (typeof window !== 'undefined') {
  window.CommandPalette = CommandPalette;
}