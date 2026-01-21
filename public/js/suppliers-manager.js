// Supplier Management Module
const SupplierManager = (() => {
    let suppliers = [];
    
    async function loadSuppliers() {
        try {
            const response = await fetch('/api/suppliers');
            suppliers = await response.json();
            renderSuppliersList();
        } catch (error) {
            console.error('Error loading suppliers:', error);
            showToast('Failed to load suppliers', 'error');
        }
    }
    
    function renderSuppliersList() {
        const container = document.getElementById('suppliers-list');
        if (!container) return;
        
        if (suppliers.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No suppliers found</p>';
            return;
        }
        
        container.innerHTML = suppliers.map(supplier => `
            <div class="supplier-card" data-id="${supplier.id}">
                <div class="supplier-header">
                    <div class="supplier-info">
                        <h4>${supplier.name}</h4>
                        ${supplier.contact_name ? `<p class="text-sm">Contact: ${supplier.contact_name}</p>` : ''}
                        ${supplier.phone ? `<p class="text-sm">Phone: ${supplier.phone}</p>` : ''}
                        ${supplier.email ? `<p class="text-sm">Email: ${supplier.email}</p>` : ''}
                    </div>
                    <div class="supplier-actions">
                        <button onclick="SupplierManager.editSupplier(${supplier.id})" class="btn-icon" title="Edit">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="SupplierManager.deleteSupplier(${supplier.id})" class="btn-icon text-red-600" title="Delete">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    function showSupplierModal(supplier = null) {
        const isEdit = supplier !== null;
        const modal = document.getElementById('supplier-modal');
        const form = document.getElementById('supplier-form');
        
        document.getElementById('supplier-modal-title').textContent = isEdit ? 'Edit Supplier' : 'Add Supplier';
        
        if (isEdit) {
            document.getElementById('supplier-id').value = supplier.id;
            document.getElementById('supplier-name').value = supplier.name;
            document.getElementById('supplier-contact-name').value = supplier.contact_name || '';
            document.getElementById('supplier-phone').value = supplier.phone || '';
            document.getElementById('supplier-email').value = supplier.email || '';
            document.getElementById('supplier-address').value = supplier.address || '';
            document.getElementById('supplier-notes').value = supplier.notes || '';
        } else {
            form.reset();
            document.getElementById('supplier-id').value = '';
        }
        
        modal.classList.remove('hidden');
    }
    
    async function saveSupplier(event) {
        event.preventDefault();
        
        const id = document.getElementById('supplier-id').value;
        const data = {
            name: document.getElementById('supplier-name').value.trim(),
            contact_name: document.getElementById('supplier-contact-name').value.trim(),
            phone: document.getElementById('supplier-phone').value.trim(),
            email: document.getElementById('supplier-email').value.trim(),
            address: document.getElementById('supplier-address').value.trim(),
            notes: document.getElementById('supplier-notes').value.trim()
        };
        
        try {
            const url = id ? `/api/suppliers/${id}` : '/api/suppliers';
            const method = id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showToast(id ? 'Supplier updated successfully' : 'Supplier added successfully', 'success');
                closeSupplierModal();
                loadSuppliers();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to save supplier', 'error');
            }
        } catch (error) {
            console.error('Error saving supplier:', error);
            showToast('Failed to save supplier', 'error');
        }
    }
    
    async function deleteSupplier(id) {
        if (!confirm('Are you sure you want to delete this supplier? Products using this supplier will need to be reassigned.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
            
            if (response.ok) {
                showToast('Supplier deleted successfully', 'success');
                loadSuppliers();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to delete supplier', 'error');
            }
        } catch (error) {
            console.error('Error deleting supplier:', error);
            showToast('Failed to delete supplier', 'error');
        }
    }
    
    function editSupplier(id) {
        const supplier = suppliers.find(s => s.id === id);
        if (supplier) {
            showSupplierModal(supplier);
        }
    }
    
    function closeSupplierModal() {
        document.getElementById('supplier-modal').classList.add('hidden');
    }
    
    return {
        init: loadSuppliers,
        loadSuppliers,
        showSupplierModal,
        saveSupplier,
        deleteSupplier,
        editSupplier,
        closeSupplierModal
    };
})();
