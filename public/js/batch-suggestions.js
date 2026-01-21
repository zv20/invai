// FIFO/FEFO Batch Suggestion System

// Load and display batch suggestion for current product
async function loadBatchSuggestion(productId) {
  const container = document.getElementById('batch-suggestion-container');
  if (!container) return;
  
  try {
    const response = await fetch(`${API_URL}/api/products/${productId}/batch-suggestion`);
    const data = await response.json();
    
    if (!data.suggestion) {
      container.innerHTML = '<div class="no-suggestion">✓ No batches available</div>';
      return;
    }
    
    const urgencyClass = data.urgency;
    const suggestion = data.suggestion;
    
    const urgencyIcon = {
      expired: '❌',
      urgent: '⚠️',
      soon: '⏰',
      normal: '💡'
    }[urgencyClass] || '💡';
    
    container.innerHTML = `
      <div class="batch-suggestion ${urgencyClass}">
        <div class="suggestion-header">
          <span class="suggestion-icon">${urgencyIcon}</span>
          <strong>Recommended Batch to Use</strong>
        </div>
        <div class="suggestion-details">
          <div class="suggestion-batch">
            ${suggestion.location ? 
              `<span class="badge">${escapeHtml(suggestion.location)}</span>` : 
              '<span class="badge">Unknown Location</span>'}
            <span>${suggestion.total_quantity} items</span>
            ${suggestion.expiry_date ? 
              `<span class="expiry-badge ${urgencyClass}">${formatDate(suggestion.expiry_date)}</span>` : 
              '<span class="no-expiry">No expiry</span>'}
          </div>
          <div class="suggestion-reason">${data.reason}</div>
        </div>
        <button class="btn-use-batch" onclick="showQuickUseModal(${suggestion.id}, ${suggestion.total_quantity})">
          Use from this batch
        </button>
      </div>
    `;
  } catch (error) {
    console.error('Error loading batch suggestion:', error);
    container.innerHTML = '<div class="no-suggestion">Could not load suggestion</div>';
  }
}

// Show quick use modal
function showQuickUseModal(batchId, currentQuantity) {
  const quantity = prompt(`How many items to use from this batch?\n\nCurrent quantity: ${currentQuantity}`);
  
  if (quantity === null) return; // Cancelled
  
  const qtyNum = parseInt(quantity);
  if (isNaN(qtyNum) || qtyNum <= 0) {
    showToast('Please enter a valid quantity', 'error');
    return;
  }
  
  if (qtyNum > currentQuantity) {
    showToast('Cannot use more than available quantity', 'error');
    return;
  }
  
  // Use negative adjustment to reduce quantity
  quickAdjustBatch(batchId, -qtyNum);
}

// Initialize batch suggestion when product details load
if (typeof loadProductBatches !== 'undefined') {
  const originalLoadProductBatches = loadProductBatches;
  loadProductBatches = async function() {
    await originalLoadProductBatches();
    if (selectedProductId) {
      await loadBatchSuggestion(selectedProductId);
    }
  };
}
