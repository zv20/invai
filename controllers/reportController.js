/**
 * Report Controller
 * Business logic for generating reports
 */

class ReportController {
  constructor(db, csvExporter) {
    this.db = db;
    this.csvExporter = csvExporter;
  }

  async getStockValueReport() {
    const query = `
      SELECT 
        p.id, p.name,
        c.name as category,
        s.name as supplier,
        COALESCE(SUM(ib.total_quantity), 0) as quantity,
        p.cost_per_case / NULLIF(p.items_per_case, 0) as unit_cost,
        COALESCE(SUM((p.cost_per_case / NULLIF(p.items_per_case, 0)) * ib.total_quantity), 0) as total_value
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      GROUP BY p.id
      ORDER BY total_value DESC
    `;

    const rows = await this.db.all(query, []);
    const totalValue = rows.reduce((sum, r) => sum + (r.total_value || 0), 0);
    const totalItems = rows.reduce((sum, r) => sum + r.quantity, 0);
    
    return { products: rows, totalValue, totalItems };
  }

  async getExpirationReport() {
    const query = `
      SELECT 
        p.name as product_name,
        ib.total_quantity as quantity,
        ib.expiry_date,
        ib.location,
        JULIANDAY(ib.expiry_date) - JULIANDAY('now') as days_until_expiry
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      WHERE ib.expiry_date IS NOT NULL
      ORDER BY ib.expiry_date
    `;

    const rows = await this.db.all(query, []);
    const expired = rows.filter(r => r.days_until_expiry < 0);
    const urgent = rows.filter(r => r.days_until_expiry >= 0 && r.days_until_expiry <= 7);
    const soon = rows.filter(r => r.days_until_expiry > 7 && r.days_until_expiry <= 30);
    
    return { expired, urgent, soon, all: rows };
  }

  async getLowStockReport() {
    const query = `
      SELECT 
        p.id, p.name,
        c.name as category,
        s.name as supplier,
        COALESCE(SUM(ib.total_quantity), 0) as quantity,
        p.reorder_point
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      GROUP BY p.id
      HAVING quantity < p.reorder_point AND p.reorder_point > 0
      ORDER BY quantity
    `;

    const rows = await this.db.all(query, []);
    return { products: rows };
  }

  async exportReport(reportType) {
    switch(reportType) {
      case 'stock-value':
        return await this.csvExporter.exportStockValue();
      case 'expiration':
        return await this.csvExporter.exportExpiration();
      case 'low-stock':
        return await this.csvExporter.exportLowStock();
      default:
        throw new Error('Invalid report type');
    }
  }

  async getInventoryTurnoverReport(startDate, endDate) {
    // Future enhancement: Calculate inventory turnover rate
    // This would require tracking sales/usage data
    throw new Error('Inventory turnover report not yet implemented');
  }

  async getSupplierPerformanceReport() {
    const query = `
      SELECT 
        s.name as supplier,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(ib.total_quantity), 0) as total_items,
        COALESCE(SUM((p.cost_per_case / NULLIF(p.items_per_case, 0)) * ib.total_quantity), 0) as total_value
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      WHERE s.is_active = 1
      GROUP BY s.id
      ORDER BY total_value DESC
    `;

    return await this.db.all(query, []);
  }

  async getCategoryBreakdownReport() {
    const query = `
      SELECT 
        c.name as category,
        c.color,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(ib.total_quantity), 0) as total_items,
        COALESCE(SUM((p.cost_per_case / NULLIF(p.items_per_case, 0)) * ib.total_quantity), 0) as total_value
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN inventory_batches ib ON p.id = ib.product_id
      GROUP BY c.id
      ORDER BY total_value DESC
    `;

    return await this.db.all(query, []);
  }
}

module.exports = ReportController;
