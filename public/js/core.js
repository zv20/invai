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
let versionInfo = null;

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
   Tab Management
   ========================================================================== */

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
    document.getElementById('mainNav').value = tabName;
    
    if (tabName === 'inventory') loadProductsForInventory();
    if (tabName === 'settings') {
        document.getElementById('updateCheckInterval').value = getUpdateInterval();
    }
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

// ESC key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.getElementById('scannerModal').classList.contains('active')) closeScanner();
        if (document.getElementById('productModal').classList.contains('active')) closeProductModal();
        if (document.getElementById('batchModal').classList.contains('active')) closeBatchModal();
    }
});

/* ==========================================================================
   Application Initialization
   ========================================================================== */

function initializeApp() {
    // Start clock
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Check connection
    checkConnection();
    setInterval(checkConnection, 30000);
    
    // Load initial data
    loadProducts();
    
    // Version check after 2 seconds
    setTimeout(checkVersion, 2000);
    
    // Setup auto-update checker
    setupUpdateChecker();
    
    // Load saved update interval preference
    document.getElementById('updateCheckInterval').value = getUpdateInterval();
    
    console.log('✓ Grocery Inventory App initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}