/**
 * Filter Engine
 * Provides advanced filtering capabilities for inventory searches
 */

class FilterEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * Apply filters to product search
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Filtered products
   */
  async applyFilters(filters, options = {}) {
    const {
      limit = 50,
      offset = 0,
      sortBy = 'name',
      sortOrder = 'ASC'
    } = options;

    const { whereClause, params } = this.buildWhereClause(filters);
    
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        s.name as supplier_name,
        l.name as location_name,
        (p.stock_quantity * p.cost) as inventory_value
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN locations l ON p.location_id = l.id
      ${whereClause}
      ORDER BY ${this.sanitizeSortField(sortBy)} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const results = await this.db.all(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `;
    const countResult = await this.db.get(countQuery, params.slice(0, -2));

    return {
      data: results,
      total: countResult.total,
      limit,
      offset,
      hasMore: (offset + limit) < countResult.total
    };
  }

  /**
   * Build WHERE clause from filters
   * @param {Object} filters
   * @returns {Object} WHERE clause and parameters
   */
  buildWhereClause(filters) {
    const conditions = [];
    const params = [];

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      const placeholders = filters.categories.map(() => '?').join(',');
      conditions.push(`p.category_id IN (${placeholders})`);
      params.push(...filters.categories);
    }

    // Supplier filter
    if (filters.suppliers && filters.suppliers.length > 0) {
      const placeholders = filters.suppliers.map(() => '?').join(',');
      conditions.push(`p.supplier_id IN (${placeholders})`);
      params.push(...filters.suppliers);
    }

    // Location filter
    if (filters.locations && filters.locations.length > 0) {
      const placeholders = filters.locations.map(() => '?').join(',');
      conditions.push(`p.location_id IN (${placeholders})`);
      params.push(...filters.locations);
    }

    // Price range
    if (filters.priceMin !== undefined) {
      conditions.push('p.price >= ?');
      params.push(filters.priceMin);
    }
    if (filters.priceMax !== undefined) {
      conditions.push('p.price <= ?');
      params.push(filters.priceMax);
    }

    // Cost range
    if (filters.costMin !== undefined) {
      conditions.push('p.cost >= ?');
      params.push(filters.costMin);
    }
    if (filters.costMax !== undefined) {
      conditions.push('p.cost <= ?');
      params.push(filters.costMax);
    }

    // Stock level filters
    if (filters.stockStatus) {
      switch (filters.stockStatus) {
        case 'low':
          conditions.push('p.stock_quantity <= p.min_stock_level');
          break;
        case 'adequate':
          conditions.push('p.stock_quantity > p.min_stock_level AND p.stock_quantity <= p.max_stock_level');
          break;
        case 'excess':
          conditions.push('p.stock_quantity > p.max_stock_level');
          break;
        case 'out_of_stock':
          conditions.push('p.stock_quantity = 0');
          break;
      }
    }

    // Stock quantity range
    if (filters.stockMin !== undefined) {
      conditions.push('p.stock_quantity >= ?');
      params.push(filters.stockMin);
    }
    if (filters.stockMax !== undefined) {
      conditions.push('p.stock_quantity <= ?');
      params.push(filters.stockMax);
    }

    // Active status
    if (filters.active !== undefined) {
      conditions.push('p.active = ?');
      params.push(filters.active ? 1 : 0);
    }

    // Date range filters
    if (filters.createdAfter) {
      conditions.push('p.created_at >= ?');
      params.push(filters.createdAfter);
    }
    if (filters.createdBefore) {
      conditions.push('p.created_at <= ?');
      params.push(filters.createdBefore);
    }

    // Expiration filters
    if (filters.expiringWithinDays) {
      conditions.push(`p.expiration_date <= datetime('now', '+' || ? || ' days')`);
      params.push(filters.expiringWithinDays);
    }

    // Has alerts
    if (filters.hasAlerts) {
      conditions.push('(p.stock_quantity <= p.min_stock_level OR p.expiration_date <= datetime("now", "+30 days"))');
    }

    // Custom text search in WHERE clause
    if (filters.textSearch) {
      const searchTerm = `%${filters.textSearch}%`;
      conditions.push('(LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(p.description) LIKE ?)');
      params.push(searchTerm.toLowerCase(), searchTerm.toLowerCase(), searchTerm.toLowerCase());
    }

    const whereClause = conditions.length > 0 
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    return { whereClause, params };
  }

  /**
   * Get filter options (available categories, suppliers, etc.)
   * @returns {Promise<Object>} Available filter options
   */
  async getFilterOptions() {
    const [categories, suppliers, locations, stockStats] = await Promise.all([
      this.db.all('SELECT id, name FROM categories WHERE active = 1 ORDER BY name'),
      this.db.all('SELECT id, name FROM suppliers WHERE active = 1 ORDER BY name'),
      this.db.all('SELECT id, name FROM locations WHERE active = 1 ORDER BY name'),
      this.db.get(`
        SELECT 
          MIN(price) as min_price,
          MAX(price) as max_price,
          MIN(stock_quantity) as min_stock,
          MAX(stock_quantity) as max_stock
        FROM products
        WHERE active = 1
      `)
    ]);

    return {
      categories,
      suppliers,
      locations,
      priceRange: {
        min: stockStats.min_price || 0,
        max: stockStats.max_price || 1000
      },
      stockRange: {
        min: stockStats.min_stock || 0,
        max: stockStats.max_stock || 1000
      },
      stockStatuses: [
        { value: 'low', label: 'Low Stock' },
        { value: 'adequate', label: 'Adequate Stock' },
        { value: 'excess', label: 'Excess Stock' },
        { value: 'out_of_stock', label: 'Out of Stock' }
      ]
    };
  }

  /**
   * Sanitize sort field to prevent SQL injection
   * @param {string} field
   * @returns {string} Safe field name
   */
  sanitizeSortField(field) {
    const allowedFields = [
      'name', 'sku', 'price', 'cost', 'stock_quantity',
      'created_at', 'updated_at', 'category_name', 'supplier_name',
      'inventory_value'
    ];

    return allowedFields.includes(field) ? field : 'name';
  }

  /**
   * Get filter statistics
   * @param {Object} filters
   * @returns {Promise<Object>} Statistics for current filters
   */
  async getFilterStats(filters) {
    const { whereClause, params } = this.buildWhereClause(filters);

    const stats = await this.db.get(`
      SELECT 
        COUNT(*) as product_count,
        SUM(p.stock_quantity) as total_units,
        SUM(p.stock_quantity * p.cost) as total_value,
        AVG(p.price) as avg_price,
        COUNT(CASE WHEN p.stock_quantity <= p.min_stock_level THEN 1 END) as low_stock_count
      FROM products p
      ${whereClause}
    `, params);

    return {
      productCount: stats.product_count || 0,
      totalUnits: stats.total_units || 0,
      totalValue: stats.total_value || 0,
      avgPrice: stats.avg_price || 0,
      lowStockCount: stats.low_stock_count || 0
    };
  }
}

module.exports = FilterEngine;
