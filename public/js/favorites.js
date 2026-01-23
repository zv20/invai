/**
 * Favorites Module
 * Manage favorite products for quick access
 * v0.8.0
 */

// Toggle favorite status
async function toggleFavorite(productId) {
  try {
    const response = await fetch(`/api/products/${productId}/favorite`, {
      method: 'POST'
    });
    
    if (!response.ok) throw new Error('Failed to toggle favorite');
    
    const result = await response.json();
    showNotification(result.message, 'success');
    
    // Refresh UI
    if (window.location.pathname === '/' && currentTab === 'inventory') {
      loadProducts();
    }
    
    return result;
  } catch (error) {
    console.error('Error toggling favorite:', error);
    showNotification('Failed to update favorite', 'error');
  }
}

// Load favorite products
async function loadFavorites() {
  try {
    const response = await fetch('/api/products/favorites');
    if (!response.ok) throw new Error('Failed to load favorites');
    
    const favorites = await response.json();
    renderFavorites(favorites);
    return favorites;
  } catch (error) {
    console.error('Error loading favorites:', error);
    return [];
  }
}

// Render favorites widget
function renderFavorites(favorites) {
  const container = document.getElementById('favoritesContainer');
  if (!container) return;

  if (!favorites || favorites.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm italic p-4">No favorite products yet</p>';
    return;
  }

  container.innerHTML = favorites.map(product => `
    <div class="favorite-item p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition"
         onclick="openProductDetail(${product.id})">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <div class="font-medium text-sm text-gray-900">⭐ ${product.name}</div>
          ${product.brand ? `<div class="text-xs text-gray-600 mt-1">${product.brand}</div>` : ''}
        </div>
        <button onclick="event.stopPropagation(); toggleFavorite(${product.id})" 
                class="text-yellow-500 hover:text-gray-400 transition" 
                title="Remove from favorites">
          ⭐
        </button>
      </div>
      ${product.total_quantity !== undefined ? `
        <div class="mt-2 text-xs text-gray-600">
          Stock: ${product.total_quantity} items
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Add favorite star to product cards
function addFavoriteButton(productCard, productId, isFavorite) {
  const button = document.createElement('button');
  button.className = 'favorite-btn absolute top-2 right-2 text-2xl hover:scale-110 transition';
  button.innerHTML = isFavorite ? '⭐' : '☆';
  button.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
  button.onclick = (e) => {
    e.stopPropagation();
    toggleFavorite(productId);
  };
  productCard.appendChild(button);
}