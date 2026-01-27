/**
 * Suppliers Settings Module
 * Frontend management for suppliers in Settings page
 */

let suppliersList = [];

/**
 * Load all suppliers from API and display
 */
async function loadSuppliers() {
    try {
        const response = await authFetch(`${API_URL}/api/suppliers`);
        if (!response.ok) throw new Error('Failed to load suppliers');
        
        suppliersList = await response.json();
        renderSuppliersList();
    } catch (error) {
        console.error('Error loading suppliers:', error);
        showNotification('Failed to load suppliers', 'error');
    }
}

/**
 * Render suppliers list in UI
 */
function renderSuppliersList() {
    const container = document.getElementById('suppliersList');
    if (!container) return;
    
    if (suppliersList.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #9ca3af;">🚚 No suppliers yet</div>';
        return;
    }
    
    container.innerHTML = suppliersList.map(supplier => `
        <div class="supplier-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; background: white; ${supplier.is_active ? '' : 'opacity: 0.6;'}">
            <div>
                <div style="font-weight: 600; color: #1f2937;">
                    ${escapeHtml(supplier.name)}
                    ${supplier.is_active ? '' : ' <span style="color: #9ca3af; font-weight: normal;">(Inactive)</span>'}
                </div>
                ${supplier.contact_name ? `<div style="font-size: 0.875rem; color: #6b7280;">Contact: ${escapeHtml(supplier.contact_name)}</div>` : ''}
                ${supplier.phone ? `<div style="font-size: 0.875rem; color: #6b7280;">📞 ${escapeHtml(supplier.phone)}</div>` : ''}
                ${supplier.email ? `<div style="font-size: 0.875rem; color: #6b7280;">✉️ ${escapeHtml(supplier.email)}</div>` : ''}
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="editSupplier(${supplier.id})" class="btn-small btn-primary" style="padding: 6px 12px; font-size: 0.875rem;">✏️ Edit</button>
                <button onclick="deleteSupplier(${supplier.id})" class="btn-small btn-danger" style="padding: 6px 12px; font-size: 0.875rem;">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Show add supplier modal
 */
function showAddSupplierModal() {
    const modal = document.getElementById('supplierModal');
    const form = document.getElementById('supplierForm');
    const title = document.getElementById('supplierModalTitle');
    
    if (!modal || !form || !title) return;
    
    title.textContent = '➕ Add Supplier';
    form.reset();
    form.dataset.mode = 'add';
    delete form.dataset.supplierId;
    
    // Set default active status
    const activeCheckbox = document.getElementById('supplierIsActive');
    if (activeCheckbox) activeCheckbox.checked = true;
    
    modal.classList.add('show');
}

/**
 * Show edit supplier modal
 */
async function editSupplier(id) {
    try {
        const response = await authFetch(`${API_URL}/api/suppliers/${id}`);
        if (!response.ok) throw new Error('Failed to load supplier');
        
        const supplier = await response.json();
        
        const modal = document.getElementById('supplierModal');
        const form = document.getElementById('supplierForm');
        const title = document.getElementById('supplierModalTitle');
        
        if (!modal || !form || !title) return;
        
        title.textContent = '✏️ Edit Supplier';
        form.dataset.mode = 'edit';
        form.dataset.supplierId = id;
        
        document.getElementById('supplierName').value = supplier.name || '';
        document.getElementById('supplierContact').value = supplier.contact_name || '';
        document.getElementById('supplierPhone').value = supplier.phone || '';
        document.getElementById('supplierEmail').value = supplier.email || '';
        document.getElementById('supplierAddress').value = supplier.address || '';
        document.getElementById('supplierNotes').value = supplier.notes || '';
        document.getElementById('supplierIsActive').checked = supplier.is_active == 1;
        
        modal.classList.add('show');
    } catch (error) {
        console.error('Error loading supplier:', error);
        showNotification('Failed to load supplier details', 'error');
    }
}

/**
 * Close supplier modal
 */
function closeSupplierModal() {
    const modal = document.getElementById('supplierModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Save supplier (add or edit)
 */
async function saveSupplier(event) {
    event.preventDefault();
    
    const form = event.target;
    const mode = form.dataset.mode;
    const supplierId = form.dataset.supplierId;
    
    const data = {
        name: document.getElementById('supplierName').value.trim(),
        contact_name: document.getElementById('supplierContact').value.trim(),
        phone: document.getElementById('supplierPhone').value.trim(),
        email: document.getElementById('supplierEmail').value.trim(),
        address: document.getElementById('supplierAddress').value.trim(),
        notes: document.getElementById('supplierNotes').value.trim(),
        is_active: document.getElementById('supplierIsActive').checked ? 1 : 0
    };
    
    if (!data.name) {
        showNotification('Supplier name is required', 'warning');
        return;
    }
    
    try {
        const url = mode === 'edit' 
            ? `${API_URL}/api/suppliers/${supplierId}`
            : `${API_URL}/api/suppliers`;
        
        const method = mode === 'edit' ? 'PUT' : 'POST';
        
        const response = await authFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save supplier');
        }
        
        showNotification(
            mode === 'edit' ? 'Supplier updated successfully' : 'Supplier added successfully',
            'success'
        );
        
        closeSupplierModal();
        await loadSuppliers(); // Refresh the list
        
    } catch (error) {
        console.error('Error saving supplier:', error);
        showNotification(error.message || 'Failed to save supplier', 'error');
    }
}

/**
 * Delete supplier
 */
async function deleteSupplier(id) {
    const supplier = suppliersList.find(s => s.id === id);
    if (!supplier) return;
    
    if (!confirm(`Delete supplier "${supplier.name}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await authFetch(`${API_URL}/api/suppliers/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete supplier');
        }
        
        showNotification('Supplier deleted successfully', 'success');
        await loadSuppliers(); // Refresh the list
        
    } catch (error) {
        console.error('Error deleting supplier:', error);
        showNotification(error.message || 'Failed to delete supplier', 'error');
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-load suppliers when settings tab is opened
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Suppliers will be loaded when tab is switched via switchSettingsTab()
    });
}
