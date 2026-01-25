/**
 * Dashboard Builder JavaScript
 */

const API_BASE = '/api/dashboards';
let currentDashboard = null;
let widgetTypes = [];
let dashboards = [];
let widgetCounter = 0;
let currentEditingWidget = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadWidgetTypes();
    loadDashboards();
    loadTemplates();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('save-dashboard').addEventListener('click', saveDashboard);
    document.getElementById('new-dashboard').addEventListener('click', () => showModal('create-modal'));
    document.getElementById('export-dashboard').addEventListener('click', exportDashboard);
    document.getElementById('import-dashboard').addEventListener('click', importDashboard);
    document.getElementById('clone-dashboard').addEventListener('click', cloneDashboard);
    document.getElementById('delete-dashboard').addEventListener('click', deleteDashboard);
    document.getElementById('dashboard-select').addEventListener('change', loadSelectedDashboard);
    
    // Modal buttons
    document.getElementById('cancel-config').addEventListener('click', () => hideModal('config-modal'));
    document.getElementById('save-config').addEventListener('click', saveWidgetConfig);
    document.getElementById('cancel-create').addEventListener('click', () => hideModal('create-modal'));
    document.getElementById('create-dashboard-btn').addEventListener('click', createDashboard);
}

// Load Widget Types
async function loadWidgetTypes() {
    try {
        const response = await fetch(`${API_BASE}/widgets/types`);
        const data = await response.json();
        
        if (data.success) {
            widgetTypes = data.data;
            renderWidgetGallery();
        }
    } catch (error) {
        console.error('Error loading widget types:', error);
    }
}

// Render Widget Gallery
function renderWidgetGallery() {
    const gallery = document.getElementById('widget-gallery');
    
    const html = widgetTypes.map(widget => `
        <div class="widget-card" draggable="true" data-type="${widget.type}">
            <h4>${widget.icon} ${widget.name}</h4>
            <p>${widget.description}</p>
        </div>
    `).join('');
    
    gallery.innerHTML = html;
    
    // Add drag handlers
    document.querySelectorAll('.widget-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('click', () => addWidget(card.dataset.type));
    });
}

// Load Dashboards
async function loadDashboards() {
    try {
        const response = await fetch(API_BASE);
        const data = await response.json();
        
        if (data.success) {
            dashboards = data.data;
            renderDashboardSelector();
            
            // Load default or first dashboard
            const defaultDashboard = dashboards.find(d => d.is_default) || dashboards[0];
            if (defaultDashboard) {
                document.getElementById('dashboard-select').value = defaultDashboard.id;
                loadDashboard(defaultDashboard);
            }
        }
    } catch (error) {
        console.error('Error loading dashboards:', error);
    }
}

// Render Dashboard Selector
function renderDashboardSelector() {
    const select = document.getElementById('dashboard-select');
    
    const html = '<option value="">Select a dashboard...</option>' +
        dashboards.map(d => `
            <option value="${d.id}">${d.name}${d.is_default ? ' (Default)' : ''}</option>
        `).join('');
    
    select.innerHTML = html;
}

// Load Selected Dashboard
async function loadSelectedDashboard() {
    const select = document.getElementById('dashboard-select');
    const dashboardId = parseInt(select.value);
    
    if (!dashboardId) return;
    
    try {
        const response = await fetch(`${API_BASE}/${dashboardId}`);
        const data = await response.json();
        
        if (data.success) {
            loadDashboard(data.data);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load Dashboard
function loadDashboard(dashboard) {
    currentDashboard = dashboard;
    renderDashboard();
}

// Render Dashboard
function renderDashboard() {
    if (!currentDashboard || !currentDashboard.layout) {
        return;
    }
    
    const grid = document.getElementById('dashboard-grid');
    
    if (currentDashboard.layout.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #888; padding: 40px;">Empty dashboard - Add widgets to get started</div>';
        return;
    }
    
    const html = currentDashboard.layout.map(widget => {
        const widgetType = widgetTypes.find(w => w.type === widget.widgetType);
        return `
            <div class="dashboard-widget" data-id="${widget.i}" style="grid-column: span ${widget.w}; grid-row: span ${widget.h};">
                <div class="widget-header">
                    <strong>${widgetType?.icon || ''} ${widgetType?.name || 'Widget'}</strong>
                    <div class="widget-actions">
                        <button onclick="configureWidget('${widget.i}')">⚙️</button>
                        <button onclick="removeWidget('${widget.i}')">❌</button>
                    </div>
                </div>
                <div class="widget-content" id="widget-content-${widget.i}">
                    Loading...
                </div>
            </div>
        `;
    }).join('');
    
    grid.innerHTML = html;
    
    // Load widget data
    currentDashboard.layout.forEach(widget => {
        loadWidgetData(widget.i, widget.widgetType, widget.config);
    });
}

// Load Widget Data
async function loadWidgetData(widgetId, widgetType, config) {
    try {
        const response = await fetch(`${API_BASE}/widgets/${widgetType}/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config || {})
        });
        const result = await response.json();
        
        if (result.success) {
            renderWidgetContent(widgetId, widgetType, result.data);
        }
    } catch (error) {
        console.error('Error loading widget data:', error);
        document.getElementById(`widget-content-${widgetId}`).innerHTML = 'Error loading data';
    }
}

// Render Widget Content
function renderWidgetContent(widgetId, widgetType, data) {
    const container = document.getElementById(`widget-content-${widgetId}`);
    if (!container) return;
    
    // Type-specific rendering
    switch (widgetType) {
        case 'metric_card':
            container.innerHTML = `
                <div class="metric-value">${data.value}</div>
                <div class="metric-label">${data.label}</div>
                ${data.trend ? `<small style="color: #4CAF50;">${data.trend}</small>` : ''}
            `;
            break;
        
        case 'alert_list':
            if (!data.alerts || data.alerts.length === 0) {
                container.innerHTML = '<p style="color: #888;">No alerts</p>';
            } else {
                container.innerHTML = data.alerts.map(alert => `
                    <div style="padding: 8px; margin-bottom: 8px; background: #2a2a2a; border-radius: 4px; border-left: 3px solid ${alert.type === 'danger' ? '#f44336' : '#FF9800'};">
                        <strong>${alert.title}</strong><br>
                        <small style="color: #888;">${alert.message}</small>
                    </div>
                `).join('');
            }
            break;
        
        case 'stock_status':
            container.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div><strong>${data.total_products || 0}</strong><br><small>Total</small></div>
                    <div style="color: #f44336;"><strong>${data.low_stock || 0}</strong><br><small>Low Stock</small></div>
                    <div style="color: #4CAF50;"><strong>${data.adequate_stock || 0}</strong><br><small>Adequate</small></div>
                    <div style="color: #FF9800;"><strong>${data.excess_stock || 0}</strong><br><small>Excess</small></div>
                </div>
            `;
            break;
        
        case 'table':
            if (!data.rows || data.rows.length === 0) {
                container.innerHTML = '<p style="color: #888;">No data</p>';
            } else {
                const headers = Object.keys(data.rows[0]);
                container.innerHTML = `
                    <table style="width: 100%; font-size: 11px;">
                        <thead><tr>${headers.map(h => `<th style="text-align: left; padding: 4px;">${h}</th>`).join('')}</tr></thead>
                        <tbody>${data.rows.map(row => `<tr>${headers.map(h => `<td style="padding: 4px;">${row[h]}</td>`).join('')}</tr>`).join('')}</tbody>
                    </table>
                `;
            }
            break;
        
        default:
            container.innerHTML = '<pre style="font-size: 11px; color: #888;">' + JSON.stringify(data, null, 2) + '</pre>';
    }
}

// Add Widget
function addWidget(widgetType) {
    if (!currentDashboard) {
        alert('Please select or create a dashboard first');
        return;
    }
    
    const widget = widgetTypes.find(w => w.type === widgetType);
    const newWidget = {
        i: `widget-${++widgetCounter}`,
        x: 0,
        y: currentDashboard.layout.length,
        w: widget.defaultSize.width,
        h: widget.defaultSize.height,
        widgetType: widgetType,
        config: {}
    };
    
    currentDashboard.layout.push(newWidget);
    renderDashboard();
}

// Remove Widget
function removeWidget(widgetId) {
    if (!confirm('Remove this widget?')) return;
    
    currentDashboard.layout = currentDashboard.layout.filter(w => w.i !== widgetId);
    renderDashboard();
}

// Configure Widget
function configureWidget(widgetId) {
    const widget = currentDashboard.layout.find(w => w.i === widgetId);
    if (!widget) return;
    
    currentEditingWidget = widget;
    const widgetType = widgetTypes.find(w => w.type === widget.widgetType);
    
    renderConfigForm(widgetType.configSchema, widget.config);
    showModal('config-modal');
}

// Render Config Form
function renderConfigForm(schema, currentConfig) {
    const form = document.getElementById('config-form');
    
    const html = Object.entries(schema).map(([key, field]) => {
        const value = currentConfig[key] || field.default || '';
        
        let input;
        if (field.type === 'select') {
            const options = field.options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('');
            input = `<select id="config-${key}" class="config-field" data-key="${key}">${options}</select>`;
        } else if (field.type === 'textarea') {
            input = `<textarea id="config-${key}" class="config-field" data-key="${key}" rows="4">${value}</textarea>`;
        } else {
            input = `<input type="${field.type}" id="config-${key}" class="config-field" data-key="${key}" value="${value}">`;
        }
        
        return `
            <div class="form-group">
                <label>${field.label}${field.required ? '*' : ''}</label>
                ${input}
            </div>
        `;
    }).join('');
    
    form.innerHTML = html;
}

// Save Widget Config
function saveWidgetConfig() {
    if (!currentEditingWidget) return;
    
    const fields = document.querySelectorAll('.config-field');
    const newConfig = {};
    
    fields.forEach(field => {
        newConfig[field.dataset.key] = field.value;
    });
    
    currentEditingWidget.config = newConfig;
    hideModal('config-modal');
    renderDashboard();
}

// Save Dashboard
async function saveDashboard() {
    if (!currentDashboard) return;
    
    try {
        const method = currentDashboard.id ? 'PUT' : 'POST';
        const url = currentDashboard.id ? `${API_BASE}/${currentDashboard.id}` : API_BASE;
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentDashboard)
        });
        const data = await response.json();
        
        if (data.success) {
            alert('Dashboard saved successfully!');
            loadDashboards();
        }
    } catch (error) {
        console.error('Error saving dashboard:', error);
        alert('Failed to save dashboard');
    }
}

// Create Dashboard
async function createDashboard() {
    const name = document.getElementById('new-dashboard-name').value;
    const description = document.getElementById('new-dashboard-desc').value;
    
    if (!name) {
        alert('Please enter a dashboard name');
        return;
    }
    
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, layout: [] })
        });
        const data = await response.json();
        
        if (data.success) {
            hideModal('create-modal');
            loadDashboards();
            document.getElementById('new-dashboard-name').value = '';
            document.getElementById('new-dashboard-desc').value = '';
        }
    } catch (error) {
        console.error('Error creating dashboard:', error);
    }
}

// Clone Dashboard
async function cloneDashboard() {
    if (!currentDashboard) return;
    
    const name = prompt('Enter name for cloned dashboard:');
    if (!name) return;
    
    try {
        const response = await fetch(`${API_BASE}/${currentDashboard.id}/clone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await response.json();
        
        if (data.success) {
            alert('Dashboard cloned successfully!');
            loadDashboards();
        }
    } catch (error) {
        console.error('Error cloning dashboard:', error);
    }
}

// Delete Dashboard
async function deleteDashboard() {
    if (!currentDashboard || !confirm('Delete this dashboard?')) return;
    
    try {
        await fetch(`${API_BASE}/${currentDashboard.id}`, { method: 'DELETE' });
        alert('Dashboard deleted');
        currentDashboard = null;
        loadDashboards();
    } catch (error) {
        console.error('Error deleting dashboard:', error);
    }
}

// Export/Import
async function exportDashboard() {
    if (!currentDashboard) return;
    
    const config = await fetch(`${API_BASE}/${currentDashboard.id}/export`).then(r => r.json());
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${currentDashboard.id}.json`;
    a.click();
}

function importDashboard() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const text = await file.text();
        const config = JSON.parse(text);
        
        const response = await fetch(`${API_BASE}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const data = await response.json();
        
        if (data.success) {
            alert('Dashboard imported!');
            loadDashboards();
        }
    };
    input.click();
}

// Load Templates
async function loadTemplates() {
    try {
        const response = await fetch(`${API_BASE}/templates/list`);
        const data = await response.json();
        
        if (data.success) {
            renderTemplates(data.data);
        }
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

// Render Templates
function renderTemplates(templates) {
    const container = document.getElementById('template-list');
    
    const html = templates.map(t => `
        <div class="template-card" onclick="applyTemplate('${t.id}')">
            <h4>${t.name}</h4>
            <p>${t.description}</p>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Apply Template
async function applyTemplate(templateId) {
    const name = prompt('Enter name for new dashboard:');
    if (!name) return;
    
    try {
        const response = await fetch(`${API_BASE}/templates/${templateId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await response.json();
        
        if (data.success) {
            alert('Dashboard created from template!');
            loadDashboards();
        }
    } catch (error) {
        console.error('Error applying template:', error);
    }
}

// Modal Helpers
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Drag and Drop
function handleDragStart(e) {
    e.dataTransfer.setData('widgetType', e.target.dataset.type);
}

// Make functions global for onclick handlers
window.configureWidget = configureWidget;
window.removeWidget = removeWidget;
window.applyTemplate = applyTemplate;
