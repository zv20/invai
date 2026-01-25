/**
 * Role-Based Access Control (RBAC) Middleware
 * Defines permissions for 4 roles: Owner, Manager, Staff, View-Only
 * 
 * @module middleware/permissions
 */

/**
 * Permission definitions mapping actions to allowed roles
 * Format: 'resource:action': [allowed_roles]
 */
const permissions = {
  // Product permissions
  'products:view': ['owner', 'manager', 'staff', 'viewer'],
  'products:create': ['owner', 'manager', 'staff'],
  'products:update': ['owner', 'manager', 'staff'],
  'products:delete': ['owner', 'manager'],
  
  // Batch permissions
  'batches:view': ['owner', 'manager', 'staff', 'viewer'],
  'batches:create': ['owner', 'manager', 'staff'],
  'batches:update': ['owner', 'manager', 'staff'],
  'batches:delete': ['owner', 'manager'],
  
  // Report permissions
  'reports:view': ['owner', 'manager', 'staff', 'viewer'],
  'reports:view_costs': ['owner', 'manager'],
  'reports:export': ['owner', 'manager'],
  
  // User management permissions
  'users:view': ['owner'],
  'users:create': ['owner'],
  'users:update': ['owner'],
  'users:delete': ['owner'],
  
  // Settings permissions
  'settings:view': ['owner'],
  'settings:update': ['owner'],
  
  // Activity log permissions
  'activity:view_all': ['owner', 'manager'],
  'activity:view_own': ['owner', 'manager', 'staff', 'viewer'],
  
  // Profile permissions (all users can manage their own profile)
  'profile:view': ['owner', 'manager', 'staff', 'viewer'],
  'profile:update': ['owner', 'manager', 'staff', 'viewer'],
};

/**
 * Check if a user role has a specific permission
 * 
 * @param {string} userRole - The role of the user (owner, manager, staff, viewer)
 * @param {string} permission - The permission to check (e.g., 'products:create')
 * @returns {boolean} True if the role has permission, false otherwise
 * 
 * @example
 * hasPermission('staff', 'products:create') // returns true
 * hasPermission('viewer', 'products:create') // returns false
 */
function hasPermission(userRole, permission) {
  // Check if permission exists
  if (!permissions[permission]) {
    console.warn(`Unknown permission requested: ${permission}`);
    return false;
  }
  
  // Check if user role is in allowed roles for this permission
  return permissions[permission].includes(userRole);
}

/**
 * Middleware to require a specific permission
 * Returns 401 if not authenticated, 403 if permission denied
 * 
 * @param {string} permission - The required permission
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.post('/products', authenticate, requirePermission('products:create'), handler);
 */
function requirePermission(permission) {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
          statusCode: 401
        }
      });
    }
    
    // Check if user has the required permission
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: permission,
          userRole: req.user.role,
          statusCode: 403
        }
      });
    }
    
    // Permission granted, continue to next middleware
    next();
  };
}

/**
 * Middleware to require multiple permissions (user must have ALL)
 * 
 * @param {...string} requiredPermissions - The required permissions
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.post('/export', authenticate, requireAllPermissions('reports:view', 'reports:export'), handler);
 */
function requireAllPermissions(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
          statusCode: 401
        }
      });
    }
    
    // Check if user has all required permissions
    const missingPermissions = requiredPermissions.filter(
      permission => !hasPermission(req.user.role, permission)
    );
    
    if (missingPermissions.length > 0) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: requiredPermissions,
          missing: missingPermissions,
          userRole: req.user.role,
          statusCode: 403
        }
      });
    }
    
    next();
  };
}

/**
 * Middleware to require any of multiple permissions (user must have AT LEAST ONE)
 * 
 * @param {...string} allowedPermissions - The allowed permissions
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.get('/reports', authenticate, requireAnyPermission('reports:view', 'reports:view_costs'), handler);
 */
function requireAnyPermission(...allowedPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
          statusCode: 401
        }
      });
    }
    
    // Check if user has at least one of the allowed permissions
    const hasAnyPermission = allowedPermissions.some(
      permission => hasPermission(req.user.role, permission)
    );
    
    if (!hasAnyPermission) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: `At least one of: ${allowedPermissions.join(', ')}`,
          userRole: req.user.role,
          statusCode: 403
        }
      });
    }
    
    next();
  };
}

/**
 * Get all permissions for a specific role
 * Useful for UI to show/hide features based on user role
 * 
 * @param {string} role - The user role
 * @returns {string[]} Array of permission strings the role has access to
 * 
 * @example
 * getRolePermissions('staff') // returns ['products:view', 'products:create', ...]
 */
function getRolePermissions(role) {
  return Object.keys(permissions).filter(
    permission => permissions[permission].includes(role)
  );
}

module.exports = {
  permissions,
  hasPermission,
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  getRolePermissions
};
