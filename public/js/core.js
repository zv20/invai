/* ==========================================================================
   Core Application Logic v0.8.4b
   Global state, initialization, utilities, and tab management
   FIXED: CSRF token now refreshed before every state-changing request
   ========================================================================== */

// API Configuration
const API_URL = window.location.origin;

// Global State
let selectedProductId = null;
let editingProductId = null;
let editingBatchId = null;
let editingBatchProductId = null;
let csrfToken = null; // CSRF token for API requests

/* ==========================================================================
   CSRF Token Management
   ========================================================================== */

/**
 * Get CSRF token from cookie
 * The cookie is set by the server and should be readable by JavaScript
 */
function getCsrfTokenFromCookie() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrf_token') {
            return value;
        }
    }
    return null;
}

/**
 * Fetch CSRF token from cookie (not API)
 * Called on app initialization and before state-changing requests
 */
async function fetchCsrfToken() {
    try {
        const token = getCsrfTokenFromCookie();
        if (token) {
            csrfToken = token;
            console.log('✓ CSRF token obtained from cookie');
            return true;
        } else {
            console.warn('⚠️ No CSRF token in cookie - please login');
        }
    } catch (error) {
        console.error('Failed to get CSRF token:', error);
    }
    return false;
}

/* ==========================================================================
   Authentication Helper
   ========================================================================== */

// Authenticated fetch wrapper with CSRF protection
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
        window.location.href = '/login.html';
        throw new Error('No authentication token');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    // FIXED: Always refresh CSRF token before state-changing requests
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        // Get fresh token from cookie before every state-changing request
        await fetchCsrfToken();
        
        if (!csrfToken) {
            throw new Error('Failed to obtain CSRF token');
        }
        
        headers['X-CSRF-Token'] = csrfToken;
    }
    
    const response = await fetch(url, { ...options, headers });
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
        throw new Error('Authentication failed');
    }
    
    // Handle 403 Forbidden (CSRF failure) - should rarely happen now
    if (response.status === 403) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.error && data.error.includes('CSRF')) {
                console.error('⚠️ CSRF validation failed even with fresh token');
                throw new Error('CSRF validation failed');
            }
        }
    }
    
    return response;
}

/* ==========================================================================
   Utility Functions
   ========================================================================== */

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get expiry status for batch cards
function getExpiryStatus(date) {
    if (!date) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiry = new Date(date);
    expiry.setHours(0,0,0,0);
    const days = Math.floor((expiry - today) / (1000*60*60*24));
    if (days < 0) return { status: 'expired', text: `Expired ${Math.abs(days)} days ago` };
    if (days === 0) return { status: 'expiring-soon', text: 'Expires today!' };
    if (days <= 7) return { status: 'expiring-soon', text: `Expires in ${days} day${days > 1 ? 's' : ''}` };
    return null;
}

/* ==========================================================================
   Time and Status Management
   ========================================================================== */

function updateCurrentTime() {
    const timeEl = document.getElementById('currentTime');
    if (!timeEl) return; // Element doesn't exist on this page
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    timeEl.textContent = `${dateStr} ${timeStr}`;
}

async function checkConnection() {
    const statusEl = document.getElementById('status');
    if (!statusEl) return; // Element doesn't exist on this page
    
    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        statusEl.className = 'status connected';
        statusEl.textContent = '✓ Connected';
    } catch (error) {
        statusEl.className = 'status';
        statusEl.textContent = '✕ Disconnected';
    }
}

/* ==========================================================================
   Sidebar Navigation
   ========================================================================== */

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

function switchTab(tabName) {
    // Close sidebar on mobile after selection
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    
    // Update tab content visibility
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) tabContent.classList.add('active');
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.onclick && item.onclick.toString().includes(tabName)) {
            item.classList.add('active');
        }
    });
    
    // Tab-specific actions
    if (tabName === 'dashboard') {
        if (typeof loadDashboardStats === 'function') {
            loadDashboardStats();
            loadExpirationAlerts();
        }
        // Load activity feed
        if (typeof ActivityLog !== 'undefined') {
            ActivityLog.loadRecentActivity();
        }
    }
    if (tabName === 'inventory') {
        const listView = document.getElementById('inventoryListView');
        const detailView = document.getElementById('inventoryDetailView');
        if (listView && detailView) {
            listView.style.display = 'block';
            detailView.style.display = 'none';
        }
        if (typeof loadProducts === 'function') {
            loadProducts();
        }
    }
    if (tabName === 'reports') {
        if (typeof Reports !== 'undefined') {
            Reports.init();
        }
    }
    if (tabName === 'settings') {
        const intervalSelect = document.getElementById('updateCheckInterval');
        if (intervalSelect && typeof getUpdateInterval === 'function') {
            intervalSelect.value = getUpdateInterval();
        }
        if (typeof loadChannelSelector === 'function') {
            loadChannelSelector();
        }
    }
}

/* ==========================================================================
   Notification System
   ========================================================================== */

function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 100000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
    `;
    
    if (type === 'success') {
        notification.style.background = '#10b981';
        notification.style.color = 'white';
        notification.innerHTML = '✓ ' + message;
    } else if (type === 'error') {
        notification.style.background = '#ef4444';
        notification.style.color = 'white';
        notification.innerHTML = '✕ ' + message;
    } else {
        notification.style.background = '#3b82f6';
        notification.style.color = 'white';
        notification.innerHTML = 'ℹ️ ' + message;
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */

// Only add product search listener if element exists
const productSearchEl = document.getElementById('productSearch');
if (productSearchEl) {
    let searchTimeout;
    productSearchEl.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (typeof loadProducts === 'function') {
                loadProducts();
            }
        }, 300);
    });
}

/* ==========================================================================
   Application Initialization
   ========================================================================== */

async function initializeApp() {
    console.log('🚀 Starting Grocery Inventory App v0.8.4b...');
    
    // Fetch CSRF token on app start - WAIT for it!
    await fetchCsrfToken();
    
    // Check if dark mode is loaded (it self-initializes)
    if (typeof DarkMode !== 'undefined') {
        console.log('✓ Dark mode initialized');
    }
    
    // Check if keyboard shortcuts are loaded (they self-initialize)
    if (typeof KeyboardShortcuts !== 'undefined') {
        console.log('✓ Keyboard shortcuts initialized');
    }
    
    // Check if command palette is available (no init needed)
    if (typeof CommandPalette !== 'undefined') {
        console.log('✓ Command palette available');
    }
    
    // Start clock (only if element exists)
    if (document.getElementById('currentTime')) {
        updateCurrentTime();
        setInterval(updateCurrentTime, 1000);
    }
    
    // Check connection (only if element exists)
    if (document.getElementById('status')) {
        checkConnection();
        setInterval(checkConnection, 30000);
    }
    
    // Load categories and suppliers for product form dropdowns (only if functions exist)
    if (typeof loadCategories === 'function') {
        console.log('📂 Loading categories...');
        loadCategories().catch(err => console.error('Failed to load categories:', err));
    }
    if (typeof loadSuppliers === 'function') {
        console.log('📦 Loading suppliers...');
        loadSuppliers().catch(err => console.error('Failed to load suppliers:', err));
    }
    
    // Load initial data for active tab
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'dashboardTab') {
        console.log('📊 Dashboard is active, waiting for dashboard.js to initialize...');
    }
    
    // Check for updates
    setTimeout(() => {
        if (typeof checkVersion === 'function') {
            checkVersion();
        }
    }, 2000);
    
    // Setup auto-update checker
    if (typeof setupUpdateChecker === 'function') {
        setupUpdateChecker();
    }
    
    console.log('✓ Grocery Inventory App v0.8.4b initialized');
    console.log('✓ CSRF protection active (fresh token on every request)');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    console.log('⌛ DOM loading...');
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    console.log('✓ DOM already ready');
    initializeApp();
}