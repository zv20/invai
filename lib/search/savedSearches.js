/**
 * Saved Searches Manager
 * Handles saving, retrieving, and managing user search preferences
 */

class SavedSearches {
  constructor(db) {
    this.db = db;
  }

  /**
   * Save a search query with filters
   * @param {number} userId
   * @param {Object} searchData
   * @returns {Promise<number>} Saved search ID
   */
  async saveSearch(userId, searchData) {
    const {
      name,
      description = '',
      query = '',
      filters = {},
      isShared = false
    } = searchData;

    const result = await this.db.run(`
      INSERT INTO saved_searches 
      (user_id, name, description, query, filters, is_shared, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      userId,
      name,
      description,
      query,
      JSON.stringify(filters),
      isShared ? 1 : 0
    ]);

    return result.lastID;
  }

  /**
   * Get user's saved searches
   * @param {number} userId
   * @param {boolean} includeShared
   * @returns {Promise<Array>} Saved searches
   */
  async getUserSearches(userId, includeShared = true) {
    const condition = includeShared 
      ? '(user_id = ? OR is_shared = 1)'
      : 'user_id = ?';

    const searches = await this.db.all(`
      SELECT 
        id,
        name,
        description,
        query,
        filters,
        is_shared,
        use_count,
        created_at,
        updated_at
      FROM saved_searches
      WHERE ${condition}
      ORDER BY use_count DESC, updated_at DESC
    `, [userId]);

    return searches.map(s => ({
      ...s,
      filters: JSON.parse(s.filters),
      is_shared: Boolean(s.is_shared)
    }));
  }

  /**
   * Get a specific saved search
   * @param {number} searchId
   * @param {number} userId
   * @returns {Promise<Object|null>} Saved search or null
   */
  async getSearch(searchId, userId) {
    const search = await this.db.get(`
      SELECT *
      FROM saved_searches
      WHERE id = ? AND (user_id = ? OR is_shared = 1)
    `, [searchId, userId]);

    if (!search) return null;

    return {
      ...search,
      filters: JSON.parse(search.filters),
      is_shared: Boolean(search.is_shared)
    };
  }

  /**
   * Update a saved search
   * @param {number} searchId
   * @param {number} userId
   * @param {Object} updates
   * @returns {Promise<boolean>} Success status
   */
  async updateSearch(searchId, userId, updates) {
    const allowedFields = ['name', 'description', 'query', 'filters', 'is_shared'];
    const updateFields = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        params.push(key === 'filters' ? JSON.stringify(value) : value);
      }
    }

    if (updateFields.length === 0) return false;

    updateFields.push('updated_at = datetime("now")');
    params.push(searchId, userId);

    const result = await this.db.run(`
      UPDATE saved_searches
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `, params);

    return result.changes > 0;
  }

  /**
   * Delete a saved search
   * @param {number} searchId
   * @param {number} userId
   * @returns {Promise<boolean>} Success status
   */
  async deleteSearch(searchId, userId) {
    const result = await this.db.run(`
      DELETE FROM saved_searches
      WHERE id = ? AND user_id = ?
    `, [searchId, userId]);

    return result.changes > 0;
  }

  /**
   * Increment use count for a saved search
   * @param {number} searchId
   */
  async incrementUseCount(searchId) {
    await this.db.run(`
      UPDATE saved_searches
      SET use_count = use_count + 1,
          last_used_at = datetime('now')
      WHERE id = ?
    `, [searchId]);
  }

  /**
   * Get popular saved searches (team-wide)
   * @param {number} limit
   * @returns {Promise<Array>} Popular searches
   */
  async getPopularSearches(limit = 10) {
    const searches = await this.db.all(`
      SELECT 
        id,
        name,
        description,
        query,
        filters,
        use_count,
        is_shared
      FROM saved_searches
      WHERE is_shared = 1
      ORDER BY use_count DESC
      LIMIT ?
    `, [limit]);

    return searches.map(s => ({
      ...s,
      filters: JSON.parse(s.filters),
      is_shared: Boolean(s.is_shared)
    }));
  }

  /**
   * Execute a saved search
   * @param {number} searchId
   * @param {number} userId
   * @param {Object} searchEngine
   * @param {Object} filterEngine
   * @returns {Promise<Object>} Search results
   */
  async executeSearch(searchId, userId, searchEngine, filterEngine) {
    const savedSearch = await this.getSearch(searchId, userId);
    if (!savedSearch) {
      throw new Error('Saved search not found');
    }

    // Increment use count
    await this.incrementUseCount(searchId);

    // Execute search
    let results;
    if (savedSearch.query) {
      results = await searchEngine.searchProducts(savedSearch.query);
    } else {
      results = await filterEngine.applyFilters(savedSearch.filters);
    }

    return {
      searchName: savedSearch.name,
      results
    };
  }

  /**
   * Create quick search shortcuts
   * @returns {Array} Predefined searches
   */
  getQuickSearchTemplates() {
    return [
      {
        name: 'Low Stock Items',
        filters: { stockStatus: 'low' },
        icon: '⚠️'
      },
      {
        name: 'Expiring Soon',
        filters: { expiringWithinDays: 30 },
        icon: '⏰'
      },
      {
        name: 'High Value Items',
        filters: { costMin: 100 },
        sortBy: 'cost',
        sortOrder: 'DESC',
        icon: '💰'
      },
      {
        name: 'Out of Stock',
        filters: { stockStatus: 'out_of_stock' },
        icon: '❌'
      },
      {
        name: 'Excess Inventory',
        filters: { stockStatus: 'excess' },
        icon: '📦'
      },
      {
        name: 'Recently Added',
        filters: {},
        sortBy: 'created_at',
        sortOrder: 'DESC',
        icon: '🆕'
      }
    ];
  }
}

module.exports = SavedSearches;
