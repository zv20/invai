/**
 * Suppliers Manager - v0.7.4
 * Handles supplier CRUD operations
 */

let suppliers = [];
let editingSupplierId = null;

async function loadSuppliers() {
    try {
        const response = await fetch('/api/suppliers');
        suppliers = await response.json();
        renderSuppliersList();
        
        // Also update product modal dropdown
        updateSupplierDropdown();
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

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
                <h4>${sup.name} ${sup.is_active ? '' : '<span class="badge-inactive">Inactive</span>'}</h4>
                ${sup.contact_name ? `<p><strong>Contact:</strong> ${sup.contact_name}</p>` : ''}
                ${sup.contact_email ? `<p>📧 ${sup.contact_email}</p>` : ''}
                ${sup.contact_phone ? `<p>📞 ${sup.contact_phone}</p>` : ''}
                ${sup.notes ? `<p style="font-style: italic; color: #999; margin-top: 8px;">${sup.notes}</p>` : ''}
            </div>
            <div class="supplier-actions">
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

function openAddSupplierModal() {
    editingSupplierId = null;
    document.getElementById('supplierModalTitle').textContent = 'Add Supplier';
    document.getElementById('supplierForm').reset();
    document.getElementById('supplierModal').style.display = 'block';
}

function editSupplier(id) {
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;
    
    editingSupplierId = id;
    document.getElementById('supplierModalTitle').textContent = 'Edit Supplier';
    document.getElementById('supplierName').value = supplier.name;
    document.getElementById('supplierContactName').value = supplier.contact_name || '';
    document.getElementById('supplierContactPhone').value = supplier.contact_phone || '';
    document.getElementById('supplierContactEmail').value = supplier.contact_email || '';
    document.getElementById('supplierAddress').value = supplier.address || '';
    document.getElementById('supplierNotes').value = supplier.notes || '';
    document.getElementById('supplierModal').style.display = 'block';
}

function closeSupplierModal() {
    document.getElementById('supplierModal').style.display = 'none';
    editingSupplierId = null;
}

async function deleteSupplier(id) {
    const supplier = suppliers.find(s => s.id === id);
    if (!confirm(`Delete supplier "${supplier.name}"? Products will be moved to "Unknown".`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Supplier deleted', 'success');
            loadSuppliers();
        } else {
            showToast('Failed to delete supplier', 'error');
        }
    } catch (error) {
        console.error('Error deleting supplier:', error);
        showToast('Failed to delete supplier', 'error');
    }
}

// Form submit handler
if (document.getElementById('supplierForm')) {
    document.getElementById('supplierForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            name: document.getElementById('supplierName').value,
            contact_name: document.getElementById('supplierContactName').value,
            contact_phone: document.getElementById('supplierContactPhone').value,
            contact_email: document.getElementById('supplierContactEmail').value,
            address: document.getElementById('supplierAddress').value,
            notes: document.getElementById('supplierNotes').value,
            is_active: 1
        };
        
        try {
            const url = editingSupplierId 
                ? `/api/suppliers/${editingSupplierId}` 
                : '/api/suppliers';
            const method = editingSupplierId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showToast(editingSupplierId ? 'Supplier updated' : 'Supplier created', 'success');
                closeSupplierModal();
                loadSuppliers();
            } else {
                showToast('Failed to save supplier', 'error');
            }
        } catch (error) {
            console.error('Error saving supplier:', error);
            showToast('Failed to save supplier', 'error');
        }
    });
}
