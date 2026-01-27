// Dashboard Module v0.11.0
// FIXED: Added cache-busting for both stats AND alerts

let dashboardData = null;
let alertData = null;

// Initialize dashboard
async function initDashboard() {
    console.log('🔄 Initializing dashboard...');
    await loadDashboardStats();
    await loadExpirationAlerts();
    
    // Load activity feed (v0.8.0)
    if (typeof ActivityLog !== 'undefined') {
        await ActivityLog.loadRecentActivity();
        console.log('✓ Activity feed loaded');
    }
    
    // Load favorites widget (v0.8.0)
    if (typeof Favorites !== 'undefined') {
        await Favorites.loadFavoritesWidget();
        console.log('✓ Favorites widget loaded');
    }
    
    setInterval(loadDashboardStats, 60000); // Refresh stats every minute
    setInterval(loadExpirationAlerts, 60000); // Refresh alerts every minute
    console.log('✓ Dashboard initialization complete');
}

// Load dashboard statistics - FIXED: Added cache-busting
async function loadDashboardStats() {
    console.log('📊 Loading dashboard stats...');
    try {
        // Add cache-busting timestamp to force fresh data
        const cacheBuster = Date.now();
        const response = await authFetch(`/api/dashboard/stats?_t=${cacheBuster}`);
        if (!response.ok) throw new Error('Failed to load stats');
        
        dashboardData = await response.json();
        console.log('📊 Dashboard data received:', dashboardData);
        renderDashboard();
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        showNotification('Failed to load dashboard statistics', 'error');
    }
}

// Load expiration alerts - FIXED: Added cache-busting
async function loadExpirationAlerts() {
    console.log('🚨 Loading expiration alerts...');
    try {
        // Add cache-busting timestamp to force fresh data
        const cacheBuster = Date.now();
        const response = await authFetch(`/api/dashboard/expiration-alerts?_t=${cacheBuster}`);
        if (!response.ok) throw new Error('Failed to load alerts');
        
        alertData = await response.json();
        console.log('🚨 Alert data received:', alertData);
        console.log(`   - Expired: ${alertData.expired?.length || 0}`);
        console.log(`   - Urgent (7d): ${alertData.urgent?.length || 0}`);
        console.log(`   - Soon (30d): ${alertData.soon?.length || 0}`);
        renderExpirationAlerts();
    } catch (error) {
        console.error('❌ Error loading alerts:', error);
        showNotification('Failed to load expiration alerts', 'error');
    }
}

// Render dashboard statistics
function renderDashboard() {
    console.log('🎨 Rendering dashboard...');
    if (!dashboardData) {
        console.warn('⚠️ No dashboard data to render');
        return;
    }
    
    const stats = dashboardData;
    
    // Check if elements exist
    const elements = {
        products: document.getElementById('dash-total-products'),
        items: document.getElementById('dash-total-items'),
        value: document.getElementById('dash-total-value'),
        lowStock: document.getElementById('dash-low-stock')
    };
    
    console.log('📍 DOM elements found:', {
        products: !!elements.products,
        items: !!elements.items,
        value: !!elements.value,
        lowStock: !!elements.lowStock
    });
    
    // Update stat cards
    if (elements.products) elements.products.textContent = stats.totalProducts || 0;
    if (elements.items) elements.items.textContent = stats.totalItems || 0;
    if (elements.value) elements.value.textContent = formatCurrency(stats.totalValue || 0);
    if (elements.lowStock) elements.lowStock.textContent = stats.lowStock || 0;
    
    console.log('✓ Dashboard stats updated');
    
    // Update category breakdown
    renderCategoryBreakdown(stats.categoryBreakdown || []);
    
    // Update recent activity
    renderRecentActivity(stats.recentProducts || []);
}

// Render category breakdown
function renderCategoryBreakdown(categories) {
    const container = document.getElementById('categoryBreakdown');
    if (!container) {
        console.warn('⚠️ Category breakdown container not found');
        return;
    }
    
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
    console.log(`✓ Rendered ${categories.length} categories`);
}

// Render recent activity
function renderRecentActivity(products) {
    const container = document.getElementById('recentActivity');
    if (!container) {
        console.warn('⚠️ Recent activity container not found');
        return;
    }
    
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
    console.log(`✓ Rendered ${products.length} recent products`);
}

// Render expiration alerts
function renderExpirationAlerts() {
    console.log('🚨 Rendering expiration alerts...');
    if (!alertData) {
        console.warn('⚠️ No alert data to render');
        return;
    }
    
    const expired = alertData.expired || [];
    const urgent = alertData.urgent || [];
    const soon = alertData.soon || [];
    
    console.log(`🚨 Rendering: ${expired.length} expired, ${urgent.length} urgent, ${soon.length} soon`);
    
    // Update counts
    const expiredCount = document.getElementById('alert-expired-count');
    const urgentCount = document.getElementById('alert-urgent-count');
    const soonCount = document.getElementById('alert-soon-count');
    
    if (expiredCount) expiredCount.textContent = expired.length;
    if (urgentCount) urgentCount.textContent = urgent.length;
    if (soonCount) soonCount.textContent = soon.length;
    
    // Render alert lists
    renderAlertList('expiredList', expired, 'expired');
    renderAlertList('urgentList', urgent, 'expires');
    renderAlertList('soonList', soon, 'expires');
    
    console.log(`✓ Alerts rendered - Expired: ${expired.length}, Urgent: ${urgent.length}, Soon: ${soon.length}`);
}

// Render individual alert list
function renderAlertList(elementId, items, dateField) {
    const container = document.getElementById(elementId);
    if (!container) {
        console.warn(`⚠️ Alert list container '${elementId}' not found`);
        return;
    }
    
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
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Open product detail view directly
        if (typeof viewProductDetail === 'function') {
            await viewProductDetail(productId);
        }
        
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

// Format date - Shows relative time for expiration dates
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

// Refresh dashboard - FIXED: Added cache refresh parameter
function refreshDashboard() {
    console.log('🔄 Refreshing dashboard...');
    loadDashboardStats();
    loadExpirationAlerts();
    
    // Refresh activity feed (v0.8.0)
    if (typeof ActivityLog !== 'undefined') {
        ActivityLog.loadRecentActivity();
    }
    
    // Refresh favorites widget (v0.8.0)
    if (typeof Favorites !== 'undefined') {
        Favorites.loadFavoritesWidget();
    }
    
    showNotification('Dashboard refreshed', 'success');
}

// Initialize when dashboard tab is shown
if (document.readyState === 'loading') {
    console.log('⏳ Waiting for DOM to load...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✓ DOM loaded, checking for dashboard tab...');
        // Check if dashboard tab exists
        const dashTab = document.getElementById('dashboardTab');
        if (dashTab) {
            console.log('✓ Dashboard tab found, initializing...');
            initDashboard();
        } else {
            console.error('❌ Dashboard tab not found in DOM!');
        }
    });
} else {
    console.log('✓ DOM already loaded, checking for dashboard tab...');
    const dashTab = document.getElementById('dashboardTab');
    if (dashTab) {
        console.log('✓ Dashboard tab found, initializing...');
        initDashboard();
    } else {
        console.error('❌ Dashboard tab not found in DOM!');
    }
}