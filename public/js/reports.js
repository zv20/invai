/**
 * Reports Module
 * Comprehensive analytics and reporting
 * v0.8.0
 */

const Reports = (() => {
  const API_URL = '/api';
  let currentReport = 'stock-value';

  /**
   * Initialize reports tab
   */
  function init() {
    loadReport('stock-value');
  }

  /**
   * Load specific report
   */
  async function loadReport(reportType) {
    currentReport = reportType;
    const container = document.getElementById('reportContent');
    if (!container) return;

    // Update nav active state
    document.querySelectorAll('.report-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.report === reportType);
    });

    container.innerHTML = '<div class="loading">Loading report...</div>';

    try {
      let data;
      switch (reportType) {
        case 'stock-value':
          data = await fetchStockValueReport();
          renderStockValueReport(data, container);
          break;
        case 'expiration':
          data = await fetchExpirationReport();
          renderExpirationReport(data, container);
          break;
        case 'turnover':
          data = await fetchTurnoverReport();
          renderTurnoverReport(data, container);
          break;
        case 'low-stock':
          data = await fetchLowStockReport();
          renderLowStockReport(data, container);
          break;
        default:
          container.innerHTML = '<div class="error-state">Unknown report type</div>';
      }
    } catch (error) {
      console.error('Report loading error:', error);
      container.innerHTML = '<div class="error-state">Failed to load report</div>';
    }
  }

  /**
   * Fetch stock value report
   */
  async function fetchStockValueReport() {
    const response = await fetch(`${API_URL}/reports/stock-value`);
    return response.json();
  }

  /**
   * Render stock value report
   */
  function renderStockValueReport(data, container) {
    const { byCategory, bySupplier, total } = data;

    container.innerHTML = `
      <div class="report-summary">
        <h3>Total Inventory Value: <span class="highlight">$${total.toFixed(2)}</span></h3>
      </div>
      
      <div class="report-section">
        <h4>By Category</h4>
        <div class="report-table">
          ${renderValueTable(byCategory)}
        </div>
      </div>

      <div class="report-section">
        <h4>By Supplier</h4>
        <div class="report-table">
          ${renderValueTable(bySupplier)}
        </div>
      </div>

      <div class="report-actions">
        <button onclick="Reports.exportReport('stock-value')">💾 Export to CSV</button>
      </div>
    `;
  }

  /**
   * Render value table
   */
  function renderValueTable(data) {
    if (!data || data.length === 0) {
      return '<div class="empty-state-small">No data available</div>';
    }

    return `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Products</th>
            <th>Items</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td>${row.name || 'Uncategorized'}</td>
              <td>${row.product_count}</td>
              <td>${row.total_items}</td>
              <td><strong>$${row.total_value.toFixed(2)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Export current report to CSV
   */
  async function exportReport(reportType) {
    try {
      const response = await fetch(`${API_URL}/reports/export?type=${reportType}&format=csv`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showNotification('Report exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export report', 'error');
    }
  }

  /**
   * Fetch expiration report
   */
  async function fetchExpirationReport() {
    const response = await fetch(`${API_URL}/reports/expiration`);
    return response.json();
  }

  /**
   * Render expiration report
   */
  function renderExpirationReport(data, container) {
    const { expired, urgent, soon } = data;

    container.innerHTML = `
      <div class="report-section">
        <h4 style="color: #ef4444;">❌ Expired (${expired.length})</h4>
        ${renderExpirationList(expired, 'expired')}
      </div>

      <div class="report-section">
        <h4 style="color: #f59e0b;">⚠️ Urgent - 7 days (${urgent.length})</h4>
        ${renderExpirationList(urgent, 'urgent')}
      </div>

      <div class="report-section">
        <h4 style="color: #3b82f6;">⏰ Soon - 30 days (${soon.length})</h4>
        ${renderExpirationList(soon, 'soon')}
      </div>

      <div class="report-actions">
        <button onclick="Reports.exportReport('expiration')">💾 Export to CSV</button>
      </div>
    `;
  }

  /**
   * Render expiration list
   */
  function renderExpirationList(items, status) {
    if (!items || items.length === 0) {
      return '<div class="empty-state-small">✓ No items</div>';
    }

    return `
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Expiry Date</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.product_name}</td>
              <td>${item.quantity}</td>
              <td>${item.expiry_date}</td>
              <td>${item.location || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Fetch turnover report (placeholder)
   */
  async function fetchTurnoverReport() {
    return { message: 'Turnover analysis coming soon' };
  }

  /**
   * Render turnover report
   */
  function renderTurnoverReport(data, container) {
    container.innerHTML = `
      <div class="report-placeholder">
        <h3>📊 Turnover Analysis</h3>
        <p>Product movement and turnover analysis will be available in v0.8.1</p>
      </div>
    `;
  }

  /**
   * Fetch low stock report
   */
  async function fetchLowStockReport() {
    const response = await fetch(`${API_URL}/alerts/reorder-needed`);
    return response.json();
  }

  /**
   * Render low stock report
   */
  function renderLowStockReport(data, container) {
    const items = data.items || [];

    container.innerHTML = `
      <div class="report-summary">
        <h3>${items.length} Products Below Reorder Point</h3>
      </div>

      <div class="report-section">
        ${items.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stock</th>
                <th>Reorder Point</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.current_stock}</td>
                  <td>${item.reorder_point}</td>
                  <td><span class="badge badge-warning">Low Stock</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="empty-state-small">✓ All products adequately stocked</div>'}
      </div>

      <div class="report-actions">
        <button onclick="Reports.exportReport('low-stock')">💾 Export to CSV</button>
      </div>
    `;
  }

  return {
    init,
    loadReport,
    exportReport
  };
})();

// Make globally available
if (typeof window !== 'undefined') {
  window.Reports = Reports;
}