/**
 * Favorites Module
 * Manage favorite products
 * v0.8.0
 */

const Favorites = (() => {
  const API_URL = '/api';

  /**
   * Toggle favorite status
   */
  async function toggleFavorite(productId) {
    try {
      const response = await fetch(`${API_URL}/products/${productId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      if (response.ok) {
        showNotification(result.message, 'success');
        return result.is_favorite;
      } else {
        showNotification(result.error || 'Failed to update favorite', 'error');
        return null;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showNotification('Failed to update favorite', 'error');
      return null;
    }
  }

  /**
   * Load favorites list
   */
  async function loadFavorites() {
    try {
      const response = await fetch(`${API_URL}/products/favorites`);
      return await response.json();
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  }

  /**
   * Render favorite star button
   */
  function renderFavoriteButton(productId, isFavorite) {
    const star = isFavorite ? '⭐' : '☆';
    return `
      <button class="favorite-button" onclick="Favorites.toggle(${productId})" title="${isFavorite ? 'Remove from' : 'Add to'} favorites">
        ${star}
      </button>
    `;
  }

  return {
    toggle: toggleFavorite,
    loadFavorites,
    renderButton: renderFavoriteButton
  };
})();

// Make globally available
if (typeof window !== 'undefined') {
  window.Favorites = Favorites;
}