/**
 * Reorder Alerts Module
 * Handles reorder point notifications and alerts
 */

let reorderAlertsData = [];

// Load reorder alerts
async function loadReorderAlerts() {
  try {
    const response = await fetch('/api/alerts/reorder-needed');
    if (!response.ok) throw new Error('Failed to load reorder alerts');
    
    reorderAlertsData = await response.json();
    updateReorderAlertsUI();
  } catch (error) {
    console.error('Error loading reorder alerts:', error);
  }
}

// Update reorder alerts UI
function updateReorderAlertsUI() {
  const container = document.getElementById('reorderAlerts');
  if (!container) return;
  
  const count = reorderAlertsData.length;
  
  if (count === 0) {
    container.innerHTML = '<div class="reorder-alert-empty">✓ All products adequately stocked</div>';
    return;
  }
  
  const html = `
    <div class="reorder-alert-header">
      <span class="reorder-alert-icon">⚠️</span>
      <span class="reorder-alert-count">${count} product${count !== 1 ? 's' : ''} need reordering</span>
    </div>
    <div class="reorder-alert-list">
      ${reorderAlertsData.map(item => `
        <div class="reorder-alert-item" onclick="viewProductFromReorder(${item.product_id})">
          <div class="reorder-alert-name">${item.product_name}</div>
          <div class="reorder-alert-stock">
            <span class="current-stock">${item.current_stock}</span>
            /
            <span class="reorder-point">${item.reorder_point}</span>
            items
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = html;
}

// View product from reorder alert
async function viewProductFromReorder(productId) {
  try {
    // Switch to inventory tab
    switchTab('inventory');
    
    // Wait for tab to load
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Open product detail
    if (typeof openProductDetail === 'function') {
      openProductDetail(productId);
    }
    
    showNotification('Product loaded', 'success');
  } catch (error) {
    console.error('Error viewing product:', error);
    showNotification('Failed to load product', 'error');
  }
}

// Update reorder point for a product
async function updateReorderPoint(productId, reorderPoint, maxStock) {
  try {
    const response = await fetch(`/api/products/${productId}/reorder-point`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reorder_point: reorderPoint, max_stock: maxStock })
    });
    
    if (!response.ok) throw new Error('Failed to update reorder point');
    
    showNotification('Reorder point updated', 'success');
    await loadReorderAlerts();
  } catch (error) {
    console.error('Error updating reorder point:', error);
    showNotification('Failed to update reorder point', 'error');
  }
}

// Initialize reorder alerts
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadReorderAlerts);
} else {
  loadReorderAlerts();
}