/**
 * Search Engine
 * Provides advanced search capabilities with fuzzy matching and relevance scoring
 */

class SearchEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * Perform advanced product search
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results with relevance scores
   */
  async searchProducts(query, options = {}) {
    const {
      fuzzy = true,
      limit = 50,
      offset = 0,
      fields = ['name', 'sku', 'description'],
      minScore = 0.3
    } = options;

    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const terms = searchTerm.split(/\s+/);

    // Get all products
    const products = await this.db.all(`
      SELECT 
        p.*,
        c.name as category_name,
        s.name as supplier_name,
        l.name as location_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN locations l ON p.location_id = l.id
    `);

    // Score each product
    const scoredResults = products.map(product => {
      const score = this.calculateRelevanceScore(product, terms, fields, fuzzy);
      return {
        ...product,
        _score: score,
        _highlights: this.generateHighlights(product, terms, fields)
      };
    });

    // Filter by minimum score and sort
    const results = scoredResults
      .filter(r => r._score >= minScore)
      .sort((a, b) => b._score - a._score)
      .slice(offset, offset + limit);

    return results;
  }

  /**
   * Calculate relevance score for a product
   * @param {Object} product
   * @param {Array<string>} terms
   * @param {Array<string>} fields
   * @param {boolean} fuzzy
   * @returns {number} Relevance score (0-1)
   */
  calculateRelevanceScore(product, terms, fields, fuzzy) {
    let totalScore = 0;
    const fieldWeights = {
      name: 2.0,
      sku: 1.5,
      description: 1.0,
      category_name: 0.8,
      supplier_name: 0.5
    };

    for (const field of fields) {
      const fieldValue = (product[field] || '').toLowerCase();
      const weight = fieldWeights[field] || 1.0;

      for (const term of terms) {
        // Exact match
        if (fieldValue.includes(term)) {
          totalScore += weight * 1.0;
        }
        // Fuzzy match
        else if (fuzzy) {
          const distance = this.levenshteinDistance(term, fieldValue);
          const similarity = 1 - (distance / Math.max(term.length, fieldValue.length));
          if (similarity > 0.7) {
            totalScore += weight * similarity * 0.5;
          }
        }

        // Bonus for term at start
        if (fieldValue.startsWith(term)) {
          totalScore += weight * 0.5;
        }

        // Check for word boundaries
        const words = fieldValue.split(/\s+/);
        for (const word of words) {
          if (word === term) {
            totalScore += weight * 0.8;
          }
        }
      }
    }

    // Normalize score
    const maxPossibleScore = terms.length * fields.length * 2.0;
    return Math.min(1, totalScore / maxPossibleScore);
  }

  /**
   * Generate search highlights
   * @param {Object} product
   * @param {Array<string>} terms
   * @param {Array<string>} fields
   * @returns {Object} Highlighted fields
   */
  generateHighlights(product, terms, fields) {
    const highlights = {};

    for (const field of fields) {
      const value = product[field];
      if (!value) continue;

      let highlighted = value;
      for (const term of terms) {
        const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
      }

      if (highlighted !== value) {
        highlights[field] = highlighted;
      }
    }

    return highlights;
  }

  /**
   * Get autocomplete suggestions
   * @param {string} prefix
   * @param {number} limit
   * @returns {Promise<Array>} Suggestions
   */
  async getAutocompleteSuggestions(prefix, limit = 10) {
    if (!prefix || prefix.length < 2) {
      return [];
    }

    const searchTerm = prefix.toLowerCase();

    const suggestions = await this.db.all(`
      SELECT DISTINCT
        name,
        sku,
        'product' as type
      FROM products
      WHERE LOWER(name) LIKE ? OR LOWER(sku) LIKE ?
      LIMIT ?
    `, [`${searchTerm}%`, `${searchTerm}%`, limit]);

    return suggestions;
  }

  /**
   * Search by barcode or SKU (exact match)
   * @param {string} code
   * @returns {Promise<Object|null>} Product or null
   */
  async quickLookup(code) {
    const product = await this.db.get(`
      SELECT 
        p.*,
        c.name as category_name,
        s.name as supplier_name,
        l.name as location_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN locations l ON p.location_id = l.id
      WHERE p.sku = ? OR p.barcode = ?
    `, [code, code]);

    return product || null;
  }

  /**
   * Log search query for analytics
   * @param {string} query
   * @param {number} resultsCount
   * @param {number} userId
   */
  async logSearch(query, resultsCount, userId = null) {
    await this.db.run(`
      INSERT INTO search_history (user_id, query, results_count, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `, [userId, query, resultsCount]);
  }

  /**
   * Get popular search queries
   * @param {number} limit
   * @returns {Promise<Array>} Popular queries
   */
  async getPopularSearches(limit = 10) {
    const searches = await this.db.all(`
      SELECT 
        query,
        COUNT(*) as search_count,
        AVG(results_count) as avg_results
      FROM search_history
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY query
      ORDER BY search_count DESC
      LIMIT ?
    `, [limit]);

    return searches;
  }

  /**
   * Get user's recent searches
   * @param {number} userId
   * @param {number} limit
   * @returns {Promise<Array>} Recent searches
   */
  async getRecentSearches(userId, limit = 10) {
    const searches = await this.db.all(`
      SELECT DISTINCT query, created_at
      FROM search_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [userId, limit]);

    return searches;
  }

  /**
   * Levenshtein distance (edit distance) calculation
   * @param {string} a
   * @param {string} b
   * @returns {number} Edit distance
   */
  levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Escape special regex characters
   * @param {string} str
   * @returns {string} Escaped string
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = SearchEngine;
