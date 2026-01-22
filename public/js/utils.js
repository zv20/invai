/* ==========================================================================
   Utility Functions - v0.7.8c
   Toast notifications, date formatting, and safe storage operations
   ========================================================================== */

// Toast Notification System
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Format date helper
function formatDate(dateString) {
  if (!dateString) return 'No date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Calculate days until expiry
function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
}

// Get urgency class based on days
function getUrgencyClass(days) {
  if (days === null) return 'normal';
  if (days < 0) return 'expired';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'warning';
  return 'normal';
}

/* ==========================================================================
   SafeStorage - localStorage wrapper with error handling
   Prevents crashes in private browsing or when quota exceeded
   ========================================================================== */

const SafeStorage = {
  /**
   * Get item from localStorage with fallback
   * @param {string} key - Storage key
   * @param {*} [defaultValue=null] - Value to return if not found or error
   * @returns {string|*} Stored value or default
   */
  getItem(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (e) {
      console.warn(`SafeStorage.getItem failed for key "${key}":`, e);
      return defaultValue;
    }
  },
  
  /**
   * Set item in localStorage with error handling
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   * @returns {boolean} True if successful, false otherwise
   */
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`SafeStorage.setItem failed for key "${key}":`, e);
      // Notify user if showNotification exists
      if (typeof showNotification === 'function') {
        showNotification('⚠️ Settings not saved (storage unavailable)', 'error');
      }
      return false;
    }
  },
  
  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} True if successful, false otherwise
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`SafeStorage.removeItem failed for key "${key}":`, e);
      return false;
    }
  },
  
  /**
   * Clear all localStorage
   * @returns {boolean} True if successful, false otherwise
   */
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.warn('SafeStorage.clear failed:', e);
      return false;
    }
  },
  
  /**
   * Check if localStorage is available
   * @returns {boolean} True if localStorage is accessible
   */
  isAvailable() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }
};
