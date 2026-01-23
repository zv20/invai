/**
 * CSV Export Utility
 * Generate CSV files for reports and exports
 * v0.8.0
 */

class CSVExporter {
  /**
   * Convert array of objects to CSV string
   * @param {Array} data - Array of objects
   * @param {Array} columns - Optional column definitions [{key: 'name', label: 'Product Name'}]
   */
  static toCSV(data, columns = null) {
    if (!data || data.length === 0) {
      return '';
    }

    // If no columns specified, use keys from first object
    if (!columns) {
      const keys = Object.keys(data[0]);
      columns = keys.map(key => ({ key, label: key }));
    }

    // Build header row
    const headers = columns.map(col => CSVExporter.escapeCSV(col.label));
    let csv = headers.join(',') + '\n';

    // Build data rows
    data.forEach(row => {
      const values = columns.map(col => {
        const value = row[col.key];
        return CSVExporter.escapeCSV(value);
      });
      csv += values.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Escape CSV field
   */
  static escapeCSV(field) {
    if (field === null || field === undefined) {
      return '';
    }

    const stringField = String(field);
    
    // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }

    return stringField;
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(prefix = 'export') {
    const date = new Date().toISOString().split('T')[0];
    return `${prefix}_${date}.csv`;
  }
}

module.exports = CSVExporter;