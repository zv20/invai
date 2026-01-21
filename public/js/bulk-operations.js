// Bulk Operations for Inventory Management
let bulkSelectionMode = false;
let selectedBatches = new Set();

function toggleBulkMode() {
  bulkSelectionMode = !bulkSelectionMode;
  selectedBatches.clear();
  const bulkBtn = document.getElementById('bulk-mode-btn');
  const bulkBar = document.getElementById('bulk-actions-bar');
  if (bulkBtn) {
    bulkBtn.textContent = bulkSelectionMode ? 'Cancel Bulk Select' : 'Bulk Select';
    bulkBtn.classList.toggle('active', bulkSelectionMode);
  }
  if (bulkBar) bulkBar.style.display = bulkSelectionMode ? 'flex' : 'none';
  if (typeof loadProductDetails === 'function' && selectedProductId) loadProductDetails(selectedProductId);
  updateBulkActionsBar();
}

function toggleBatchSelection(batchId, checked) {
  if (checked) selectedBatches.add(batchId); else selectedBatches.delete(batchId);
  const batchCard = document.querySelector(`[data-batch-id="${batchId}"]`);
  if (batchCard) batchCard.classList.toggle('selected', checked);
  updateBulkActionsBar();
}

function updateBulkActionsBar() {
  const countDisplay = document.getElementById('selected-count');
  const actionsButtons = document.getElementById('bulk-actions-buttons');
  if (countDisplay) countDisplay.textContent = selectedBatches.size;
  if (actionsButtons) actionsButtons.style.display = selectedBatches.size > 0 ? 'flex' : 'none';
}

async function bulkDeleteBatches() {
  if (selectedBatches.size === 0) { showToast('No batches selected', 'warning'); return; }
  if (!confirm(`Delete ${selectedBatches.size} selected batch(es)?`)) return;
  try {
    const response = await fetch(`${API_URL}/inventory/bulk/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchIds: Array.from(selectedBatches) })
    });
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    showToast(`Deleted ${data.count} batch(es)`, 'success');
    selectedBatches.clear();
    updateBulkActionsBar();
    if (typeof loadProductDetails === 'function' && selectedProductId) loadProductDetails(selectedProductId);
  } catch (error) { showToast('Failed to delete batches', 'error'); }
}

async function bulkUpdateLocation() {
  if (selectedBatches.size === 0) { showToast('No batches selected', 'warning'); return; }
  const location = prompt(`Enter new location for ${selectedBatches.size} batch(es):`);
  if (!location) return;
  try {
    const response = await fetch(`${API_URL}/inventory/bulk/update-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchIds: Array.from(selectedBatches), location: location.trim() })
    });
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    showToast(`Updated ${data.count} batch(es)`, 'success');
    selectedBatches.clear();
    if (typeof loadProductDetails === 'function' && selectedProductId) loadProductDetails(selectedProductId);
  } catch (error) { showToast('Failed to update locations', 'error'); }
}

window.toggleBulkMode = toggleBulkMode;
window.toggleBatchSelection = toggleBatchSelection;
window.bulkDeleteBatches = bulkDeleteBatches;
window.bulkUpdateLocation = bulkUpdateLocation;
window.isBulkModeActive = () => bulkSelectionMode;
