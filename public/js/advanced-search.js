/**
 * Advanced Search JavaScript
 */

const API_BASE = '/api/search';
let currentFilters = {};
let searchResults = [];
let selectedItems = new Set();
let filterOptions = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadFilterOptions();
    loadSavedSearches();
    loadQuickSearches();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('main-search');
    searchInput.addEventListener('input', debounce(handleSearch, 500));
    searchInput.addEventListener('input', debounce(handleAutocomplete, 300));

    // Filter buttons
    document.getElementById('apply-filters').addEventListener('click', handleSearch);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);

    // Export buttons
    document.getElementById('export-csv').addEventListener('click', () => exportResults('csv'));
    document.getElementById('export-json').addEventListener('click', () => exportResults('json'));

    // Bulk actions
    document.getElementById('select-all').addEventListener('change', handleSelectAll);
    document.getElementById('deselect-all').addEventListener('click', deselectAll);
    document.getElementById('bulk-export').addEventListener('click', bulkExport);

    // Save search
    document.getElementById('save-current-search').addEventListener('click', saveCurrentSearch);
}

// Load Filter Options
async function loadFilterOptions() {
    try {
        const response = await fetch(`${API_BASE}/filter-options`);
        const data = await response.json();
        
        if (data.success) {
            filterOptions = data.data;
            renderFilterOptions();
        }
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

// Render Filter Options
function renderFilterOptions() {
    // Categories
    const categoryHTML = filterOptions.categories.map(cat => `
        <div class="filter-checkbox">
            <input type="checkbox" id="cat-${cat.id}" value="${cat.id}" class="category-filter">
            <label for="cat-${cat.id}">${cat.name}</label>
        </div>
    `).join('');
    document.getElementById('category-filters').innerHTML = categoryHTML;

    // Stock Status
    const stockHTML = filterOptions.stockStatuses.map(status => `
        <div class="filter-checkbox">
            <input type="radio" name="stock-status" id="stock-${status.value}" value="${status.value}">
            <label for="stock-${status.value}">${status.label}</label>
        </div>
    `).join('');
    document.getElementById('stock-status-filters').innerHTML = stockHTML;
}

// Handle Search
async function handleSearch() {
    const query = document.getElementById('main-search').value;
    const filters = collectFilters();

    try {
        const response = await fetch(`${API_BASE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, filters })
        });
        const data = await response.json();

        if (data.success) {
            searchResults = data.data;
            renderResults(searchResults);
            updateResultsCount(data.count);
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

// Collect Filters
function collectFilters() {
    const filters = {};

    // Categories
    const selectedCategories = Array.from(document.querySelectorAll('.category-filter:checked'))
        .map(cb => parseInt(cb.value));
    if (selectedCategories.length > 0) {
        filters.categories = selectedCategories;
    }

    // Stock status
    const stockStatus = document.querySelector('input[name="stock-status"]:checked');
    if (stockStatus) {
        filters.stockStatus = stockStatus.value;
    }

    // Price range
    const priceMin = document.getElementById('price-min').value;
    const priceMax = document.getElementById('price-max').value;
    if (priceMin) filters.priceMin = parseFloat(priceMin);
    if (priceMax) filters.priceMax = parseFloat(priceMax);

    return filters;
}

// Render Results
function renderResults(results) {
    const tbody = document.getElementById('results-body');
    
    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #888;">No results found</td></tr>';
        return;
    }

    const html = results.map(product => {
        const stockBadge = getStockBadge(product);
        return `
            <tr data-id="${product.id}">
                <td><input type="checkbox" class="row-select" value="${product.id}"></td>
                <td><strong>${product.name}</strong>${product._highlights?.name ? '<br><small>' + product._highlights.name + '</small>' : ''}</td>
                <td>${product.sku || '-'}</td>
                <td>${product.category_name || '-'}</td>
                <td>${product.stock_quantity}</td>
                <td>$${product.price?.toFixed(2) || '0.00'}</td>
                <td>${stockBadge}</td>
                <td>
                    <button onclick="viewProduct(${product.id})" class="btn btn-sm btn-secondary">View</button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = html;

    // Attach row selection listeners
    document.querySelectorAll('.row-select').forEach(cb => {
        cb.addEventListener('change', handleRowSelect);
    });
}

function getStockBadge(product) {
    if (product.stock_quantity === 0) {
        return '<span class="badge badge-low">Out of Stock</span>';
    } else if (product.stock_quantity <= product.min_stock_level) {
        return '<span class="badge badge-low">Low Stock</span>';
    } else if (product.stock_quantity > product.max_stock_level) {
        return '<span class="badge badge-excess">Excess</span>';
    }
    return '<span class="badge badge-ok">OK</span>';
}

// Autocomplete
async function handleAutocomplete(e) {
    const query = e.target.value;
    if (query.length < 2) {
        document.getElementById('autocomplete-results').style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/autocomplete?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success && data.suggestions.length > 0) {
            renderAutocomplete(data.suggestions);
        } else {
            document.getElementById('autocomplete-results').style.display = 'none';
        }
    } catch (error) {
        console.error('Autocomplete error:', error);
    }
}

function renderAutocomplete(suggestions) {
    const container = document.getElementById('autocomplete-results');
    const html = suggestions.map(s => `
        <div class="autocomplete-item" onclick="selectAutocomplete('${s.name}')">
            <strong>${s.name}</strong>
            ${s.sku ? `<span style="color: #888; margin-left: 10px;">${s.sku}</span>` : ''}
        </div>
    `).join('');

    container.innerHTML = html;
    container.style.display = 'block';
}

function selectAutocomplete(name) {
    document.getElementById('main-search').value = name;
    document.getElementById('autocomplete-results').style.display = 'none';
    handleSearch();
}

// Selection Management
function handleSelectAll(e) {
    const checkboxes = document.querySelectorAll('.row-select');
    checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
        if (e.target.checked) {
            selectedItems.add(parseInt(cb.value));
        } else {
            selectedItems.delete(parseInt(cb.value));
        }
    });
    updateBulkActions();
}

function handleRowSelect(e) {
    const id = parseInt(e.target.value);
    if (e.target.checked) {
        selectedItems.add(id);
    } else {
        selectedItems.delete(id);
    }
    updateBulkActions();
}

function deselectAll() {
    selectedItems.clear();
    document.querySelectorAll('.row-select').forEach(cb => cb.checked = false);
    document.getElementById('select-all').checked = false;
    updateBulkActions();
}

function updateBulkActions() {
    const count = selectedItems.size;
    const bulkPanel = document.getElementById('bulk-actions');
    
    if (count > 0) {
        bulkPanel.classList.add('active');
        document.getElementById('selected-count').textContent = `${count} item(s) selected`;
    } else {
        bulkPanel.classList.remove('active');
    }
}

// Export Functions
async function exportResults(format) {
    const query = document.getElementById('main-search').value;
    const filters = collectFilters();

    try {
        const response = await fetch(`${API_BASE}/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, filters, format })
        });

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products.${format}`;
        a.click();
    } catch (error) {
        console.error('Export error:', error);
    }
}

function bulkExport() {
    const selected = searchResults.filter(p => selectedItems.has(p.id));
    const csv = convertToCSV(selected);
    downloadFile(csv, 'selected-products.csv', 'text/csv');
}

function convertToCSV(data) {
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Stock', 'Price'];
    const rows = data.map(p => [
        p.id,
        p.name,
        p.sku || '',
        p.category_name || '',
        p.stock_quantity,
        p.price
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}

// Saved Searches
async function loadSavedSearches() {
    try {
        const response = await fetch(`${API_BASE}/saved-searches`);
        const data = await response.json();

        if (data.success) {
            renderSavedSearches(data.data);
        }
    } catch (error) {
        console.error('Error loading saved searches:', error);
    }
}

function renderSavedSearches(searches) {
    const html = searches.map(s => `
        <div class="saved-search-item" onclick="executeSavedSearch(${s.id})">
            <div>
                <strong>${s.name}</strong>
                <div style="font-size: 11px; color: #888;">${s.description || ''}</div>
            </div>
            <button onclick="deleteSavedSearch(${s.id}, event)" class="btn btn-sm" style="padding: 4px 8px;">🗑️</button>
        </div>
    `).join('');

    document.getElementById('saved-searches-list').innerHTML = html || '<p style="color: #888; font-size: 12px;">No saved searches</p>';
}

async function saveCurrentSearch() {
    const name = prompt('Enter a name for this search:');
    if (!name) return;

    const query = document.getElementById('main-search').value;
    const filters = collectFilters();

    try {
        const response = await fetch(`${API_BASE}/saved-searches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, query, filters })
        });
        const data = await response.json();

        if (data.success) {
            alert('Search saved successfully!');
            loadSavedSearches();
        }
    } catch (error) {
        console.error('Error saving search:', error);
    }
}

async function executeSavedSearch(id) {
    try {
        const response = await fetch(`${API_BASE}/saved-searches/${id}/execute`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            searchResults = data.results.data || data.results;
            renderResults(searchResults);
            updateResultsCount(searchResults.length);
        }
    } catch (error) {
        console.error('Error executing saved search:', error);
    }
}

async function deleteSavedSearch(id, event) {
    event.stopPropagation();
    if (!confirm('Delete this saved search?')) return;

    try {
        await fetch(`${API_BASE}/saved-searches/${id}`, { method: 'DELETE' });
        loadSavedSearches();
    } catch (error) {
        console.error('Error deleting saved search:', error);
    }
}

// Quick Searches
function loadQuickSearches() {
    const quickSearches = [
        { name: '⚠️ Low Stock', filters: { stockStatus: 'low' } },
        { name: '❌ Out of Stock', filters: { stockStatus: 'out_of_stock' } },
        { name: '📦 Excess Stock', filters: { stockStatus: 'excess' } },
        { name: '💰 High Value', filters: { priceMin: 100 } }
    ];

    const html = quickSearches.map(qs => `
        <button class="quick-search-btn" onclick='applyQuickSearch(${JSON.stringify(qs.filters)})'>
            ${qs.name}
        </button>
    `).join('');

    document.getElementById('quick-searches').innerHTML = html;
}

function applyQuickSearch(filters) {
    currentFilters = filters;
    // Apply filters to UI
    if (filters.stockStatus) {
        const radio = document.getElementById(`stock-${filters.stockStatus}`);
        if (radio) radio.checked = true;
    }
    handleSearch();
}

// Utility Functions
function clearFilters() {
    document.querySelectorAll('.category-filter').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="stock-status"]').forEach(rb => rb.checked = false);
    document.getElementById('price-min').value = '';
    document.getElementById('price-max').value = '';
    currentFilters = {};
    handleSearch();
}

function updateResultsCount(count) {
    document.getElementById('results-count').textContent = `${count} result(s) found`;
}

function viewProduct(id) {
    window.location.href = `/product.html?id=${id}`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
