/* ==========================================================================
   Unified Inventory Module - List + Detail Views
   FIXED: Send category_id/supplier_id instead of names
   FIXED: Removed value summary display from inventory
   FIXED: Removed inline onclick handlers for CSP compliance
   FIXED v0.8.5: Removed ALL inline style attributes for CSP compliance
   FIXED v0.8.7: Removed inline style from batch delete button
   ========================================================================== */

// Module variables (global vars are in core.js)
let products = [];
let currentProductDetail = null;

// Load products for inventory list view
async function loadProducts() {
    try {
        const search = document.getElementById('productSearch').value;
        const url = search ? `${API_URL}/api/products?search=${encodeURIComponent(search)}` : `${API_URL}/api/products`;
        
        const response = await authFetch(url);
        if (!response.ok) throw new Error('Failed to load products');
        
        products = await response.json();
        await renderProductList();
        // REMOVED: await loadInventoryValue() - stats belong on dashboard only
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Failed to load products', 'error');
    }
}

// REMOVED: loadInventoryValue() function - not needed in inventory view

// Render product list with stock counts
async function renderProductList() {
    const container = document.getElementById('productList');
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No products found</h3><p>Try adjusting your search or add a new product</p></div>';
        return;
    }
    
    // Get inventory summary for all products
    const response = await authFetch(`${API_URL}/api/inventory/summary`);
    const inventory = await response.json();
    
    const inventoryMap = {};
    inventory.forEach(item => {
        inventoryMap[item.id] = {
            quantity: item.total_quantity || 0,
            batchCount: item.batch_count || 0,
            earliestExpiry: item.earliest_expiry
        };
    });
    
    // Fetch locations for all products
    const locationPromises = products.map(async product => {
        try {
            const res = await authFetch(`${API_URL}/api/batches/product/${product.id}`);
            if (!res.ok) return { productId: product.id, locations: [] };
            const batches = await res.json();
            const locations = [...new Set(batches.map(b => b.location).filter(l => l))];
            return { productId: product.id, locations };
        } catch (error) {
            return { productId: product.id, locations: [] };
        }
    });
    const locationResults = await Promise.all(locationPromises);
    const locationMap = {};
    locationResults.forEach(result => {
        locationMap[result.productId] = result.locations;
    });
    
    const html = products.map(product => {
        const inv = inventoryMap[product.id] || { quantity: 0, batchCount: 0 };
        const stockClass = inv.quantity === 0 ? 'stock-out' : inv.quantity < 10 ? 'stock-low' : 'stock-good';
        const expiryStatus = getExpiryStatus(inv.earliestExpiry);
        const locations = locationMap[product.id] || [];
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-header">
                    <div>
                        <div class="product-name">${escapeHtml(product.name)}</div>
                        <div>
                            ${product.brand ? `<span class="badge badge-brand">${escapeHtml(product.brand)}</span>` : ''}
                            ${product.category_name ? `<span class="badge badge-category">${escapeHtml(product.category_name)}</span>` : ''}
                        </div>
                    </div>
                    <div class="product-stock ${stockClass}">${inv.quantity} items</div>
                </div>
                ${expiryStatus ? `<div class="expiry-warning">⚠️ ${expiryStatus.text}</div>` : ''}
                <div class="product-footer">
                    ${product.barcode ? `<div class="product-barcode">📷 ${escapeHtml(product.barcode)}</div>` : '<div></div>'}
                    ${locations.length > 0 ? `<div class="product-location">📍 ${escapeHtml(locations[0])}${locations.length > 1 ? ` +${locations.length - 1}` : ''}</div>` : ''}
                </div>
                <div class="product-badges">
                    ${product.supplier_name ? `<span class="badge badge-supplier">${escapeHtml(product.supplier_name)}</span>` : ''}
                    ${inv.batchCount > 0 ? `<span class="badge">${inv.batchCount} batch${inv.batchCount > 1 ? 'es' : ''}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// View product detail
async function viewProductDetail(productId) {
    try {
        selectedProductId = productId;
        
        // Fetch product details
        const response = await authFetch(`${API_URL}/api/products/${productId}`);
        if (!response.ok) throw new Error('Failed to load product');
        currentProductDetail = await response.json();
        
        // Hide list, show detail
        document.getElementById('inventoryListView').style.display = 'none';
        document.getElementById('inventoryDetailView').style.display = 'block';
        
        // Render detail view
        renderProductDetail();
        await loadProductBatches();
        
    } catch (error) {
        console.error('Error loading product detail:', error);
        showNotification('Failed to load product details', 'error');
    }
}

// Render product detail view
function renderProductDetail() {
    const product = currentProductDetail;
    
    // Product name
    document.getElementById('detailProductName').textContent = product.name;
    
    // Product meta badges
    const metaBadges = [];
    if (product.brand) metaBadges.push(`<span class="badge badge-brand">${escapeHtml(product.brand)}</span>`);
    if (product.category_name) metaBadges.push(`<span class="badge badge-category">${escapeHtml(product.category_name)}</span>`);
    if (product.supplier_name) metaBadges.push(`<span class="badge badge-supplier">${escapeHtml(product.supplier_name)}</span>`);
    document.getElementById('detailProductMeta').innerHTML = metaBadges.join('');
    
    // Product info grid
    const costPerItem = product.cost_per_case && product.items_per_case ? (product.cost_per_case / product.items_per_case) : 0;
    const infoHtml = `
        <div class="detail-info-card">
            <div class="detail-info-label">Items Per Case</div>
            <div class="detail-info-value">${product.items_per_case || 'N/A'}</div>
        </div>
        <div class="detail-info-card">
            <div class="detail-info-label">Cost Per Case</div>
            <div class="detail-info-value">${formatCurrency(product.cost_per_case || 0)}</div>
        </div>
        <div class="detail-info-card">
            <div class="detail-info-label">Cost Per Item</div>
            <div class="detail-info-value">${formatCurrency(costPerItem)}</div>
        </div>
        ${product.barcode ? `
        <div class="detail-info-card detail-barcode">
            <div class="detail-info-label">Barcode</div>
            <div class="detail-info-value">📷 ${escapeHtml(product.barcode)}</div>
        </div>` : ''}
        ${product.inhouse_number ? `
        <div class="detail-info-card">
            <div class="detail-info-label">In-House #</div>
            <div class="detail-info-value">${escapeHtml(product.inhouse_number)}</div>
        </div>` : ''}
        ${product.notes ? `
        <div class="detail-info-card detail-notes">
            <div class="detail-info-label">Notes</div>
            <div class="detail-info-value">${escapeHtml(product.notes)}</div>
        </div>` : ''}
    `;
    document.getElementById('detailProductInfo').innerHTML = infoHtml;
}

// Load batches for product detail
async function loadProductBatches() {
    try {
        const response = await authFetch(`${API_URL}/api/batches/product/${selectedProductId}`);
        if (!response.ok) throw new Error('Failed to load batches');
        
        const batches = await response.json();
        renderProductBatches(batches);
        renderExpirationAlertBanners(batches);
        
    } catch (error) {
        console.error('Error loading batches:', error);
        showNotification('Failed to load batches', 'error');
    }
}

// Render expiration alert banners
function renderExpirationAlertBanners(batches) {
    const bannersContainer = document.getElementById('detailAlertBanners');
    const now = new Date();
    
    const expired = batches.filter(b => b.expiry_date && new Date(b.expiry_date) < now);
    const urgent = batches.filter(b => {
        if (!b.expiry_date) return false;
        const expiry = new Date(b.expiry_date);
        const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 7;
    });
    
    let bannersHtml = '';
    
    if (expired.length > 0) {
        const totalExpired = expired.reduce((sum, b) => sum + (b.total_quantity || 0), 0);
        bannersHtml += `
            <div class="detail-alert-expired">
                <div class="detail-alert-banner-content">
                    <span class="detail-alert-icon">❌</span>
                    <div>
                        <div class="detail-alert-title">Expired Items</div>
                        <div class="detail-alert-text">${totalExpired} items in ${expired.length} batch${expired.length > 1 ? 'es' : ''} have expired</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (urgent.length > 0) {
        const totalUrgent = urgent.reduce((sum, b) => sum + (b.total_quantity || 0), 0);
        bannersHtml += `
            <div class="detail-alert-urgent">
                <div class="detail-alert-banner-content">
                    <span class="detail-alert-icon">⚠️</span>
                    <div>
                        <div class="detail-alert-title">Expiring Soon</div>
                        <div class="detail-alert-text">${totalUrgent} items in ${urgent.length} batch${urgent.length > 1 ? 'es' : ''} expiring within 7 days</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bannersContainer.innerHTML = bannersHtml;
}

// Render batches in detail view
function renderProductBatches(batches) {
    const container = document.getElementById('detailBatchList');
    
    if (batches.length === 0) {
        container.innerHTML = '<div class="empty-state-small">No inventory batches yet. Add your first batch!</div>';
        return;
    }
    
    const html = batches.map(batch => {
        const expiryStatus = getExpiryStatus(batch.expiry_date);
        const cardClass = expiryStatus ? `batch-card ${expiryStatus.status}` : 'batch-card';
        
        return `
            <div class="${cardClass}">
                <div class="batch-header">
                    <div>
                        <strong>${batch.total_quantity} items</strong> (${batch.case_quantity} cases)
                    </div>
                    <div>
                        <button class="btn-small btn-primary" data-batch-action="edit" data-batch-id="${batch.id}" data-product-id="${batch.product_id}">✏️ Edit</button>
                        <button class="btn-small btn-danger-inline" data-batch-action="delete" data-batch-id="${batch.id}">🗑️</button>
                    </div>
                </div>
                ${expiryStatus ? `<div class="batch-expiry-warning ${expiryStatus.status}">⚠️ ${expiryStatus.text}</div>` : ''}
                ${batch.expiry_date && !expiryStatus ? `<div class="batch-expiry-date">Expires: ${formatDate(batch.expiry_date)}</div>` : ''}
                ${batch.location ? `<div class="batch-location">📍 ${escapeHtml(batch.location)}</div>` : ''}
                ${batch.notes ? `<div class="batch-notes">${escapeHtml(batch.notes)}</div>` : ''}
                <div class="batch-received">Received: ${formatDate(batch.received_date)}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Back to inventory list
function backToInventoryList() {
    document.getElementById('inventoryDetailView').style.display = 'none';
    document.getElementById('inventoryListView').style.display = 'block';
    selectedProductId = null;
    currentProductDetail = null;
    loadProducts();
}

// Edit product from detail view
function editProductFromDetail() {
    if (!currentProductDetail) return;
    editProduct(currentProductDetail.id);
}

// Delete product from detail view
async function deleteProductFromDetail() {
    if (!currentProductDetail) return;
    
    if (!confirm(`Delete "${currentProductDetail.name}" and all its inventory batches?\n\nThis cannot be undone!`)) return;
    
    try {
        const response = await authFetch(`${API_URL}/api/products/${currentProductDetail.id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete product');
        
        showNotification('Product deleted successfully', 'success');
        backToInventoryList();
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Failed to delete product', 'error');
    }
}

// Edit product
function editProduct(productId) {
    const product = products.find(p => p.id === productId) || currentProductDetail;
    if (!product) return;
    
    editingProductId = productId;
    
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('prodName').value = product.name || '';
    document.getElementById('prodInhouse').value = product.inhouse_number || '';
    document.getElementById('prodBarcode').value = product.barcode || '';
    document.getElementById('prodBrand').value = product.brand || '';
    
    // FIXED: Set supplier_id and category_id, not supplier/category names
    document.getElementById('prodSupplier').value = product.supplier_id || '';
    document.getElementById('prodCategory').value = product.category_id || '';
    
    document.getElementById('prodPerCase').value = product.items_per_case || '';
    document.getElementById('prodCostPerCase').value = product.cost_per_case || '';
    document.getElementById('prodNotes').value = product.notes || '';
    
    calcCostPerItem();
    document.getElementById('productModal').classList.add('active');
}

// Product form submission - FIXED: Send IDs not names
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // FIXED: Get supplier_id and category_id from select dropdowns (which have ID as value)
    const supplierValue = document.getElementById('prodSupplier').value;
    const categoryValue = document.getElementById('prodCategory').value;
    
    const productData = {
        name: document.getElementById('prodName').value,
        inhouse_number: document.getElementById('prodInhouse').value,
        barcode: document.getElementById('prodBarcode').value,
        brand: document.getElementById('prodBrand').value,
        supplier_id: supplierValue ? parseInt(supplierValue) : null,
        items_per_case: parseInt(document.getElementById('prodPerCase').value),
        cost_per_case: parseFloat(document.getElementById('prodCostPerCase').value) || 0,
        category_id: categoryValue ? parseInt(categoryValue) : null,
        notes: document.getElementById('prodNotes').value
    };
    
    try {
        const url = editingProductId ? `${API_URL}/api/products/${editingProductId}` : `${API_URL}/api/products`;
        const method = editingProductId ? 'PUT' : 'POST';
        
        const response = await authFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save product');
        }
        
        showNotification(`Product ${editingProductId ? 'updated' : 'added'} successfully`, 'success');
        closeProductModal();
        
        if (selectedProductId) {
            // Refresh detail view
            await viewProductDetail(selectedProductId);
        } else {
            // Refresh list view
            await loadProducts();
        }
        
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification(error.message, 'error');
    }
});

// Product modal functions
function openAddProductModal() {
    editingProductId = null;
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('productForm').reset();
    document.getElementById('costPerItemDisplay').textContent = 'Cost per item: $0.00';
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    document.getElementById('productForm').reset();
    editingProductId = null;
}

function calcCostPerItem() {
    const perCase = parseFloat(document.getElementById('prodCostPerCase').value) || 0;
    const itemsPerCase = parseInt(document.getElementById('prodPerCase').value) || 1;
    const costPerItem = perCase / itemsPerCase;
    document.getElementById('costPerItemDisplay').textContent = `Cost per item: ${formatCurrency(costPerItem)}`;
}

// Batch modal functions
function openAddBatchModal() {
    if (!selectedProductId) {
        showNotification('Please select a product first', 'error');
        return;
    }
    
    editingBatchId = null;
    editingBatchProductId = selectedProductId;
    
    document.getElementById('batchModalTitle').textContent = 'Add Inventory Batch';
    document.getElementById('batchForm').reset();
    document.getElementById('batchTotal').value = '';
    document.getElementById('batchCalc').textContent = 'Auto-calculated';
    document.getElementById('batchModal').classList.add('active');
}

function closeBatchModal() {
    document.getElementById('batchModal').classList.remove('active');
    document.getElementById('batchForm').reset();
    editingBatchId = null;
    editingBatchProductId = null;
}

function calcBatchTotal() {
    const cases = parseInt(document.getElementById('batchCases').value) || 0;
    const itemsPerCase = currentProductDetail ? currentProductDetail.items_per_case : 1;
    const total = cases * (itemsPerCase || 1);
    document.getElementById('batchTotal').value = total;
    document.getElementById('batchCalc').textContent = `${cases} cases × ${itemsPerCase} items`;
}

// Edit batch
async function editBatch(batchId, productId) {
    try {
        const response = await authFetch(`${API_URL}/api/inventory/batches/${batchId}`);
        if (!response.ok) throw new Error('Failed to load batch');
        
        const batch = await response.json();
        
        editingBatchId = batchId;
        editingBatchProductId = productId;
        
        document.getElementById('batchModalTitle').textContent = 'Edit Batch';
        document.getElementById('batchCases').value = batch.case_quantity;
        document.getElementById('batchTotal').value = batch.total_quantity;
        document.getElementById('batchExpiry').value = batch.expiry_date || '';
        document.getElementById('batchLocation').value = batch.location || '';
        document.getElementById('batchNotes').value = batch.notes || '';
        
        calcBatchTotal();
        document.getElementById('batchModal').classList.add('active');
        
    } catch (error) {
        console.error('Error loading batch:', error);
        showNotification('Failed to load batch details', 'error');
    }
}

// Delete batch
async function deleteBatch(batchId) {
    if (!confirm('Delete this batch?')) return;
    
    try {
        const response = await authFetch(`${API_URL}/api/inventory/batches/${batchId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete batch');
        
        showNotification('Batch deleted successfully', 'success');
        await loadProductBatches();
        
    } catch (error) {
        console.error('Error deleting batch:', error);
        showNotification('Failed to delete batch', 'error');
    }
}

// Batch form submission
document.getElementById('batchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const batchData = {
        product_id: editingBatchProductId,
        case_quantity: parseInt(document.getElementById('batchCases').value),
        total_quantity: parseInt(document.getElementById('batchTotal').value),
        expiry_date: document.getElementById('batchExpiry').value,
        location: document.getElementById('batchLocation').value,
        notes: document.getElementById('batchNotes').value
    };
    
    try {
        const url = editingBatchId ? `${API_URL}/api/inventory/batches/${editingBatchId}` : `${API_URL}/api/inventory/batches`;
        const method = editingBatchId ? 'PUT' : 'POST';
        
        const response = await authFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batchData)
        });
        
        if (!response.ok) throw new Error('Failed to save batch');
        
        showNotification(`Batch ${editingBatchId ? 'updated' : 'added'} successfully`, 'success');
        closeBatchModal();
        await loadProductBatches();
        
    } catch (error) {
        console.error('Error saving batch:', error);
        showNotification('Failed to save batch', 'error');
    }
});

// Utility functions
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value || 0);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
