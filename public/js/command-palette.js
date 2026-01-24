// Command Palette Module (Standalone)
// Quick command access via Ctrl+K
// Note: Main implementation is in keyboard-shortcuts.js
// This file provides additional palette-specific functionality

// Extended command palette features
const CommandPaletteExtended = {
  history: [],
  maxHistory: 10,

  addToHistory(commandId) {
    this.history = [commandId, ...this.history.filter(id => id !== commandId)]
      .slice(0, this.maxHistory);
    this.saveHistory();
  },

  loadHistory() {
    try {
      const saved = localStorage.getItem('commandHistory');
      if (saved) {
        this.history = JSON.parse(saved);
      }
    } catch (err) {
      console.error('Error loading command history:', err);
    }
  },

  saveHistory() {
    try {
      localStorage.setItem('commandHistory', JSON.stringify(this.history));
    } catch (err) {
      console.error('Error saving command history:', err);
    }
  },

  getRecentCommands() {
    return this.history
      .map(id => CommandPalette.getCommands().find(c => c.id === id))
      .filter(Boolean);
  },

  init() {
    this.loadHistory();
    this.enhanceCommandPalette();
  },

  enhanceCommandPalette() {
    // Override execute to track history
    const originalExecute = CommandPalette.execute;
    CommandPalette.execute = (commandId) => {
      this.addToHistory(commandId);
      return originalExecute.call(CommandPalette, commandId);
    };
  }
};

// Initialize on load
if (typeof CommandPalette !== 'undefined') {
  CommandPaletteExtended.init();
}
