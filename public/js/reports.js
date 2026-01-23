// Reports Module
// Business intelligence and analytics

const Reports = {
  currentReport: 'overview',

  async init() {
    this.setupEventListeners();
    await this.loadOverview();
  },

  setupEventListeners() {
    // Report type selector
    document.querySelectorAll('.report-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const reportType = item.dataset.report;
        this.switchReport(reportType);
      });
    });

    // Export buttons
    const exportBtn = document.getElementById('exportReportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCurrentReport());
    }
  },

  switchReport(reportType) {
    this.currentReport = reportType;
    
    // Update nav
    document.querySelectorAll('.report-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.report === reportType);
    });

    // Load report
    switch (reportType) {
      case 'overview':
        this.loadOverview();
        break;
      case 'stock-value':
        this.loadStockValue();
        break;
      case 'expiration':
        this.loadExpiration();
        break;
      case 'low-stock':
        this.loadLowStock();
        break;
      case 'turnover':
        this.loadTurnover();
        break;
    }
  },

  async loadOverview() {
    const container = document.getElementById('reportContent');
    container.innerHTML = `
      <div class="report-overview">
        <h2>Reports Overview</h2>
        <div class="report-cards">
          <div class="report-card" data-report="stock-value">
            <div class="report-card-icon">💰</div>
            <h3>Stock Value Report</h3>
            <p>Total inventory value by category and supplier</p>
          </div>
          <div class="report-card" data-report="expiration">
            <div class="report-card-icon">📅</div>
            <h3>Expiration Report</h3>
            <p>Track expiring products and potential waste</p>
          </div>
          <div class="report-card" data-report="low-stock">
            <div class="report-card-icon">⚠️</div>
            <h3>Low Stock Report</h3>
            <p>Products below reorder point</p>
          </div>
          <div class="report-card" data-report="turnover">
            <div class="report-card-icon">🔄</div>
            <h3>Turnover Report</h3>
            <p>Product movement and usage analysis</p>
          </div>
        </div>
      </div>
    `;

    // Add click handlers to cards
    document.querySelectorAll('.report-card').forEach(card => {
      card.addEventListener('click', () => {
        this.switchReport(card.dataset.report);
      });
    });
  },

  async loadStockValue() {
    try {
      const response = await fetch('/api/reports/stock-value');
      const data = await response.json();
      
      const container = document.getElementById('reportContent');
      container.innerHTML = `
        <div class="report-header">
          <h2>Stock Value Report</h2>
          <div class="report-summary">
            <div class="summary-stat">
              <span class="stat-label">Total Value</span>
              <span class="stat-value">$${data.totalValue.toFixed(2)}</span>
            </div>
            <div class="summary-stat">
              <span class="stat-label">Total Items</span>
              <span class="stat-value">${data.totalItems}</span>
            </div>
          </div>
        </div>
        <div class="report-table">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total Value</th>
              </tr>
            </thead>
            <tbody>
              ${data.products.map(p => `
                <tr>
                  <td>${p.name}</td>
                  <td>${p.category || 'Uncategorized'}</td>
                  <td>${p.quantity}</td>
                  <td>$${(p.unit_cost || 0).toFixed(2)}</td>
                  <td>$${(p.total_value || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      console.error('Error loading stock value report:', error);
    }
  },

  async loadExpiration() {
    try {
      const response = await fetch('/api/reports/expiration');
      const data = await response.json();
      
      const container = document.getElementById('reportContent');
      container.innerHTML = `
        <div class="report-header">
          <h2>Expiration Report</h2>
          <div class="report-summary">
            <div class="summary-stat alert">
              <span class="stat-label">Expired</span>
              <span class="stat-value">${data.expired.length}</span>
            </div>
            <div class="summary-stat warning">
              <span class="stat-label">Expiring Soon (7 days)</span>
              <span class="stat-value">${data.urgent.length}</span>
            </div>
            <div class="summary-stat info">
              <span class="stat-label">Expiring (30 days)</span>
              <span class="stat-value">${data.soon.length}</span>
            </div>
          </div>
        </div>
        <div class="report-sections">
          ${this.renderExpirationSection('Expired Items', data.expired, 'expired')}
          ${this.renderExpirationSection('Urgent (7 days)', data.urgent, 'urgent')}
          ${this.renderExpirationSection('Soon (30 days)', data.soon, 'soon')}
        </div>
      `;
    } catch (error) {
      console.error('Error loading expiration report:', error);
    }
  },

  renderExpirationSection(title, items, urgency) {
    if (items.length === 0) {
      return `<div class="report-section"><h3>${title}</h3><p>No items</p></div>`;
    }

    return `
      <div class="report-section ${urgency}">
        <h3>${title}</h3>
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
      </div>
    `;
  },

  async loadLowStock() {
    try {
      const response = await fetch('/api/reports/low-stock');
      const data = await response.json();
      
      const container = document.getElementById('reportContent');
      container.innerHTML = `
        <div class="report-header">
          <h2>Low Stock Report</h2>
          <p>Products below reorder point</p>
        </div>
        <div class="report-table">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Supplier</th>
                <th>Current Stock</th>
                <th>Reorder Point</th>
                <th>Deficit</th>
              </tr>
            </thead>
            <tbody>
              ${data.products.map(p => `
                <tr>
                  <td>${p.name}</td>
                  <td>${p.category || 'Uncategorized'}</td>
                  <td>${p.supplier || '-'}</td>
                  <td>${p.quantity}</td>
                  <td>${p.reorder_point}</td>
                  <td class="deficit">${p.reorder_point - p.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      console.error('Error loading low stock report:', error);
    }
  },

  async loadTurnover() {
    const container = document.getElementById('reportContent');
    container.innerHTML = `
      <div class="report-header">
        <h2>Turnover Report</h2>
        <p class="info-message">📊 Turnover tracking coming in v0.9.0</p>
      </div>
    `;
  },

  async exportCurrentReport() {
    try {
      const response = await fetch(`/api/reports/export/${this.currentReport}`);
      const csv = await response.text();
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentReport}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      showNotification('Report exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting report:', error);
      showNotification('Failed to export report', 'error');
    }
  }
};

// Initialize reports when tab is activated
function initReportsTab() {
  Reports.init();
}
