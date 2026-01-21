/**
 * Inventory Filters
 * Advanced filtering system for products
 */

class InventoryFilters {
    constructor() {
        this.activeFilters = {
            category: null,
            supplier: null,
            stockStatus: null,
            expiryStatus: null,
            storageTemp: null,
            location: null,
            search: ''
        };
        this.categories = [];
        this.suppliers = [];
        this.init();
    }

    async init() {
        await this.loadFilterData();
        this.setupEventListeners();
        this.renderFilters();
    }

    async loadFilterData() {
        try {
            const [categoriesRes, suppliersRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/suppliers')
            ]);
            this.categories = await categoriesRes.json();
            this.suppliers = await suppliersRes.json();
        } catch (error) {
            console.error('Error loading filter data:', error);
        }
    }

    renderFilters() {
        const container = document.getElementById('filterPanel');
        if (!container) return;

        container.innerHTML = `
            <div class="filter-section">
                <h3>Filters</h3>
                <button class="btn-secondary" onclick="inventoryFilters.clearAllFilters()">Clear All</button>
            </div>

            <div class="filter-group">
                <label>Category</label>
                <select id="filterCategory" onchange="inventoryFilters.applyFilter('category', this.value)">
                    <option value="">All Categories</option>
                    ${this.categories.map(cat => 
                        `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`
                    ).join('')}
                </select>
            </div>

            <div class="filter-group">
                <label>Supplier</label>
                <select id="filterSupplier" onchange="inventoryFilters.applyFilter('supplier', this.value)">
                    <option value="">All Suppliers</option>
                    ${this.suppliers.filter(s => s.is_active).map(sup => 
                        `<option value="${sup.id}">${sup.name}</option>`
                    ).join('')}
                </select>
            </div>

            <div class="filter-group">
                <label>Stock Status</label>
                <select id="filterStockStatus" onchange="inventoryFilters.applyFilter('stockStatus', this.value)">
                    <option value="">All</option>
                    <option value="in-stock">In Stock</option>
                    <option value="low-stock">Low Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                </select>
            </div>

            <div class="filter-group">
                <label>Expiry Status</label>
                <select id="filterExpiryStatus" onchange="inventoryFilters.applyFilter('expiryStatus', this.value)">
                    <option value="">All</option>
                    <option value="expired">Expired</option>
                    <option value="urgent">Expiring Soon (7 days)</option>
                    <option value="soon">Expiring (30 days)</option>
                    <option value="normal">Normal</option>
                </select>
            </div>

            <div class="filter-group">
                <label>Storage Temperature</label>
                <select id="filterStorageTemp" onchange="inventoryFilters.applyFilter('storageTemp', this.value)">
                    <option value="">All</option>
                    <option value="frozen">❄️ Frozen</option>
                    <option value="refrigerated">🧊 Refrigerated</option>
                    <option value="dry">📦 Dry</option>
                    <option value="ambient">🌡️ Ambient</option>
                </select>
            </div>

            <div class="active-filters" id="activeFiltersDisplay"></div>
        `;

        this.updateActiveFiltersDisplay();
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.activeFilters.search = e.target.value.toLowerCase();
                this.applyAllFilters();
            });
        }
    }

    applyFilter(filterType, value) {
        this.activeFilters[filterType] = value || null;
        this.applyAllFilters();
        this.updateActiveFiltersDisplay();
    }

    applyAllFilters() {
        if (typeof window.loadProducts === 'function') {
            window.loadProducts(this.activeFilters);
        }
    }

    clearAllFilters() {
        this.activeFilters = {
            category: null,
            supplier: null,
            stockStatus: null,
            expiryStatus: null,
            storageTemp: null,
            location: null,
            search: ''
        };

        // Reset UI
        document.querySelectorAll('#filterPanel select').forEach(select => select.value = '');
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';

        this.applyAllFilters();
        this.updateActiveFiltersDisplay();
    }

    updateActiveFiltersDisplay() {
        const display = document.getElementById('activeFiltersDisplay');
        if (!display) return;

        const activeCount = Object.values(this.activeFilters).filter(v => v).length;
        
        if (activeCount === 0) {
            display.innerHTML = '';
            return;
        }

        display.innerHTML = `<p><strong>${activeCount} filter(s) active</strong></p>`;
    }

    getActiveFilters() {
        return this.activeFilters;
    }
}

// Global instance
let inventoryFilters;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        inventoryFilters = new InventoryFilters();
    });
} else {
    inventoryFilters = new InventoryFilters();
}
