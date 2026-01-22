/* ==========================================================================
   Core Application Logic
   Global state, initialization, utilities, and tab management
   ========================================================================== */

// API Configuration
const API_URL = window.location.origin;

// Global State
let selectedProductId = null;
let editingProductId = null;
let editingBatchId = null;
let editingBatchProductId = null;
// Note: versionInfo is declared in settings.js where checkVersion() lives

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
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Tab-specific actions
    if (tabName === 'dashboard') {
        // Refresh dashboard data
        if (typeof loadDashboardStats === 'function') {
            loadDashboardStats();
            loadExpirationAlerts();
        }
    }
    if (tabName === 'inventory') {
        // Return to list view and load products
        const listView = document.getElementById('inventoryListView');
        const detailView = document.getElementById('inventoryDetailView');
        if (listView && detailView) {
            listView.style.display = 'block';
            detailView.style.display = 'none';
        }
        loadProducts();
    }
    if (tabName === 'settings') {
        // FIXED: Add null check before accessing element
        const intervalSelect = document.getElementById('updateCheckInterval');
        if (intervalSelect && typeof getUpdateInterval === 'function') {
            intervalSelect.value = getUpdateInterval();
        }
        // Initialize the Updates subtab (default active)
        if (typeof loadChannelSelector === 'function') {
            loadChannelSelector();
        }
    }
}

/* ==========================================================================
   Notification System
   ========================================================================== */

function showNotification(message, type = 'info') {
    // Create notification element
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
    `;
    
    // Set colors based on type
    if (type === 'success') {
        notification.style.background = '#10b981';
        notification.style.color = 'white';
        notification.textContent = '✓ ' + message;
    } else if (type === 'error') {
        notification.style.background = '#ef4444';
        notification.style.color = 'white';
        notification.textContent = '✕ ' + message;
    } else {
        notification.style.background = '#3b82f6';
        notification.style.color = 'white';
        notification.textContent = 'ℹ️ ' + message;
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
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

// Search debouncing
let searchTimeout;
document.getElementById('productSearch').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadProducts, 300);
});

// ESC key to close modals and sidebar
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        // Close sidebar if open
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
        
        // Close modals
        if (document.getElementById('scannerModal').classList.contains('active')) closeScanner();
        if (document.getElementById('productModal').classList.contains('active')) closeProductModal();
        if (document.getElementById('batchModal').classList.contains('active')) closeBatchModal();
    }
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    
    if (sidebar.classList.contains('open') && 
        !sidebar.contains(e.target) && 
        !menuToggle.contains(e.target)) {
        toggleMenu();
    }
});

/* ==========================================================================
   Application Initialization
   ========================================================================== */

function initializeApp() {
    console.log('🚀 Starting Grocery Inventory App v0.7.8d...');
    
    // Start clock
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Check connection
    checkConnection();
    setInterval(checkConnection, 30000);
    
    // Load initial data for active tab
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'dashboardTab') {
        // Dashboard is default - it will initialize itself
        console.log('📊 Dashboard is active, waiting for dashboard.js to initialize...');
    }
    
    // FIXED: Only call checkVersion if it exists (settings.js may not be loaded yet)
    setTimeout(() => {
        if (typeof checkVersion === 'function') {
            checkVersion();
        } else {
            console.warn('⚠️ checkVersion not available yet (settings.js not loaded)');
        }
    }, 2000);
    
    // Setup auto-update checker (only if function exists)
    if (typeof setupUpdateChecker === 'function') {
        setupUpdateChecker();
    }
    
    // Load saved update interval preference (only if function exists)
    if (typeof getUpdateInterval === 'function') {
        const intervalSelect = document.getElementById('updateCheckInterval');
        if (intervalSelect) {
            intervalSelect.value = getUpdateInterval();
        }
    }
    
    console.log('✓ Grocery Inventory App v0.7.8d initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    console.log('⌛ DOM loading...');
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    console.log('✓ DOM already ready');
    initializeApp();
}