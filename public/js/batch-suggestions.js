// FIFO/FEFO Batch Suggestion System

// Simple debounce + cache to avoid bursty calls that trigger 429s
const __batchSuggestionState = {
  debounceTimer: null,
  inFlightByProduct: new Map(),
  cacheByProduct: new Map(), // productId -> { ts, data }
  cacheTtlMs: 10_000
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBatchSuggestionWithRetry(productId) {
  // De-dupe concurrent requests per product
  if (__batchSuggestionState.inFlightByProduct.has(productId)) {
    return __batchSuggestionState.inFlightByProduct.get(productId);
  }

  const doFetch = (async () => {
    const url = `${API_URL}/api/products/${productId}/batch-suggestion`;

    // First attempt
    let response = await authFetch(url);

    // Retry once on 429 using Retry-After header if present
    if (response && response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
      await sleep(Math.min(Math.max(retryAfter, 1), 10) * 1000);
      response = await authFetch(url);
    }

    return response;
  })();

  __batchSuggestionState.inFlightByProduct.set(productId, doFetch);

  try {
    return await doFetch;
  } finally {
    __batchSuggestionState.inFlightByProduct.delete(productId);
  }
}

function renderNoSuggestion(container, message = '✓ No batches available') {
  container.innerHTML = `<div class="no-suggestion">${message}</div>`;
}

function bindUseBatchButton(container) {
  const btn = container.querySelector('.btn-use-batch');
  if (!btn) return;

  // CSP-safe: bind in JS, no inline onclick
  btn.addEventListener('click', () => {
    const batchId = parseInt(btn.dataset.batchId || '0', 10);
    const qty = parseInt(btn.dataset.currentQuantity || '0', 10);
    if (!batchId) return;
    showQuickUseModal(batchId, qty);
  });
}

// Load and display batch suggestion for current product
async function loadBatchSuggestion(productId) {
  const container = document.getElementById('batch-suggestion-container');
  if (!container || !productId) return;

  // Cache
  const cached = __batchSuggestionState.cacheByProduct.get(productId);
  if (cached && (Date.now() - cached.ts) < __batchSuggestionState.cacheTtlMs) {
    // Re-render from cache (fast + avoids API bursts)
    renderBatchSuggestion(container, cached.data);
    return;
  }

  // Debounce rapid UI triggers
  if (__batchSuggestionState.debounceTimer) {
    clearTimeout(__batchSuggestionState.debounceTimer);
  }

  __batchSuggestionState.debounceTimer = setTimeout(async () => {
    try {
      const response = await fetchBatchSuggestionWithRetry(productId);

      if (!response || !response.ok) {
        // If rate limited, communicate gently and avoid spamming
        if (response && response.status === 429) {
          renderNoSuggestion(container, '⏳ Too many requests, try again in a moment');
          return;
        }

        renderNoSuggestion(container);
        return;
      }

      const data = await response.json();

      if (!data || !data.suggestion) {
        renderNoSuggestion(container);
        return;
      }

      __batchSuggestionState.cacheByProduct.set(productId, { ts: Date.now(), data });
      renderBatchSuggestion(container, data);
    } catch (error) {
      console.error('Error loading batch suggestion:', error);
      renderNoSuggestion(container, 'Could not load suggestion');
    }
  }, 150);
}

function renderBatchSuggestion(container, data) {
  if (!data || !data.suggestion) {
    renderNoSuggestion(container);
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
      <button
        class="btn-use-batch"
        type="button"
        data-batch-id="${suggestion.id}"
        data-current-quantity="${suggestion.total_quantity}">
        Use from this batch
      </button>
    </div>
  `;

  bindUseBatchButton(container);
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
  let lastSuggestionProductId = null;

  loadProductBatches = async function() {
    await originalLoadProductBatches();

    if (selectedProductId && selectedProductId !== lastSuggestionProductId) {
      lastSuggestionProductId = selectedProductId;
      await loadBatchSuggestion(selectedProductId);
    }
  };
}
