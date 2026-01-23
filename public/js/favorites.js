// Favorites Module
// Manage favorite products for quick access

const Favorites = {
  favorites: new Set(),

  async init() {
    await this.loadFavorites();
  },

  async loadFavorites() {
    try {
      const response = await fetch('/api/products');
      const products = await response.json();
      
      products.forEach(product => {
        if (product.is_favorite === 1) {
          this.favorites.add(product.id);
        }
      });
      
      this.updateUI();
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  },

  async toggleFavorite(productId) {
    try {
      const isFavorite = this.favorites.has(productId);
      
      const response = await fetch(`/api/products/${productId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !isFavorite })
      });

      if (response.ok) {
        if (isFavorite) {
          this.favorites.delete(productId);
        } else {
          this.favorites.add(productId);
        }
        this.updateUI();
        showNotification(
          isFavorite ? 'Removed from favorites' : 'Added to favorites',
          'success'
        );
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showNotification('Failed to update favorite', 'error');
    }
  },

  isFavorite(productId) {
    return this.favorites.has(productId);
  },

  updateUI() {
    // Update favorite stars in product cards
    document.querySelectorAll('.favorite-btn').forEach(btn => {
      const productId = parseInt(btn.dataset.productId);
      if (this.isFavorite(productId)) {
        btn.classList.add('active');
        btn.textContent = '⭐';
      } else {
        btn.classList.remove('active');
        btn.textContent = '☆';
      }
    });

    // Update favorites count
    const countEl = document.getElementById('favoritesCount');
    if (countEl) {
      countEl.textContent = this.favorites.size;
    }
  },

  getFavorites() {
    return Array.from(this.favorites);
  },

  async loadFavoritesWidget() {
    const widget = document.getElementById('favoritesWidget');
    if (!widget) return;

    try {
      const response = await fetch('/api/products');
      const products = await response.json();
      const favoriteProducts = products.filter(p => p.is_favorite === 1).slice(0, 5);

      if (favoriteProducts.length === 0) {
        widget.innerHTML = '<div class="empty-state">No favorites yet</div>';
        return;
      }

      const html = favoriteProducts.map(product => `
        <div class="favorite-item" onclick="openProductDetail(${product.id})">
          <div class="favorite-name">${product.name}</div>
          <div class="favorite-meta">${product.category_name || 'Uncategorized'}</div>
        </div>
      `).join('');

      widget.innerHTML = html;
    } catch (error) {
      console.error('Error loading favorites widget:', error);
    }
  }
};

// Initialize favorites
Favorites.init();
