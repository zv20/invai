/* ==========================================================================
   Core Application Logic v0.8.0
   Global state, initialization, utilities, and tab management
   ========================================================================== */

// API Configuration
const API_URL = window.location.origin;

// Global State
let selectedProductId = null;
let editingProductId = null;
let editingBatchId = null;
let editingBatchProductId = null;

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
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('currentTime').textContent = `${dateStr} ${timeStr}`;
}

async function checkConnection() {
    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        document.getElementById('status').className = 'status connected';
        document.getElementById('status').textContent = '✓ Connected';
    } catch (error) {
        document.getElementById('status').className = 'status';
        document.getElementById('status').textContent = '✕ Disconnected';
    }
}

/* ==========================================================================
   Sidebar Navigation
   ========================================================================== */

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function switchTab(tabName) {
    // Close sidebar on mobile after selection
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    
    // Update tab content visibility
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
    
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
            ActivityLog.loadActivityFeed();
        }
    }
    if (tabName === 'inventory') {
        const listView = document.getElementById('inventoryListView');
        const detailView = document.getElementById('inventoryDetailView');
        if (listView && detailView) {
            listView.style.display = 'block';
            detailView.style.display = 'none';
        }
        loadProducts();
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

let searchTimeout;
document.getElementById('productSearch').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadProducts, 300);
});

/* ==========================================================================
   Application Initialization
   ========================================================================== */

function initializeApp() {
    console.log('🚀 Starting Grocery Inventory App v0.8.0...');
    
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
    
    // Start clock
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Check connection
    checkConnection();
    setInterval(checkConnection, 30000);
    
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
    
    console.log('✓ Grocery Inventory App v0.8.0 initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    console.log('⌛ DOM loading...');
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    console.log('✓ DOM already ready');
    initializeApp();
}