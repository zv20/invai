/**
 * Suppliers Manager
 * Handles supplier CRUD operations and display
 */

class SuppliersManager {
    constructor() {
        this.suppliers = [];
        this.init();
    }

    async init() {
        await this.loadSuppliers();
        this.setupEventListeners();
    }

    async loadSuppliers() {
        try {
            const response = await fetch('/api/suppliers');
            this.suppliers = await response.json();
            this.renderSuppliersList();
        } catch (error) {
            console.error('Error loading suppliers:', error);
            showToast('Failed to load suppliers', 'error');
        }
    }

    renderSuppliersList() {
        const container = document.getElementById('suppliersList');
        if (!container) return;

        if (this.suppliers.length === 0) {
            container.innerHTML = '<p class="no-data">No suppliers found</p>';
            return;
        }

        container.innerHTML = this.suppliers.map(supplier => `
            <div class="supplier-item" data-id="${supplier.id}">
                <div class="supplier-info">
                    <h4>${supplier.name} ${supplier.is_active ? '' : '<span class="badge inactive">Inactive</span>'}</h4>
                    <p>${supplier.contact_name || 'No contact name'}</p>
                    ${supplier.contact_email ? `<p>📧 ${supplier.contact_email}</p>` : ''}
                    ${supplier.contact_phone ? `<p>📞 ${supplier.contact_phone}</p>` : ''}
                    ${supplier.notes ? `<p class="notes">${supplier.notes}</p>` : ''}
                </div>
                <div class="supplier-actions">
                    <button class="btn-icon" onclick="suppliersManager.editSupplier(${supplier.id})" title="Edit">
                        ✏️
                    </button>
                    <button class="btn-icon" onclick="suppliersManager.toggleSupplierStatus(${supplier.id})" title="${supplier.is_active ? 'Deactivate' : 'Activate'}">
                        ${supplier.is_active ? '🔴' : '🟢'}
                    </button>
                    <button class="btn-icon" onclick="suppliersManager.deleteSupplier(${supplier.id})" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        const addBtn = document.getElementById('addSupplierBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showSupplierModal());
        }
    }

    showSupplierModal(supplierId = null) {
        const supplier = supplierId ? this.suppliers.find(s => s.id === supplierId) : null;
        
        const modal = document.getElementById('supplierModal');
        const form = document.getElementById('supplierForm');
        
        if (supplier) {
            document.getElementById('supplierId').value = supplier.id;
            document.getElementById('supplierName').value = supplier.name;
            document.getElementById('supplierContactName').value = supplier.contact_name || '';
            document.getElementById('supplierContactEmail').value = supplier.contact_email || '';
            document.getElementById('supplierContactPhone').value = supplier.contact_phone || '';
            document.getElementById('supplierAddress').value = supplier.address || '';
            document.getElementById('supplierNotes').value = supplier.notes || '';
            document.getElementById('supplierActive').checked = supplier.is_active;
            document.getElementById('supplierModalTitle').textContent = 'Edit Supplier';
        } else {
            form.reset();
            document.getElementById('supplierId').value = '';
            document.getElementById('supplierActive').checked = true;
            document.getElementById('supplierModalTitle').textContent = 'Add Supplier';
        }
        
        modal.style.display = 'block';
    }

    async saveSupplier(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const supplierId = formData.get('supplierId');
        const data = {
            name: formData.get('name'),
            contact_name: formData.get('contact_name'),
            contact_email: formData.get('contact_email'),
            contact_phone: formData.get('contact_phone'),
            address: formData.get('address'),
            notes: formData.get('notes'),
            is_active: formData.get('is_active') === 'on' ? 1 : 0
        };

        try {
            const url = supplierId ? `/api/suppliers/${supplierId}` : '/api/suppliers';
            const method = supplierId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showToast(supplierId ? 'Supplier updated' : 'Supplier created', 'success');
                this.closeSupplierModal();
                await this.loadSuppliers();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to save supplier', 'error');
            }
        } catch (error) {
            console.error('Error saving supplier:', error);
            showToast('Failed to save supplier', 'error');
        }
    }

    editSupplier(id) {
        this.showSupplierModal(id);
    }

    async toggleSupplierStatus(id) {
        const supplier = this.suppliers.find(s => s.id === id);
        
        try {
            const response = await fetch(`/api/suppliers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: supplier.is_active ? 0 : 1 })
            });

            if (response.ok) {
                showToast(`Supplier ${supplier.is_active ? 'deactivated' : 'activated'}`, 'success');
                await this.loadSuppliers();
            } else {
                showToast('Failed to update supplier status', 'error');
            }
        } catch (error) {
            console.error('Error updating supplier:', error);
            showToast('Failed to update supplier', 'error');
        }
    }

    async deleteSupplier(id) {
        const supplier = this.suppliers.find(s => s.id === id);
        if (!confirm(`Delete supplier "${supplier.name}"? Products will be moved to "Unknown".`)) {
            return;
        }

        try {
            const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
            if (response.ok) {
                showToast('Supplier deleted', 'success');
                await this.loadSuppliers();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to delete supplier', 'error');
            }
        } catch (error) {
            console.error('Error deleting supplier:', error);
            showToast('Failed to delete supplier', 'error');
        }
    }

    closeSupplierModal() {
        document.getElementById('supplierModal').style.display = 'none';
    }
}

// Global instance
let suppliersManager;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('suppliersList')) {
            suppliersManager = new SuppliersManager();
        }
    });
} else {
    if (document.getElementById('suppliersList')) {
        suppliersManager = new SuppliersManager();
    }
}
