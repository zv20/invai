/* ==========================================================================
   Inventory & Batch Management
   Batch CRUD operations and display
   ========================================================================== */

/* ==========================================================================
   Load Products for Inventory Tab
   ========================================================================== */

async function loadProductsForInventory() {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        const products = await response.json();
        const select = document.getElementById('inventoryProductSelect');
        select.innerHTML = '<option value="">-- Choose a product --</option>';
        products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.name} (${p.items_per_case} items/case)`;
            select.appendChild(opt);
        });
        if (selectedProductId) {
            select.value = selectedProductId;
            loadBatches();
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

/* ==========================================================================
   Load and Display Batches
   ========================================================================== */

async function loadBatches() {
    const productId = document.getElementById('inventoryProductSelect').value;
    if (!productId) {
        document.getElementById('batchSection').style.display = 'none';
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/products/${productId}/batches`);
        const batches = await response.json();
        document.getElementById('batchSection').style.display = 'block';
        displayBatches(batches);
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

function displayBatches(batches) {
    const container = document.getElementById('batchList');
    if (batches.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No batches yet. Add your first delivery!</p></div>';
        return;
    }
    container.innerHTML = batches.map(b => {
        const expiryStatus = getExpiryStatus(b.expiry_date);
        const cardClass = expiryStatus ? `batch-card ${expiryStatus.status}` : 'batch-card';
        return `
            <div class="${cardClass}">
                <div class="batch-header">
                    <div>
                        <strong>${b.total_quantity} items</strong> (${b.case_quantity} cases)
                        ${expiryStatus ? ` • <span style="color: ${expiryStatus.status === 'expired' ? '#dc2626' : '#d97706'};">${expiryStatus.text}</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="editBatch(${b.id}, ${b.product_id})" style="padding: 5px 10px; font-size: 0.85em;">Edit</button>
                        <button onclick="deleteBatch(${b.id})" style="padding: 5px 10px; font-size: 0.85em; background: #ef4444;">Delete</button>
                    </div>
                </div>
                <div style="font-size: 0.9em; color: #6b7280;">
                    ${b.location ? `📍 ${escapeHtml(b.location)} • ` : ''}
                    Received: ${new Date(b.received_date).toLocaleDateString()}
                    ${b.notes ? `<br>📝 ${escapeHtml(b.notes)}` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/* ==========================================================================
   Batch Modal Management
   ========================================================================== */

function openAddBatchModal() {
    editingBatchId = null;
    editingBatchProductId = null;
    document.getElementById('batchModalTitle').textContent = 'Add Inventory Batch';
    document.getElementById('batchForm').reset();
    document.getElementById('batchModal').classList.add('active');
}

function closeBatchModal() {
    document.getElementById('batchModal').classList.remove('active');
    editingBatchId = null;
    editingBatchProductId = null;
}

async function editBatch(id, productId) {
    try {
        const response = await fetch(`${API_URL}/api/inventory/batches/${id}`);
        if (!response.ok) {
            throw new Error('Failed to load batch');
        }
        const batch = await response.json();
        
        editingBatchId = id;
        editingBatchProductId = productId;
        
        document.getElementById('batchModalTitle').textContent = 'Edit Inventory Batch';
        document.getElementById('batchCases').value = batch.case_quantity;
        document.getElementById('batchTotal').value = batch.total_quantity;
        
        // Format date for input field (YYYY-MM-DD)
        if (batch.expiry_date) {
            const expiryDate = new Date(batch.expiry_date);
            const formattedDate = expiryDate.toISOString().split('T')[0];
            document.getElementById('batchExpiry').value = formattedDate;
        } else {
            document.getElementById('batchExpiry').value = '';
        }
        
        document.getElementById('batchLocation').value = batch.location || '';
        document.getElementById('batchNotes').value = batch.notes || '';
        
        // Update the calculation help text
        const currentProduct = await fetch(`${API_URL}/api/products/${productId}`);
        const product = await currentProduct.json();
        document.getElementById('batchCalc').textContent = `${batch.case_quantity} cases × ${product.items_per_case} = ${batch.total_quantity} items`;
        document.getElementById('batchCalc').style.color = '#059669';
        
        document.getElementById('batchModal').classList.add('active');
    } catch (error) {
        console.error('Error loading batch:', error);
        alert('Error loading batch data. Please try again.');
    }
}

async function deleteBatch(id) {
    if (!confirm('Delete this batch?')) return;
    try {
        await fetch(`${API_URL}/api/inventory/batches/${id}`, { method: 'DELETE' });
        loadBatches();
        loadProducts();
    } catch (error) {
        alert('Failed to delete batch');
    }
}

/* ==========================================================================
   Batch Calculations
   ========================================================================== */

async function calcBatchTotal() {
    const productId = editingBatchProductId || document.getElementById('inventoryProductSelect').value;
    const cases = parseInt(document.getElementById('batchCases').value) || 0;
    if (!productId || !cases) {
        document.getElementById('batchTotal').value = '';
        document.getElementById('batchCalc').textContent = 'Auto-calculated';
        document.getElementById('batchCalc').style.color = '#9ca3af';
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/products/${productId}`);
        const product = await response.json();
        const total = cases * (product.items_per_case || 1);
        document.getElementById('batchTotal').value = total;
        document.getElementById('batchCalc').textContent = `${cases} cases × ${product.items_per_case} = ${total} items`;
        document.getElementById('batchCalc').style.color = '#059669';
    } catch (error) {
        console.error('Error calculating total:', error);
    }
}

/* ==========================================================================
   Batch Form Submission
   ========================================================================== */

document.getElementById('batchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const productId = editingBatchProductId || document.getElementById('inventoryProductSelect').value;
    const data = {
        product_id: parseInt(productId),
        case_quantity: parseInt(document.getElementById('batchCases').value),
        total_quantity: parseInt(document.getElementById('batchTotal').value),
        expiry_date: document.getElementById('batchExpiry').value || null,
        location: document.getElementById('batchLocation').value,
        notes: document.getElementById('batchNotes').value
    };
    try {
        const url = editingBatchId ? `${API_URL}/api/inventory/batches/${editingBatchId}` : `${API_URL}/api/inventory/batches`;
        const method = editingBatchId ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            closeBatchModal();
            loadBatches();
            loadProducts();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to save batch');
        }
    } catch (error) {
        console.error('Error saving batch:', error);
        alert('Failed to save batch');
    }
});