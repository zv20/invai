/**
 * Suppliers Manager - v0.10.5
 * Handles supplier CRUD operations
 * ADDED v0.10.5: Client-side caching to reduce API calls and prevent rate limiting (PR #32)
 * FIXED v0.10.3: Removed inline styles for 100% CSP compliance (PR #29)
 * FIXED v0.10.2: Added safety check in deleteSupplier to prevent crash
 * FIXED v0.10.1: Removed inline onclick handlers for CSP compliance
 */

let suppliers = [];
let editingSupplierId = null;

// Cache management
const suppliersCache = {
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000, // 5 minutes cache
    
    isValid() {
        return this.data && (Date.now() - this.timestamp) < this.ttl;
    },
    
    set(data) {
        this.data = data;
        this.timestamp = Date.now();
        console.log('💾 Suppliers cached for 5 minutes');
    },
    
    get() {
        return this.data;
    },
    
    invalidate() {
        this.data = null;
        this.timestamp = 0;
        console.log('🗑️  Suppliers cache invalidated');
    }
};

// Load suppliers with caching
window.loadSuppliers = async function(forceRefresh = false) {
    // Use cache if valid and not forcing refresh
    if (!forceRefresh && suppliersCache.isValid()) {
        console.log('✅ Using cached suppliers');
        suppliers = suppliersCache.get();
        renderSuppliersList();
        updateSupplierDropdown();
        return;
    }
    
    console.log('🔄 Loading suppliers from API...');
    try {
        const response = await authFetch('/api/suppliers');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        suppliers = data;
        suppliersCache.set(data);
        
        console.log(`✅ Loaded ${suppliers.length} suppliers:`, suppliers);
        
        renderSuppliersList();
        updateSupplierDropdown();
        
    } catch (error) {
        console.error('❌ Error loading suppliers:', error);
        const container = document.getElementById('suppliersList');
        if (container) {
            container.innerHTML = `<p class="error-state">Failed to load suppliers: ${error.message}</p>`;
        }
    }
};

function renderSuppliersList() {
    const container = document.getElementById('suppliersList');
    if (!container) {
        console.warn('⚠️  suppliersList container not found');
        return;
    }
    
    console.log(`🎨 Rendering ${suppliers.length} suppliers...`);
    
    if (suppliers.length === 0) {
        container.innerHTML = '<p class="empty-state">No suppliers yet. Click "Add Supplier" to create one.</p>';
        return;
    }
    
    container.innerHTML = suppliers.map(sup => `
        <div class="supplier-card ${!sup.is_active ? 'inactive' : ''}">
            <div class="supplier-info">
                <h4>
                    ${escapeHtml(sup.name)}
                    ${!sup.is_active ? '<span class="badge-inactive">Inactive</span>' : ''}
                </h4>
                ${sup.contact_name ? `<p><strong>Contact:</strong> ${escapeHtml(sup.contact_name)}</p>` : ''}
                ${sup.email ? `<p>📧 ${escapeHtml(sup.email)}</p>` : ''}
                ${sup.phone ? `<p>📞 ${escapeHtml(sup.phone)}</p>` : ''}
                ${sup.notes ? `<p class="supplier-notes">${escapeHtml(sup.notes)}</p>` : ''}
            </div>
            <div class="supplier-actions">
                <button 
                    class="btn-icon" 
                    data-action="toggleSupplierStatus"
                    data-supplier-id="${sup.id}"
                    data-new-status="${sup.is_active ? 0 : 1}"
                    title="${sup.is_active ? 'Mark as Inactive' : 'Mark as Active'}">
                    ${sup.is_active ? '✅' : '❌'}
                </button>
                <button class="btn-icon" data-action="editSupplier" data-supplier-id="${sup.id}" title="Edit">✏️</button>
                <button class="btn-icon" data-action="deleteSupplier" data-supplier-id="${sup.id}" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
    
    console.log('✅ Suppliers rendered to UI');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateSupplierDropdown() {
    const select = document.getElementById('prodSupplier');
    if (select) {
        const oldValue = select.value;
        select.innerHTML = '<option value="">Select supplier...</option>' +
            suppliers.filter(s => s.is_active).map(sup => `<option value="${sup.id}">${escapeHtml(sup.name)}</option>`).join('');
        select.value = oldValue;
        console.log('✅ Supplier dropdown updated');
    }
}

// Toggle supplier active status
window.toggleSupplierStatus = async function(id, newStatus) {
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;
    
    try {
        const response = await authFetch(`/api/suppliers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: supplier.name,
                contact_name: supplier.contact_name,
                phone: supplier.phone,
                email: supplier.email,
                address: supplier.address,
                notes: supplier.notes,
                is_active: newStatus
            })
        });
        
        if (response.ok) {
            showToast(
                `${supplier.name} marked as ${newStatus ? 'active' : 'inactive'}`, 
                'success'
            );
            // Invalidate cache and force reload
            suppliersCache.invalidate();
            await window.loadSuppliers(true);
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to update supplier status', 'error');
        }
    } catch (error) {
        console.error('Error updating supplier status:', error);
        showToast('Failed to update supplier status', 'error');
    }
};

window.openAddSupplierModal = function() {
    editingSupplierId = null;
    const modal = document.getElementById('supplierModal');
    const form = document.getElementById('supplierForm');
    
    if (!modal || !form) {
        console.error('Supplier modal or form not found!');
        alert('Error: Modal not found. Please refresh the page.');
        return;
    }
    
    document.getElementById('supplierModalTitle').textContent = 'Add Supplier';
    form.reset();
    document.getElementById('supplierIsActive').checked = true;
    modal.style.display = 'block';
};

window.editSupplier = function(id) {
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;
    
    editingSupplierId = id;
    const modal = document.getElementById('supplierModal');
    
    document.getElementById('supplierModalTitle').textContent = 'Edit Supplier';
    document.getElementById('supplierName').value = supplier.name;
    document.getElementById('supplierContactName').value = supplier.contact_name || '';
    document.getElementById('supplierContactPhone').value = supplier.phone || '';
    document.getElementById('supplierContactEmail').value = supplier.email || '';
    document.getElementById('supplierAddress').value = supplier.address || '';
    document.getElementById('supplierNotes').value = supplier.notes || '';
    document.getElementById('supplierIsActive').checked = supplier.is_active ? true : false;
    modal.style.display = 'block';
};

window.closeSupplierModal = function() {
    document.getElementById('supplierModal').style.display = 'none';
    editingSupplierId = null;
};

window.deleteSupplier = async function(id) {
    const supplier = suppliers.find(s => s.id === id);
    
    if (!supplier) {
        console.warn('⚠️  Supplier not found, may have been already deleted');
        return;
    }
    
    if (!confirm(`Delete supplier "${supplier.name}"? Products will be moved to "Unknown".`)) {
        return;
    }
    
    try {
        const response = await authFetch(`/api/suppliers/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Supplier deleted', 'success');
            // Invalidate cache and force reload
            suppliersCache.invalidate();
            await window.loadSuppliers(true);
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to delete supplier', 'error');
        }
    } catch (error) {
        console.error('Error deleting supplier:', error);
        showToast('Failed to delete supplier', 'error');
    }
};

// Form submit handler
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSupplierForm);
} else {
    setupSupplierForm();
}

function setupSupplierForm() {
    const form = document.getElementById('supplierForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const isActiveCheckbox = document.getElementById('supplierIsActive');
            
            const data = {
                name: document.getElementById('supplierName').value,
                contact_name: document.getElementById('supplierContactName').value,
                phone: document.getElementById('supplierContactPhone').value,
                email: document.getElementById('supplierContactEmail').value,
                address: document.getElementById('supplierAddress').value,
                notes: document.getElementById('supplierNotes').value,
                is_active: isActiveCheckbox.checked ? 1 : 0
            };
            
            console.log('💾 Saving supplier:', data);
            
            try {
                const url = editingSupplierId 
                    ? `/api/suppliers/${editingSupplierId}` 
                    : '/api/suppliers';
                const method = editingSupplierId ? 'PUT' : 'POST';
                
                console.log(`🚀 ${method} ${url}`);
                
                const response = await authFetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Supplier saved:', result);
                    
                    showToast(editingSupplierId ? 'Supplier updated' : 'Supplier created', 'success');
                    window.closeSupplierModal();
                    
                    // Invalidate cache and force reload
                    suppliersCache.invalidate();
                    setTimeout(async () => {
                        console.log('🔄 Reloading suppliers after save...');
                        await window.loadSuppliers(true);
                    }, 100);
                } else {
                    const error = await response.json();
                    console.error('❌ Save failed:', error);
                    showToast(error.error || 'Failed to save supplier', 'error');
                }
            } catch (error) {
                console.error('❌ Error saving supplier:', error);
                showToast('Failed to save supplier: ' + error.message, 'error');
            }
        });
    } else {
        console.warn('⚠️  supplierForm not found - form submission will not work');
    }
}
