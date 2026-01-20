/* ==========================================================================
   Product Management
   Product CRUD operations and display
   ========================================================================== */

/* ==========================================================================
   Load and Display Products
   ========================================================================== */

async function loadProducts() {
    try {
        const search = document.getElementById('productSearch').value;
        const url = `${API_URL}/api/inventory/summary${search ? '?search=' + encodeURIComponent(search) : ''}`;
        const response = await fetch(url);
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProducts(products) {
    const container = document.getElementById('productList');
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No products found</h3><p>Try adjusting your search or add a new product</p></div>';
        return;
    }
    container.innerHTML = products.map(p => `
        <div class="product-card" onclick="viewProduct(${p.id})">
            <div class="product-header">
                <div class="product-name">${escapeHtml(p.name)}</div>
                <div class="product-stock">${p.total_quantity} items</div>
            </div>
            <div class="product-meta">
                ${p.supplier ? `<span class="badge badge-supplier">🚚 ${escapeHtml(p.supplier)}</span>` : ''}
                ${p.brand ? `<span class="badge badge-brand">🏭 ${escapeHtml(p.brand)}</span>` : ''}
                ${p.category ? `<span class="badge badge-category">📚 ${escapeHtml(p.category)}</span>` : ''}
                ${p.barcode ? `<span class="badge badge-barcode">🏷️ ${escapeHtml(p.barcode)}</span>` : ''}
            </div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #6b7280;">
                ${p.batch_count} batch${p.batch_count !== 1 ? 'es' : ''} | ${p.items_per_case} items/case
                ${p.earliest_expiry ? ` | Earliest expiry: ${new Date(p.earliest_expiry).toLocaleDateString()}` : ''}
            </div>
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button onclick="event.stopPropagation(); editProduct(${p.id})" style="flex: 1; padding: 8px;">Edit</button>
                <button onclick="event.stopPropagation(); deleteProduct(${p.id})" style="flex: 1; padding: 8px; background: #ef4444;">Delete</button>
            </div>
        </div>
    `).join('');
}

function viewProduct(id) {
    selectedProductId = id;
    switchTab('inventory');
    setTimeout(() => {
        document.getElementById('inventoryProductSelect').value = id;
        loadBatches();
    }, 100);
}

/* ==========================================================================
   Product Modal Management
   ========================================================================== */

function openAddProductModal() {
    editingProductId = null;
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('productForm').reset();
    document.getElementById('productModal').classList.add('active');
    loadSuppliers();
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

async function editProduct(id) {
    try {
        const response = await fetch(`${API_URL}/api/products/${id}`);
        const product = await response.json();
        editingProductId = id;
        document.getElementById('productModalTitle').textContent = 'Edit Product';
        document.getElementById('prodName').value = product.name;
        document.getElementById('prodBrand').value = product.brand || '';
        document.getElementById('prodSupplier').value = product.supplier || '';
        document.getElementById('prodCategory').value = product.category || '';
        document.getElementById('prodBarcode').value = product.barcode || '';
        document.getElementById('prodInhouse').value = product.inhouse_number || '';
        document.getElementById('prodPerCase').value = product.items_per_case || 1;
        document.getElementById('prodNotes').value = product.notes || '';
        document.getElementById('productModal').classList.add('active');
        loadSuppliers();
    } catch (error) {
        alert('Error loading product');
    }
}

async function deleteProduct(id) {
    if (!confirm('Delete this product and all its inventory batches?')) return;
    try {
        await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' });
        loadProducts();
    } catch (error) {
        alert('Failed to delete product');
    }
}

/* ==========================================================================
   Product Form Submission
   ========================================================================== */

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('prodName').value,
        brand: document.getElementById('prodBrand').value,
        supplier: document.getElementById('prodSupplier').value,
        category: document.getElementById('prodCategory').value,
        barcode: document.getElementById('prodBarcode').value,
        inhouse_number: document.getElementById('prodInhouse').value,
        items_per_case: parseInt(document.getElementById('prodPerCase').value),
        notes: document.getElementById('prodNotes').value
    };
    try {
        const url = editingProductId ? `${API_URL}/api/products/${editingProductId}` : `${API_URL}/api/products`;
        const method = editingProductId ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            closeProductModal();
            loadProducts();
            loadProductsForInventory();
        } else {
            const error = await response.json();
            alert(error.error);
        }
    } catch (error) {
        alert('Failed to save product');
    }
});

/* ==========================================================================
   Supplier Autocomplete
   ========================================================================== */

async function loadSuppliers() {
    try {
        const response = await fetch(`${API_URL}/api/suppliers`);
        const suppliers = await response.json();
        const datalist = document.getElementById('supplierList');
        datalist.innerHTML = suppliers.map(s => `<option value="${escapeHtml(s)}">`).join('');
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}