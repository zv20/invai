// Quick Actions for Batch Inventory

// Quick adjust batch quantity
async function quickAdjustBatch(batchId, adjustment) {
  try {
    const response = await fetch(`${API_URL}/api/inventory/batches/${batchId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        adjustment, 
        reason: 'Quick adjustment' 
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to adjust quantity');
    }
    
    const data = await response.json();
    showToast(`Quantity ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`, 'success');
    
    // Reload batches and suggestion
    if (selectedProductId) {
      await loadProductBatches();
    }
  } catch (error) {
    showToast(error.message, 'error');
    console.error('Quick adjust error:', error);
  }
}

// Mark batch as empty
async function markBatchEmpty(batchId) {
  if (!confirm('Mark this batch as empty? This will set quantity to 0.')) return;
  
  try {
    const response = await fetch(`${API_URL}/api/inventory/batches/${batchId}/mark-empty`, {
      method: 'POST'
    });
    
    if (!response.ok) throw new Error('Failed to mark empty');
    
    showToast('Batch marked as empty', 'success');
    
    if (selectedProductId) {
      await loadProductBatches();
    }
  } catch (error) {
    showToast('Failed to mark batch as empty', 'error');
    console.error(error);
  }
}

// Render batch with quick action buttons
function renderBatchWithQuickActions(batch) {
  const expiryStatus = getExpiryStatus(batch.expiry_date);
  const cardClass = expiryStatus ? `batch-card ${expiryStatus.status}` : 'batch-card';
  
  return `
    <div class="${cardClass}">
      <div class="batch-header">
        <div>
          <strong>${batch.total_quantity} items</strong> (${batch.case_quantity} cases)
        </div>
      </div>
      
      ${expiryStatus ? `<div style="margin-top: 8px; font-weight: 600; color: ${expiryStatus.status === 'expired' ? '#dc2626' : '#d97706'};">⚠️ ${expiryStatus.text}</div>` : ''}
      ${batch.expiry_date && !expiryStatus ? `<div style="margin-top: 8px; color: #6b7280;">Expires: ${formatDate(batch.expiry_date)}</div>` : ''}
      ${batch.location ? `<div style="margin-top: 8px; color: #6b7280;">📍 ${escapeHtml(batch.location)}</div>` : ''}
      ${batch.notes ? `<div style="margin-top: 8px; color: #6b7280; font-style: italic;">${escapeHtml(batch.notes)}</div>` : ''}
      
      <!-- Quick Actions -->
      <div class="quick-actions">
        <button class="btn-quick btn-minus" onclick="quickAdjustBatch(${batch.id}, -1)" title="Remove 1">-1</button>
        <button class="btn-quick btn-minus" onclick="quickAdjustBatch(${batch.id}, -5)" title="Remove 5">-5</button>
        <button class="btn-quick btn-plus" onclick="quickAdjustBatch(${batch.id}, 1)" title="Add 1">+1</button>
        <button class="btn-quick btn-plus" onclick="quickAdjustBatch(${batch.id}, 5)" title="Add 5">+5</button>
        <button class="btn-quick btn-empty" onclick="markBatchEmpty(${batch.id})" title="Mark as empty">Empty</button>
      </div>
      
      <!-- Standard Actions -->
      <div class="batch-actions" style="margin-top: 10px;">
        <button class="btn-small btn-primary" onclick="editBatch(${batch.id}, ${batch.product_id})">✏️ Edit</button>
        <button class="btn-small" style="background: #ef4444; color: white;" onclick="deleteBatch(${batch.id})">🗑️ Delete</button>
      </div>
      
      <div style="margin-top: 8px; font-size: 0.85em; color: #9ca3af;">Received: ${formatDate(batch.received_date)}</div>
    </div>
  `;
}
