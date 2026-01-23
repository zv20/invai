/**
 * CSV Export Module
 * Generate CSV files for reports and data export
 * v0.8.0
 */

class CSVExporter {
  /**
   * Convert array of objects to CSV
   */
  static arrayToCSV(data, headers = null) {
    if (!data || data.length === 0) {
      return '';
    }

    // Auto-detect headers from first object if not provided
    if (!headers) {
      headers = Object.keys(data[0]);
    }

    // Create header row
    let csv = headers.map(h => this.escapeCSV(h)).join(',') + '\n';

    // Create data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return this.escapeCSV(value);
      });
      csv += values.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Escape CSV field
   */
  static escapeCSV(field) {
    if (field === null || field === undefined) return '';
    
    const stringField = String(field);
    
    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    
    return stringField;
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(prefix) {
    const date = new Date().toISOString().split('T')[0];
    return `${prefix}_${date}.csv`;
  }
}

module.exports = CSVExporter;