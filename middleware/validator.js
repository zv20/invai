const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Handle validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  
  next();
};

/**
 * Common validation rules
 */
const validators = {
  // Product validators
  productName: body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Product name must be 2-200 characters'),
  
  barcode: body('barcode')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Barcode must be less than 100 characters'),
  
  supplierId: body('supplier_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Invalid supplier ID'),
  
  categoryId: body('category_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Invalid category ID'),
  
  itemsPerCase: body('items_per_case')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Items per case must be at least 1'),
  
  costPerCase: body('cost_per_case')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Cost must be a positive number'),

  // Batch validators
  caseQuantity: body('case_quantity')
    .isInt({ min: 0 }).withMessage('Case quantity must be a non-negative integer'),
  
  expiryDate: body('expiry_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid expiry date format'),
  
  location: body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location must be less than 200 characters'),

  // Category validators
  categoryName: body('name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Category name must be 2-100 characters'),
  
  color: body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color'),

  // Supplier validators
  supplierName: body('name')
    .trim()
    .notEmpty().withMessage('Supplier name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Supplier name must be 2-200 characters'),
  
  email: body('email')
    .optional({ nullable: true })
    .trim()
    .isEmail().withMessage('Invalid email address'),
  
  phone: body('phone')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 }).withMessage('Phone must be less than 50 characters'),

  // Auth validators
  username: body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, hyphens and underscores'),
  
  password: body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),

  // ID validators
  id: param('id')
    .isInt({ min: 1 }).withMessage('Invalid ID'),

  // Search validators
  search: query('search')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Search query too long')
};

module.exports = {
  validate,
  validators
};