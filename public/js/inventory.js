/* ==========================================================================
   Unified Inventory Module - List + Detail Views
   ========================================================================== */

// Module variables (global vars are in core.js)
let products = [];
let currentProductDetail = null;

// Load products for inventory list view
async function loadProducts() {
    try {
        const search = document.getElementById('productSearch').value;
        const url = search ? `${API_URL}/api/products?search=${encodeURIComponent(search)}` : `${API_URL}/api/products`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load products');
        
        products = await response.json();
        await renderProductList();
        await loadInventoryValue();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Failed to load products', 'error');
    }
}

// Load inventory value summary
async function loadInventoryValue() {
    try {
        const response = await fetch(`${API_URL}/api/inventory/value`);
        if (!response.ok) throw new Error('Failed to load inventory value');
        
        const data = await response.json();
        
        document.getElementById('totalProducts').textContent = data.total_products || 0;
        document.getElementById('totalItems').textContent = data.total_items || 0;
        document.getElementById('totalValue').textContent = formatCurrency(data.total_value || 0);
        
        document.getElementById('inventoryValueSummary').style.display = 'grid';
    } catch (error) {
        console.error('Error loading inventory value:', error);
    }
}

// Render product list with stock counts
async function renderProductList() {
    const container = document.getElementById('productList');
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No products found</h3><p>Try adjusting your search or add a new product</p></div>';
        return;
    }
    
    // Get inventory summary for all products
    const response = await fetch(`${API_URL}/api/inventory/summary`);
    const inventory = await response.json();
    
    const inventoryMap = {};
    inventory.forEach(item => {
        inventoryMap[item.id] = {
            quantity: item.total_quantity || 0,
            batchCount: item.batch_count || 0,
            earliestExpiry: item.earliest_expiry
        };
    });
    
    const html = products.map(product => {
        const inv = inventoryMap[product.id] || { quantity: 0, batchCount: 0 };
        const stockClass = inv.quantity === 0 ? 'stock-out' : inv.quantity < 10 ? 'stock-low' : 'stock-good';
        const expiryStatus = getExpiryStatus(inv.earliestExpiry);
        
        return `
            <div class="product-card" onclick="viewProductDetail(${product.id})">
                <div class="product-header">
                    <div>
                        <div class="product-name">${escapeHtml(product.name)}</div>
                        ${product.brand ? `<span class="badge badge-brand">${escapeHtml(product.brand)}</span>` : ''}
                        ${product.category ? `<span class="badge badge-category">${escapeHtml(product.category)}</span>` : ''}
                    </div>
                    <div class="product-stock ${stockClass}">${inv.quantity} items</div>
                </div>
                ${expiryStatus ? `<div class="expiry-warning" style="margin-top: 10px; padding: 8px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 5px; font-size: 0.9em;">⚠️ ${expiryStatus.text}</div>` : ''}
                <div class="product-meta" style="margin-top: 10px;">
                    ${product.supplier ? `<span class="badge badge-supplier">${escapeHtml(product.supplier)}</span>` : ''}
                    ${inv.batchCount > 0 ? `<span class="badge" style="background: #e0e7ff; color: #3730a3;">${inv.batchCount} batches</span>` : ''}
                    ${product.barcode ? `<span class="badge badge-barcode">📷 ${escapeHtml(product.barcode)}</span>` : ''}
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
        const response = await fetch(`${API_URL}/api/products/${productId}`);
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
    if (product.category) metaBadges.push(`<span class="badge badge-category">${escapeHtml(product.category)}</span>`);
    if (product.supplier) metaBadges.push(`<span class="badge badge-supplier">${escapeHtml(product.supplier)}</span>`);
    document.getElementById('detailProductMeta').innerHTML = metaBadges.join('');
    
    // Product info grid
    const costPerItem = product.cost_per_case && product.items_per_case ? (product.cost_per_case / product.items_per_case) : 0;
    const infoHtml = `
        <div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #e5e7eb;">
            <div style="font-size: 0.85em; color: #6b7280; margin-bottom: 5px;">Items Per Case</div>
            <div style="font-size: 1.3em; font-weight: 700; color: #1f2937;">${product.items_per_case || 'N/A'}</div>
        </div>
        <div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #e5e7eb;">
            <div style="font-size: 0.85em; color: #6b7280; margin-bottom: 5px;">Cost Per Case</div>
            <div style="font-size: 1.3em; font-weight: 700; color: #1f2937;">${formatCurrency(product.cost_per_case || 0)}</div>
        </div>
        <div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #e5e7eb;">
            <div style="font-size: 0.85em; color: #6b7280; margin-bottom: 5px;">Cost Per Item</div>
            <div style="font-size: 1.3em; font-weight: 700; color: #1f2937;">${formatCurrency(costPerItem)}</div>
        </div>
        ${product.barcode ? `
        <div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #e5e7eb;">
            <div style="font-size: 0.85em; color: #6b7280; margin-bottom: 5px;">Barcode</div>
            <div style="font-size: 1.1em; font-weight: 600; color: #1f2937;">📷 ${escapeHtml(product.barcode)}</div>
        </div>` : ''}
        ${product.inhouse_number ? `
        <div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #e5e7eb;">
            <div style="font-size: 0.85em; color: #6b7280; margin-bottom: 5px;">In-House #</div>
            <div style="font-size: 1.1em; font-weight: 600; color: #1f2937;">${escapeHtml(product.inhouse_number)}</div>
        </div>` : ''}
        ${product.notes ? `
        <div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #e5e7eb; grid-column: 1 / -1;">
            <div style="font-size: 0.85em; color: #6b7280; margin-bottom: 5px;">Notes</div>
            <div style="font-size: 0.95em; color: #374151;">${escapeHtml(product.notes)}</div>
        </div>` : ''}
    `;
    document.getElementById('detailProductInfo').innerHTML = infoHtml;
}

// Load batches for product detail
async function loadProductBatches() {
    try {
        const response = await fetch(`${API_URL}/api/products/${selectedProductId}/batches`);
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
            <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5em;">❌</span>
                    <div>
                        <div style="font-weight: 700; color: #dc2626; font-size: 1.1em;">Expired Items</div>
                        <div style="color: #7f1d1d; margin-top: 3px;">${totalExpired} items in ${expired.length} batch${expired.length > 1 ? 'es' : ''} have expired</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (urgent.length > 0) {
        const totalUrgent = urgent.reduce((sum, b) => sum + (b.total_quantity || 0), 0);
        bannersHtml += `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5em;">⚠️</span>
                    <div>
                        <div style="font-weight: 700; color: #d97706; font-size: 1.1em;">Expiring Soon</div>
                        <div style="color: #92400e; margin-top: 3px;">${totalUrgent} items in ${urgent.length} batch${urgent.length > 1 ? 'es' : ''} expiring within 7 days</div>
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
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-small btn-primary" onclick="editBatch(${batch.id}, ${batch.product_id})">✏️ Edit</button>
                        <button class="btn-small" style="background: #ef4444; color: white;" onclick="deleteBatch(${batch.id})">🗑️</button>
                    </div>
                </div>
                ${expiryStatus ? `<div style="margin-top: 8px; font-weight: 600; color: ${expiryStatus.status === 'expired' ? '#dc2626' : '#d97706'};">⚠️ ${expiryStatus.text}</div>` : ''}
                ${batch.expiry_date && !expiryStatus ? `<div style="margin-top: 8px; color: #6b7280;">Expires: ${formatDate(batch.expiry_date)}</div>` : ''}
                ${batch.location ? `<div style="margin-top: 8px; color: #6b7280;">📍 ${escapeHtml(batch.location)}</div>` : ''}
                ${batch.notes ? `<div style="margin-top: 8px; color: #6b7280; font-style: italic;">${escapeHtml(batch.notes)}</div>` : ''}
                <div style="margin-top: 8px; font-size: 0.85em; color: #9ca3af;">Received: ${formatDate(batch.received_date)}</div>
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
        const response = await fetch(`${API_URL}/api/products/${currentProductDetail.id}`, {
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
    document.getElementById('prodSupplier').value = product.supplier || '';
    document.getElementById('prodPerCase').value = product.items_per_case || '';
    document.getElementById('prodCostPerCase').value = product.cost_per_case || '';
    document.getElementById('prodCategory').value = product.category || '';
    document.getElementById('prodNotes').value = product.notes || '';
    
    calcCostPerItem();
    document.getElementById('productModal').classList.add('active');
}

// Product form submission
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productData = {
        name: document.getElementById('prodName').value,
        inhouse_number: document.getElementById('prodInhouse').value,
        barcode: document.getElementById('prodBarcode').value,
        brand: document.getElementById('prodBrand').value,
        supplier: document.getElementById('prodSupplier').value,
        items_per_case: parseInt(document.getElementById('prodPerCase').value),
        cost_per_case: parseFloat(document.getElementById('prodCostPerCase').value) || 0,
        category: document.getElementById('prodCategory').value,
        notes: document.getElementById('prodNotes').value
    };
    
    try {
        const url = editingProductId ? `${API_URL}/api/products/${editingProductId}` : `${API_URL}/api/products`;
        const method = editingProductId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
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
        const response = await fetch(`${API_URL}/api/inventory/batches/${batchId}`);
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
        const response = await fetch(`${API_URL}/api/inventory/batches/${batchId}`, {
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
        
        const response = await fetch(url, {
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