// Dark Mode Module
// Theme switching system

const DarkMode = {
  init() {
    this.loadPreference();
    this.setupToggle();
    this.detectSystemPreference();
  },

  loadPreference() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      this.setTheme(saved);
    } else {
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.setTheme('dark');
      }
    }
  },

  setupToggle() {
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => this.toggle());
    }
  },

  detectSystemPreference() {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.updateToggleIcon(theme);
  },

  updateToggleIcon(theme) {
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
      toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
      toggle.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
  },

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DarkMode.init());
} else {
  DarkMode.init();
}
