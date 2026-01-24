/**
 * Suppliers Manager - v0.7.8e
 * Handles supplier CRUD operations
 * FIXED v0.7.8e: Updated version number for supplier active status fix
 * FIXED v0.7.8a: Changed contact_phone/contact_email to phone/email to match database schema
 */

let suppliers = [];
let editingSupplierId = null;

// Load suppliers on page load
window.loadSuppliers = async function() {
    try {
        const response = await authFetch('/api/suppliers');
        suppliers = await response.json();
        renderSuppliersList();
        updateSupplierDropdown();
    } catch (error) {
        console.error('Error loading suppliers:', error);
        const container = document.getElementById('suppliersList');
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 40px;">Failed to load suppliers</p>';
        }
    }
};

function renderSuppliersList() {
    const container = document.getElementById('suppliersList');
    if (!container) return;
    
    if (suppliers.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No suppliers yet. Click "Add Supplier" to create one.</p>';
        return;
    }
    
    container.innerHTML = suppliers.map(sup => `
        <div class="supplier-card" style="opacity: ${sup.is_active ? 1 : 0.6}">
            <div class="supplier-info">
                <h4>
                    ${sup.name}
                    ${!sup.is_active ? '<span class="badge-inactive">Inactive</span>' : ''}
                </h4>
                ${sup.contact_name ? `<p><strong>Contact:</strong> ${sup.contact_name}</p>` : ''}
                ${sup.email ? `<p>📧 ${sup.email}</p>` : ''}
                ${sup.phone ? `<p>📞 ${sup.phone}</p>` : ''}
                ${sup.notes ? `<p style="font-style: italic; color: #999; margin-top: 8px;">${sup.notes}</p>` : ''}
            </div>
            <div class="supplier-actions">
                <button 
                    class="btn-icon" 
                    onclick="toggleSupplierStatus(${sup.id}, ${sup.is_active ? 0 : 1})" 
                    title="${sup.is_active ? 'Mark as Inactive' : 'Mark as Active'}">
                    ${sup.is_active ? '✅' : '❌'}
                </button>
                <button class="btn-icon" onclick="editSupplier(${sup.id})" title="Edit">✏️</button>
                <button class="btn-icon" onclick="deleteSupplier(${sup.id})" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

function updateSupplierDropdown() {
    const select = document.getElementById('prodSupplier');
    if (select) {
        select.innerHTML = '<option value="">Select supplier...</option>' +
            suppliers.filter(s => s.is_active).map(sup => `<option value="${sup.id}">${sup.name}</option>`).join('');
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
            showNotification(
                `${supplier.name} marked as ${newStatus ? 'active' : 'inactive'}`, 
                'success'
            );
            window.loadSuppliers();
        } else {
            showNotification('Failed to update supplier status', 'error');
        }
    } catch (error) {
        console.error('Error updating supplier status:', error);
        showNotification('Failed to update supplier status', 'error');
    }
};

// Make globally accessible
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
    document.getElementById('supplierIsActive').checked = true; // Default to active
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
    if (!confirm(`Delete supplier "${supplier.name}"? Products will be moved to "Unknown".`)) {
        return;
    }
    
    try {
        const response = await authFetch(`/api/suppliers/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showNotification('Supplier deleted', 'success');
            window.loadSuppliers();
        } else {
            showNotification('Failed to delete supplier', 'error');
        }
    } catch (error) {
        console.error('Error deleting supplier:', error);
        showNotification('Failed to delete supplier', 'error');
    }
};

// Form submit handler - attach when DOM loads
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
            
            // Read checkbox value for active status
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
            
            try {
                const url = editingSupplierId 
                    ? `/api/suppliers/${editingSupplierId}` 
                    : '/api/suppliers';
                const method = editingSupplierId ? 'PUT' : 'POST';
                
                const response = await authFetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    showNotification(editingSupplierId ? 'Supplier updated' : 'Supplier created', 'success');
                    window.closeSupplierModal();
                    window.loadSuppliers();
                } else {
                    const error = await response.json();
                    showNotification(error.error || 'Failed to save supplier', 'error');
                }
            } catch (error) {
                console.error('Error saving supplier:', error);
                showNotification('Failed to save supplier', 'error');
            }
        });
    }
}