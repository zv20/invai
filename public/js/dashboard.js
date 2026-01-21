// Dashboard Module

let dashboardData = null;
let alertData = null;

// Initialize dashboard
async function initDashboard() {
    await loadDashboardStats();
    await loadExpirationAlerts();
    setInterval(loadDashboardStats, 60000); // Refresh every minute
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) throw new Error('Failed to load stats');
        
        dashboardData = await response.json();
        renderDashboard();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Failed to load dashboard statistics', 'error');
    }
}

// Load expiration alerts
async function loadExpirationAlerts() {
    try {
        const response = await fetch('/api/dashboard/expiration-alerts');
        if (!response.ok) throw new Error('Failed to load alerts');
        
        alertData = await response.json();
        renderExpirationAlerts();
    } catch (error) {
        console.error('Error loading alerts:', error);
        showNotification('Failed to load expiration alerts', 'error');
    }
}

// Render dashboard statistics
function renderDashboard() {
    if (!dashboardData) return;
    
    const stats = dashboardData;
    
    // Update stat cards
    document.getElementById('dash-total-products').textContent = stats.totalProducts || 0;
    document.getElementById('dash-total-items').textContent = stats.totalItems || 0;
    document.getElementById('dash-total-value').textContent = formatCurrency(stats.totalValue || 0);
    document.getElementById('dash-low-stock').textContent = stats.lowStock || 0;
    
    // Update category breakdown
    renderCategoryBreakdown(stats.categoryBreakdown || []);
    
    // Update recent activity
    renderRecentActivity(stats.recentProducts || []);
}

// Render category breakdown
function renderCategoryBreakdown(categories) {
    const container = document.getElementById('categoryBreakdown');
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="empty-state-small">No categories yet</div>';
        return;
    }
    
    const html = categories.map(cat => `
        <div class="category-item">
            <div class="category-name">${cat.category || 'Uncategorized'}</div>
            <div class="category-count">${cat.count} products</div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Render recent activity
function renderRecentActivity(products) {
    const container = document.getElementById('recentActivity');
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state-small">No recent products</div>';
        return;
    }
    
    const html = products.slice(0, 5).map(product => `
        <div class="activity-item">
            <div class="activity-name">${product.name}</div>
            <div class="activity-date">${formatDate(product.created_at)}</div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Render expiration alerts
function renderExpirationAlerts() {
    if (!alertData) return;
    
    const expired = alertData.expired || [];
    const urgent = alertData.urgent || [];
    const soon = alertData.soon || [];
    
    // Update counts
    document.getElementById('alert-expired-count').textContent = expired.length;
    document.getElementById('alert-urgent-count').textContent = urgent.length;
    document.getElementById('alert-soon-count').textContent = soon.length;
    
    // Render alert lists
    renderAlertList('expiredList', expired, 'expired');
    renderAlertList('urgentList', urgent, 'expires');
    renderAlertList('soonList', soon, 'expires');
}

// Render individual alert list
function renderAlertList(elementId, items, dateField) {
    const container = document.getElementById(elementId);
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state-small">✓ All good!</div>';
        return;
    }
    
    const html = items.map(item => `
        <div class="alert-item" onclick="viewProductFromAlert(${item.product_id})">
            <div class="alert-item-header">
                <div class="alert-item-name">${item.product_name}</div>
                <div class="alert-item-qty">${item.total_quantity} items</div>
            </div>
            <div class="alert-item-footer">
                <div class="alert-item-date">${dateField === 'expired' ? 'Expired:' : 'Expires:'} ${formatDate(item.expiry_date)}</div>
                ${item.location ? `<div class="alert-item-location">📍 ${item.location}</div>` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// View product from alert
async function viewProductFromAlert(productId) {
    try {
        // Switch to inventory tab
        switchTab('inventory');
        
        // Wait a moment for tab to load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Select the product
        const select = document.getElementById('inventoryProductSelect');
        select.value = productId;
        
        // Load batches
        await loadBatches();
        
        showNotification('Product loaded in Inventory tab', 'success');
    } catch (error) {
        console.error('Error viewing product:', error);
        showNotification('Failed to load product', 'error');
    }
}

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value || 0);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return `${Math.abs(diffDays)} days ago`;
    } else if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Tomorrow';
    } else {
        return `In ${diffDays} days`;
    }
}

// Refresh dashboard
function refreshDashboard() {
    loadDashboardStats();
    loadExpirationAlerts();
    showNotification('Dashboard refreshed', 'success');
}

// Initialize when dashboard tab is shown
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Check if dashboard tab exists
        if (document.getElementById('dashboardTab')) {
            initDashboard();
        }
    });
} else {
    if (document.getElementById('dashboardTab')) {
        initDashboard();
    }
}