/**
 * Dark Mode Module
 * Theme switching functionality
 * v0.8.0
 */

const THEME_KEY = 'invai_theme';
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

let currentTheme = THEMES.LIGHT;

// Initialize theme on page load
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || THEMES.AUTO;
  applyTheme(savedTheme);
  updateThemeToggle(savedTheme);
}

// Apply theme
function applyTheme(theme) {
  currentTheme = theme;
  
  let effectiveTheme = theme;
  
  // Handle auto theme
  if (theme === THEMES.AUTO) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveTheme = prefersDark ? THEMES.DARK : THEMES.LIGHT;
  }
  
  // Apply to document
  if (effectiveTheme === THEMES.DARK) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Save preference
  localStorage.setItem(THEME_KEY, theme);
}

// Toggle theme
function toggleTheme() {
  const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
  applyTheme(newTheme);
  updateThemeToggle(newTheme);
  showNotification(`Switched to ${newTheme} mode`, 'success');
}

// Update theme toggle button
function updateThemeToggle(theme) {
  const toggleBtn = document.getElementById('themeToggle');
  if (!toggleBtn) return;
  
  const icons = {
    light: '☀️',
    dark: '🌙',
    auto: '🔄'
  };
  
  toggleBtn.innerHTML = icons[theme] || icons.light;
  toggleBtn.title = `Current theme: ${theme}`;
}

// Set specific theme
function setTheme(theme) {
  if (!Object.values(THEMES).includes(theme)) {
    console.error('Invalid theme:', theme);
    return;
  }
  applyTheme(theme);
  updateThemeToggle(theme);
}

// Get current theme
function getCurrentTheme() {
  return currentTheme;
}

// Listen for system theme changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (currentTheme === THEMES.AUTO) {
      applyTheme(THEMES.AUTO);
    }
  });
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme);
} else {
  initTheme();
}