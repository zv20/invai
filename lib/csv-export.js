/**
 * CSV Export Module
 * Generates CSV exports for reports
 */

class CSVExporter {
  constructor(db) {
    this.db = db;
  }

  escapeCSV(field) {
    if (field === null || field === undefined) return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  }

  /**
   * Export stock value report
   */
  async exportStockValue() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          p.name as product_name,
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

      this.db.all(query, [], (err, rows) => {
        if (err) return reject(err);

        const headers = ['Product', 'Category', 'Supplier', 'Quantity', 'Unit Cost', 'Total Value'];
        let csv = headers.join(',') + '\n';

        rows.forEach(row => {
          const rowData = [
            this.escapeCSV(row.product_name),
            this.escapeCSV(row.category),
            this.escapeCSV(row.supplier),
            this.escapeCSV(row.quantity),
            this.escapeCSV(row.unit_cost?.toFixed(2)),
            this.escapeCSV(row.total_value?.toFixed(2))
          ];
          csv += rowData.join(',') + '\n';
        });

        resolve(csv);
      });
    });
  }

  /**
   * Export expiration report
   */
  async exportExpiration() {
    return new Promise((resolve, reject) => {
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

      this.db.all(query, [], (err, rows) => {
        if (err) return reject(err);

        const headers = ['Product', 'Quantity', 'Expiry Date', 'Location', 'Days Until Expiry', 'Status'];
        let csv = headers.join(',') + '\n';

        rows.forEach(row => {
          const days = Math.floor(row.days_until_expiry);
          let status = 'OK';
          if (days < 0) status = 'EXPIRED';
          else if (days <= 7) status = 'URGENT';
          else if (days <= 30) status = 'SOON';

          const rowData = [
            this.escapeCSV(row.product_name),
            this.escapeCSV(row.quantity),
            this.escapeCSV(row.expiry_date),
            this.escapeCSV(row.location),
            this.escapeCSV(days),
            this.escapeCSV(status)
          ];
          csv += rowData.join(',') + '\n';
        });

        resolve(csv);
      });
    });
  }

  /**
   * Export low stock report
   */
  async exportLowStock() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          p.name as product_name,
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

      this.db.all(query, [], (err, rows) => {
        if (err) return reject(err);

        const headers = ['Product', 'Category', 'Supplier', 'Current Quantity', 'Reorder Point'];
        let csv = headers.join(',') + '\n';

        rows.forEach(row => {
          const rowData = [
            this.escapeCSV(row.product_name),
            this.escapeCSV(row.category),
            this.escapeCSV(row.supplier),
            this.escapeCSV(row.quantity),
            this.escapeCSV(row.reorder_point)
          ];
          csv += rowData.join(',') + '\n';
        });

        resolve(csv);
      });
    });
  }
}

module.exports = CSVExporter;
