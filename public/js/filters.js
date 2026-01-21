/**
 * Inventory Filters - v0.7.4
 * Advanced filtering system for products
 */

let activeFilters = {
    category: '',
    supplier: '',
    stock: '',
    expiry: ''
};

let allProducts = [];
let categories = [];
let suppliers = [];

// Load filter options
async function loadFilterOptions() {
    try {
        const [catRes, supRes] = await Promise.all([
            fetch('/api/categories'),
            fetch('/api/suppliers')
        ]);
        
        categories = await catRes.json();
        suppliers = await supRes.json();
        
        populateFilterDropdowns();
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

function populateFilterDropdowns() {
    const categoryFilter = document.getElementById('filterCategory');
    const supplierFilter = document.getElementById('filterSupplier');
    
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">All Categories</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.icon || ''} ${cat.name}</option>`).join('');
    }
    
    if (supplierFilter) {
        supplierFilter.innerHTML = '<option value="">All Suppliers</option>' +
            suppliers.filter(s => s.is_active).map(sup => `<option value="${sup.id}">${sup.name}</option>`).join('');
    }
}

function applyFilters() {
    const categoryFilter = document.getElementById('filterCategory');
    const supplierFilter = document.getElementById('filterSupplier');
    const stockFilter = document.getElementById('filterStock');
    const expiryFilter = document.getElementById('filterExpiry');
    
    activeFilters.category = categoryFilter ? categoryFilter.value : '';
    activeFilters.supplier = supplierFilter ? supplierFilter.value : '';
    activeFilters.stock = stockFilter ? stockFilter.value : '';
    activeFilters.expiry = expiryFilter ? expiryFilter.value : '';
    
    updateFilterCount();
    
    // Reload products with filters
    if (typeof loadProducts === 'function') {
        loadProducts();
    }
}

function clearAllFilters() {
    activeFilters = {
        category: '',
        supplier: '',
        stock: '',
        expiry: ''
    };
    
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterSupplier').value = '';
    document.getElementById('filterStock').value = '';
    document.getElementById('filterExpiry').value = '';
    
    updateFilterCount();
    
    if (typeof loadProducts === 'function') {
        loadProducts();
    }
}

function updateFilterCount() {
    const count = Object.values(activeFilters).filter(v => v !== '').length;
    const badge = document.getElementById('activeFilterCount');
    const clearBtn = document.querySelector('.clear-filters-btn');
    
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
    
    if (clearBtn) {
        clearBtn.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

function getActiveFilters() {
    return activeFilters;
}

// Initialize when switching to inventory tab
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFilterOptions);
} else {
    loadFilterOptions();
}
