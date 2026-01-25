/**
 * CSV Helper Utilities
 * Shared functions for CSV export operations
 */

/**
 * Escape CSV field values
 * Handles commas, quotes, and newlines
 */
function escapeCSV(field) {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}`;
  }
  return stringField;
}

module.exports = {
  escapeCSV
};
