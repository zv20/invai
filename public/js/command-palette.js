/**
 * Command Palette Module
 * Quick command access (Ctrl+K)
 * v0.8.0
 */

let paletteOpen = false;
let paletteCommands = [];

// Initialize command palette
function initCommandPalette() {
  buildCommandList();
  createPaletteDOM();
}

// Build command list
function buildCommandList() {
  paletteCommands = [
    // Navigation
    { id: 'nav-dashboard', name: 'Go to Dashboard', category: 'Navigation', action: () => switchTab('dashboard'), icon: '🏘️' },
    { id: 'nav-inventory', name: 'Go to Inventory', category: 'Navigation', action: () => switchTab('inventory'), icon: '📦' },
    { id: 'nav-reports', name: 'Go to Reports', category: 'Navigation', action: () => switchTab('reports'), icon: '📊' },
    { id: 'nav-settings', name: 'Go to Settings', category: 'Navigation', action: () => switchTab('settings'), icon: '⚙️' },
    
    // Actions
    { id: 'action-new-product', name: 'Add New Product', category: 'Actions', action: () => openAddProductModal?.(), icon: '➕' },
    { id: 'action-new-batch', name: 'Add New Batch', category: 'Actions', action: () => openAddBatchModal?.(), icon: '📦' },
    { id: 'action-export', name: 'Export Inventory', category: 'Actions', action: () => window.location.href = '/api/export/inventory', icon: '💾' },
    { id: 'action-backup', name: 'Create Backup', category: 'Actions', action: () => createBackup?.(), icon: '💾' },
    
    // Reports
    { id: 'report-stock', name: 'Stock Value Report', category: 'Reports', action: () => { switchTab('reports'); setTimeout(() => loadReport?.('stock-value'), 300); }, icon: '💰' },
    { id: 'report-expiration', name: 'Expiration Report', category: 'Reports', action: () => { switchTab('reports'); setTimeout(() => loadReport?.('expiration'), 300); }, icon: '⏰' },
    { id: 'report-low-stock', name: 'Low Stock Report', category: 'Reports', action: () => { switchTab('reports'); setTimeout(() => loadReport?.('low-stock'), 300); }, icon: '⚠️' },
    
    // Settings
    { id: 'setting-dark-mode', name: 'Toggle Dark Mode', category: 'Settings', action: () => toggleTheme?.(), icon: '🌙' },
    { id: 'setting-shortcuts', name: 'Show Keyboard Shortcuts', category: 'Settings', action: () => showShortcutsHelp?.(), icon: '⌨️' }
  ];
}

// Create palette DOM
function createPaletteDOM() {
  const palette = document.createElement('div');
  palette.id = 'commandPalette';
  palette.className = 'command-palette hidden';
  palette.innerHTML = `
    <div class="command-palette-backdrop" onclick="closeCommandPalette()"></div>
    <div class="command-palette-content">
      <div class="command-palette-search">
        <span class="search-icon">🔍</span>
        <input type="text" id="commandPaletteInput" placeholder="Type a command..." autocomplete="off">
        <kbd class="esc-hint">ESC</kbd>
      </div>
      <div id="commandPaletteResults" class="command-palette-results"></div>
    </div>
  `;
  
  document.body.appendChild(palette);
  
  // Add event listeners
  const input = document.getElementById('commandPaletteInput');
  input.addEventListener('input', handlePaletteSearch);
  input.addEventListener('keydown', handlePaletteKeydown);
}

// Toggle palette
function toggleCommandPalette() {
  if (paletteOpen) {
    closeCommandPalette();
  } else {
    openCommandPalette();
  }
}

// Open palette
function openCommandPalette() {
  const palette = document.getElementById('commandPalette');
  if (!palette) return;
  
  palette.classList.remove('hidden');
  paletteOpen = true;
  
  const input = document.getElementById('commandPaletteInput');
  input.value = '';
  input.focus();
  
  renderPaletteResults(paletteCommands);
}

// Close palette
function closeCommandPalette() {
  const palette = document.getElementById('commandPalette');
  if (!palette) return;
  
  palette.classList.add('hidden');
  paletteOpen = false;
}

// Handle search
function handlePaletteSearch(e) {
  const query = e.target.value.toLowerCase();
  
  if (!query) {
    renderPaletteResults(paletteCommands);
    return;
  }
  
  const filtered = paletteCommands.filter(cmd => 
    cmd.name.toLowerCase().includes(query) ||
    cmd.category.toLowerCase().includes(query)
  );
  
  renderPaletteResults(filtered);
}

// Handle keydown in palette
function handlePaletteKeydown(e) {
  if (e.key === 'Escape') {
    closeCommandPalette();
  } else if (e.key === 'Enter') {
    const firstResult = document.querySelector('.command-item');
    if (firstResult) {
      firstResult.click();
    }
  }
}

// Render results
function renderPaletteResults(commands) {
  const container = document.getElementById('commandPaletteResults');
  if (!container) return;
  
  if (commands.length === 0) {
    container.innerHTML = '<div class="no-results">No commands found</div>';
    return;
  }
  
  // Group by category
  const grouped = commands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});
  
  container.innerHTML = Object.entries(grouped).map(([category, cmds]) => `
    <div class="command-category">
      <div class="category-title">${category}</div>
      ${cmds.map(cmd => `
        <div class="command-item" onclick="executeCommand('${cmd.id}')">
          <span class="command-icon">${cmd.icon}</span>
          <span class="command-name">${cmd.name}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

// Execute command
function executeCommand(commandId) {
  const command = paletteCommands.find(c => c.id === commandId);
  if (command && command.action) {
    closeCommandPalette();
    command.action();
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCommandPalette);
} else {
  initCommandPalette();
}