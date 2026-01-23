/**
 * Dark Mode Module
 * Theme switcher with persistence
 * v0.8.0
 */

const DarkMode = (() => {
  const STORAGE_KEY = 'theme-preference';
  let currentTheme = 'light';

  /**
   * Initialize dark mode
   */
  function init() {
    // Load saved preference or detect system preference
    currentTheme = loadPreference() || detectSystemPreference();
    applyTheme(currentTheme);
    updateToggleButton();
  }

  /**
   * Load saved theme preference
   */
  function loadPreference() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  /**
   * Save theme preference
   */
  function savePreference(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Cannot save theme preference:', e);
    }
  }

  /**
   * Detect system color scheme preference
   */
  function detectSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Toggle theme
   */
  function toggle() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
    savePreference(currentTheme);
    updateToggleButton();
  }

  /**
   * Apply theme
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    currentTheme = theme;
  }

  /**
   * Update toggle button text
   */
  function updateToggleButton() {
    const button = document.getElementById('themeToggle');
    if (button) {
      button.textContent = currentTheme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
    }
  }

  /**
   * Get current theme
   */
  function getCurrentTheme() {
    return currentTheme;
  }

  return {
    init,
    toggle,
    getCurrentTheme
  };
})();

// Make globally available
if (typeof window !== 'undefined') {
  window.DarkMode = DarkMode;
}