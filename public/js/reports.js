/**
 * Reports Module
 * Analytics and reporting functionality
 * v0.8.0
 */

let currentReport = null;
let reportData = null;

// Initialize reports tab
function initReportsTab() {
  console.log('Reports tab initialized');
  loadReport('stock-value');
}

// Load specific report
async function loadReport(reportType) {
  currentReport = reportType;
  
  // Update active report button
  document.querySelectorAll('.report-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-report="${reportType}"]`)?.classList.add('active');
  
  // Show loading
  const container = document.getElementById('reportContent');
  if (container) {
    container.innerHTML = '<div class="text-center py-8"><div class="spinner"></div><p>Loading report...</p></div>';
  }
  
  try {
    const response = await fetch(`/api/reports/${reportType}`);
    if (!response.ok) throw new Error('Failed to load report');
    
    reportData = await response.json();
    renderReport(reportType, reportData);
  } catch (error) {
    console.error('Error loading report:', error);
    showNotification('Failed to load report', 'error');
    if (container) {
      container.innerHTML = '<div class="text-center py-8 text-red-600">Failed to load report</div>';
    }
  }
}

// Render report based on type
function renderReport(type, data) {
  const container = document.getElementById('reportContent');
  if (!container) return;
  
  switch(type) {
    case 'stock-value':
      renderStockValueReport(data, container);
      break;
    case 'expiration':
      renderExpirationReport(data, container);
      break;
    case 'turnover':
      renderTurnoverReport(data, container);
      break;
    case 'low-stock':
      renderLowStockReport(data, container);
      break;
    case 'consumption':
      renderConsumptionReport(data, container);
      break;
    default:
      container.innerHTML = '<p>Unknown report type</p>';
  }
}

// Stock Value Report
function renderStockValueReport(data, container) {
  const totalValue = data.reduce((sum, item) => sum + (item.value || 0), 0);
  
  container.innerHTML = `
    <div class="report-header mb-6">
      <h2 class="text-2xl font-bold">Stock Value Report</h2>
      <p class="text-gray-600 mt-2">Total inventory value: <span class="font-bold text-green-600">$${totalValue.toFixed(2)}</span></p>
    </div>
    
    <div class="report-table">
      <table class="w-full">
        <thead>
          <tr class="border-b-2 border-gray-300">
            <th class="text-left p-3">Category</th>
            <th class="text-right p-3">Items</th>
            <th class="text-right p-3">Value</th>
            <th class="text-right p-3">% of Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
              <td class="p-3">${item.category || 'Uncategorized'}</td>
              <td class="text-right p-3">${item.total_items || 0}</td>
              <td class="text-right p-3 font-medium">$${(item.value || 0).toFixed(2)}</td>
              <td class="text-right p-3">${((item.value / totalValue) * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Expiration Report
function renderExpirationReport(data, container) {
  container.innerHTML = `
    <div class="report-header mb-6">
      <h2 class="text-2xl font-bold">Expiration Forecast</h2>
      <p class="text-gray-600 mt-2">Products expiring in the next 30 days</p>
    </div>
    
    <div class="space-y-4">
      ${data.length === 0 ? '<p class="text-gray-500 italic">No items expiring soon</p>' : ''}
      ${data.map(item => {
        const daysUntil = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
        const urgency = daysUntil < 0 ? 'expired' : daysUntil <= 7 ? 'urgent' : 'soon';
        const colorClass = urgency === 'expired' ? 'bg-red-100 border-red-500' : 
                          urgency === 'urgent' ? 'bg-orange-100 border-orange-500' : 
                          'bg-yellow-100 border-yellow-500';
        
        return `
          <div class="p-4 border-l-4 ${colorClass} rounded">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-medium">${item.product_name}</h3>
                <p class="text-sm text-gray-600 mt-1">Quantity: ${item.total_quantity} | Location: ${item.location || 'N/A'}</p>
              </div>
              <div class="text-right">
                <p class="font-bold">${daysUntil < 0 ? 'EXPIRED' : `${daysUntil} days`}</p>
                <p class="text-xs text-gray-600">${item.expiry_date}</p>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Low Stock Report
function renderLowStockReport(data, container) {
  container.innerHTML = `
    <div class="report-header mb-6">
      <h2 class="text-2xl font-bold">Low Stock Alert</h2>
      <p class="text-gray-600 mt-2">Products below reorder point</p>
    </div>
    
    <div class="report-table">
      <table class="w-full">
        <thead>
          <tr class="border-b-2 border-gray-300">
            <th class="text-left p-3">Product</th>
            <th class="text-right p-3">Current Stock</th>
            <th class="text-right p-3">Reorder Point</th>
            <th class="text-right p-3">Needed</th>
          </tr>
        </thead>
        <tbody>
          ${data.length === 0 ? '<tr><td colspan="4" class="p-3 text-center text-gray-500 italic">No low stock items</td></tr>' : ''}
          ${data.map(item => `
            <tr class="border-b border-gray-200 hover:bg-gray-50 cursor-pointer" 
                onclick="switchTab('inventory'); setTimeout(() => openProductDetail(${item.id}), 300);">
              <td class="p-3">
                <div class="font-medium">${item.name}</div>
                <div class="text-xs text-gray-600">${item.supplier_name || 'No supplier'}</div>
              </td>
              <td class="text-right p-3 font-medium text-red-600">${item.total_quantity || 0}</td>
              <td class="text-right p-3">${item.reorder_point || 0}</td>
              <td class="text-right p-3 font-bold text-blue-600">${Math.max(0, (item.reorder_point || 0) - (item.total_quantity || 0))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Turnover Report (placeholder)
function renderTurnoverReport(data, container) {
  container.innerHTML = `
    <div class="report-header mb-6">
      <h2 class="text-2xl font-bold">Product Turnover Analysis</h2>
      <p class="text-gray-600 mt-2">Coming soon</p>
    </div>
    <div class="text-center py-12 text-gray-500">
      <p>📊 Turnover analysis requires historical data tracking.</p>
      <p class="mt-2">This feature will be available in future updates.</p>
    </div>
  `;
}

// Consumption Report (placeholder)
function renderConsumptionReport(data, container) {
  container.innerHTML = `
    <div class="report-header mb-6">
      <h2 class="text-2xl font-bold">Consumption Report</h2>
      <p class="text-gray-600 mt-2">Coming soon</p>
    </div>
    <div class="text-center py-12 text-gray-500">
      <p>📈 Consumption tracking requires adjustment history.</p>
      <p class="mt-2">This feature will be available in future updates.</p>
    </div>
  `;
}

// Export current report as CSV
async function exportReport() {
  if (!currentReport || !reportData) {
    showNotification('No report loaded', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/reports/export?type=${currentReport}&format=csv`);
    if (!response.ok) throw new Error('Export failed');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentReport}_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('Report exported successfully', 'success');
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Failed to export report', 'error');
  }
}