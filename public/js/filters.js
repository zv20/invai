// Inventory Filtering Module
const InventoryFilters = (() => {
    let activeFilters = {
        category: null,
        supplier: null,
        stockStatus: null,
        expiryStatus: null,
        storageTemp: null,
        location: null,
        search: ''
    };
    
    let allProducts = [];
    let categories = [];
    let suppliers = [];
    
    async function init() {
        await Promise.all([
            loadCategories(),
            loadSuppliers()
        ]);
        renderFilterUI();
        attachEventListeners();
    }
    
    async function loadCategories() {
        try {
            const response = await fetch('/api/categories');
            categories = await response.json();
        } catch (error) {
            console.error('Error loading categories for filters:', error);
        }
    }
    
    async function loadSuppliers() {
        try {
            const response = await fetch('/api/suppliers');
            suppliers = await response.json();
        } catch (error) {
            console.error('Error loading suppliers for filters:', error);
        }
    }
    
    function renderFilterUI() {
        const filterPanel = document.getElementById('filter-panel');
        if (!filterPanel) return;
        
        filterPanel.innerHTML = `
            <div class="filter-section">
                <h3 class="filter-title">Filters</h3>
                <button onclick="InventoryFilters.clearAllFilters()" class="btn-clear-filters">Clear All</button>
            </div>
            
            <div class="filter-group">
                <label>Category</label>
                <select id="filter-category" class="filter-select">
                    <option value="">All Categories</option>
                    ${categories.map(cat => `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`).join('')}
                </select>
            </div>
            
            <div class="filter-group">
                <label>Supplier</label>
                <select id="filter-supplier" class="filter-select">
                    <option value="">All Suppliers</option>
                    ${suppliers.map(sup => `<option value="${sup.id}">${sup.name}</option>`).join('')}
                </select>
            </div>
            
            <div class="filter-group">
                <label>Stock Status</label>
                <select id="filter-stock-status" class="filter-select">
                    <option value="">All</option>
                    <option value="in-stock">In Stock</option>
                    <option value="low-stock">Low Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label>Expiry Status</label>
                <select id="filter-expiry-status" class="filter-select">
                    <option value="">All</option>
                    <option value="expired">Expired</option>
                    <option value="urgent">Urgent (7 days)</option>
                    <option value="soon">Soon (30 days)</option>
                    <option value="normal">Normal</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label>Storage Temperature</label>
                <select id="filter-storage-temp" class="filter-select">
                    <option value="">All</option>
                    <option value="frozen">❄️ Frozen</option>
                    <option value="refrigerated">🧊 Refrigerated</option>
                    <option value="dry">📦 Dry</option>
                    <option value="ambient">🌡️ Ambient</option>
                </select>
            </div>
            
            <div class="active-filters" id="active-filters"></div>
        `;
    }
    
    function attachEventListeners() {
        document.getElementById('filter-category')?.addEventListener('change', (e) => {
            activeFilters.category = e.target.value || null;
            applyFilters();
        });
        
        document.getElementById('filter-supplier')?.addEventListener('change', (e) => {
            activeFilters.supplier = e.target.value || null;
            applyFilters();
        });
        
        document.getElementById('filter-stock-status')?.addEventListener('change', (e) => {
            activeFilters.stockStatus = e.target.value || null;
            applyFilters();
        });
        
        document.getElementById('filter-expiry-status')?.addEventListener('change', (e) => {
            activeFilters.expiryStatus = e.target.value || null;
            applyFilters();
        });
        
        document.getElementById('filter-storage-temp')?.addEventListener('change', (e) => {
            activeFilters.storageTemp = e.target.value || null;
            applyFilters();
        });
    }
    
    function applyFilters() {
        // Get products from inventory module
        const products = window.allProducts || [];
        
        let filtered = products.filter(product => {
            // Category filter
            if (activeFilters.category && product.category_id != activeFilters.category) {
                return false;
            }
            
            // Supplier filter
            if (activeFilters.supplier && product.supplier_id != activeFilters.supplier) {
                return false;
            }
            
            // Stock status filter
            if (activeFilters.stockStatus) {
                const totalQty = product.total_quantity || 0;
                if (activeFilters.stockStatus === 'in-stock' && totalQty <= 0) return false;
                if (activeFilters.stockStatus === 'low-stock' && (totalQty > 10 || totalQty <= 0)) return false;
                if (activeFilters.stockStatus === 'out-of-stock' && totalQty > 0) return false;
            }
            
            // Expiry status filter (would need batch data)
            if (activeFilters.expiryStatus) {
                // This would require batch-level filtering
                // For now, skip if product doesn't have expiry info
            }
            
            // Storage temp filter
            if (activeFilters.storageTemp && product.storage_temp !== activeFilters.storageTemp) {
                return false;
            }
            
            return true;
        });
        
        updateActiveFiltersDisplay();
        
        // Trigger re-render of products
        if (window.renderFilteredProducts) {
            window.renderFilteredProducts(filtered);
        }
        
        return filtered;
    }
    
    function updateActiveFiltersDisplay() {
        const container = document.getElementById('active-filters');
        if (!container) return;
        
        const activeCount = Object.values(activeFilters).filter(v => v !== null && v !== '').length;
        
        if (activeCount === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = `
            <div class="active-filters-header">
                <span class="active-filters-count">${activeCount} filter(s) active</span>
            </div>
        `;
    }
    
    function clearAllFilters() {
        activeFilters = {
            category: null,
            supplier: null,
            stockStatus: null,
            expiryStatus: null,
            storageTemp: null,
            location: null,
            search: ''
        };
        
        // Reset all dropdowns
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-supplier').value = '';
        document.getElementById('filter-stock-status').value = '';
        document.getElementById('filter-expiry-status').value = '';
        document.getElementById('filter-storage-temp').value = '';
        
        applyFilters();
    }
    
    function getActiveFilters() {
        return activeFilters;
    }
    
    return {
        init,
        applyFilters,
        clearAllFilters,
        getActiveFilters
    };
})();
