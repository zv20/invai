/**
 * Unit Tests for Permission Middleware
 * Tests RBAC permission checking and middleware functions
 */

const {
  permissions,
  hasPermission,
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  getRolePermissions
} = require('../../middleware/permissions');

describe('Permission Middleware', () => {
  describe('hasPermission()', () => {
    describe('Product permissions', () => {
      test('should allow all roles to view products', () => {
        expect(hasPermission('owner', 'products:view')).toBe(true);
        expect(hasPermission('manager', 'products:view')).toBe(true);
        expect(hasPermission('staff', 'products:view')).toBe(true);
        expect(hasPermission('viewer', 'products:view')).toBe(true);
      });
      
      test('should allow owner, manager, staff to create products', () => {
        expect(hasPermission('owner', 'products:create')).toBe(true);
        expect(hasPermission('manager', 'products:create')).toBe(true);
        expect(hasPermission('staff', 'products:create')).toBe(true);
        expect(hasPermission('viewer', 'products:create')).toBe(false);
      });
      
      test('should allow owner, manager, staff to update products', () => {
        expect(hasPermission('owner', 'products:update')).toBe(true);
        expect(hasPermission('manager', 'products:update')).toBe(true);
        expect(hasPermission('staff', 'products:update')).toBe(true);
        expect(hasPermission('viewer', 'products:update')).toBe(false);
      });
      
      test('should allow only owner and manager to delete products', () => {
        expect(hasPermission('owner', 'products:delete')).toBe(true);
        expect(hasPermission('manager', 'products:delete')).toBe(true);
        expect(hasPermission('staff', 'products:delete')).toBe(false);
        expect(hasPermission('viewer', 'products:delete')).toBe(false);
      });
    });
    
    describe('Batch permissions', () => {
      test('should allow all roles to view batches', () => {
        expect(hasPermission('owner', 'batches:view')).toBe(true);
        expect(hasPermission('manager', 'batches:view')).toBe(true);
        expect(hasPermission('staff', 'batches:view')).toBe(true);
        expect(hasPermission('viewer', 'batches:view')).toBe(true);
      });
      
      test('should allow owner, manager, staff to create batches', () => {
        expect(hasPermission('owner', 'batches:create')).toBe(true);
        expect(hasPermission('manager', 'batches:create')).toBe(true);
        expect(hasPermission('staff', 'batches:create')).toBe(true);
        expect(hasPermission('viewer', 'batches:create')).toBe(false);
      });
      
      test('should allow owner, manager, staff to update batches', () => {
        expect(hasPermission('owner', 'batches:update')).toBe(true);
        expect(hasPermission('manager', 'batches:update')).toBe(true);
        expect(hasPermission('staff', 'batches:update')).toBe(true);
        expect(hasPermission('viewer', 'batches:update')).toBe(false);
      });
      
      test('should allow only owner and manager to delete batches', () => {
        expect(hasPermission('owner', 'batches:delete')).toBe(true);
        expect(hasPermission('manager', 'batches:delete')).toBe(true);
        expect(hasPermission('staff', 'batches:delete')).toBe(false);
        expect(hasPermission('viewer', 'batches:delete')).toBe(false);
      });
    });
    
    describe('Report permissions', () => {
      test('should allow all roles to view basic reports', () => {
        expect(hasPermission('owner', 'reports:view')).toBe(true);
        expect(hasPermission('manager', 'reports:view')).toBe(true);
        expect(hasPermission('staff', 'reports:view')).toBe(true);
        expect(hasPermission('viewer', 'reports:view')).toBe(true);
      });
      
      test('should allow only owner and manager to view cost data', () => {
        expect(hasPermission('owner', 'reports:view_costs')).toBe(true);
        expect(hasPermission('manager', 'reports:view_costs')).toBe(true);
        expect(hasPermission('staff', 'reports:view_costs')).toBe(false);
        expect(hasPermission('viewer', 'reports:view_costs')).toBe(false);
      });
      
      test('should allow only owner and manager to export reports', () => {
        expect(hasPermission('owner', 'reports:export')).toBe(true);
        expect(hasPermission('manager', 'reports:export')).toBe(true);
        expect(hasPermission('staff', 'reports:export')).toBe(false);
        expect(hasPermission('viewer', 'reports:export')).toBe(false);
      });
    });
    
    describe('User management permissions', () => {
      test('should allow only owner to manage users', () => {
        expect(hasPermission('owner', 'users:view')).toBe(true);
        expect(hasPermission('owner', 'users:create')).toBe(true);
        expect(hasPermission('owner', 'users:update')).toBe(true);
        expect(hasPermission('owner', 'users:delete')).toBe(true);
        
        expect(hasPermission('manager', 'users:view')).toBe(false);
        expect(hasPermission('staff', 'users:create')).toBe(false);
        expect(hasPermission('viewer', 'users:update')).toBe(false);
      });
    });
    
    describe('Settings permissions', () => {
      test('should allow only owner to access settings', () => {
        expect(hasPermission('owner', 'settings:view')).toBe(true);
        expect(hasPermission('owner', 'settings:update')).toBe(true);
        
        expect(hasPermission('manager', 'settings:view')).toBe(false);
        expect(hasPermission('staff', 'settings:update')).toBe(false);
        expect(hasPermission('viewer', 'settings:view')).toBe(false);
      });
    });
    
    describe('Activity log permissions', () => {
      test('should allow owner and manager to view all activity', () => {
        expect(hasPermission('owner', 'activity:view_all')).toBe(true);
        expect(hasPermission('manager', 'activity:view_all')).toBe(true);
        expect(hasPermission('staff', 'activity:view_all')).toBe(false);
        expect(hasPermission('viewer', 'activity:view_all')).toBe(false);
      });
      
      test('should allow all roles to view their own activity', () => {
        expect(hasPermission('owner', 'activity:view_own')).toBe(true);
        expect(hasPermission('manager', 'activity:view_own')).toBe(true);
        expect(hasPermission('staff', 'activity:view_own')).toBe(true);
        expect(hasPermission('viewer', 'activity:view_own')).toBe(true);
      });
    });
    
    describe('Profile permissions', () => {
      test('should allow all roles to manage their own profile', () => {
        expect(hasPermission('owner', 'profile:view')).toBe(true);
        expect(hasPermission('manager', 'profile:view')).toBe(true);
        expect(hasPermission('staff', 'profile:update')).toBe(true);
        expect(hasPermission('viewer', 'profile:update')).toBe(true);
      });
    });
    
    describe('Edge cases', () => {
      test('should return false for unknown permission', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        expect(hasPermission('owner', 'unknown:permission')).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Unknown permission requested: unknown:permission');
        
        consoleSpy.mockRestore();
      });
      
      test('should return false for invalid role', () => {
        expect(hasPermission('invalid_role', 'products:view')).toBe(false);
        expect(hasPermission('', 'products:view')).toBe(false);
        expect(hasPermission('superuser', 'products:view')).toBe(false);
      });
      
      test('should handle null/undefined role', () => {
        expect(hasPermission(null, 'products:view')).toBe(false);
        expect(hasPermission(undefined, 'products:view')).toBe(false);
      });
      
      test('should support backward compatibility for admin role', () => {
        // Admin should be treated as owner
        expect(hasPermission('admin', 'products:view')).toBe(true);
        expect(hasPermission('admin', 'products:delete')).toBe(true);
        expect(hasPermission('admin', 'users:create')).toBe(true);
        expect(hasPermission('admin', 'settings:update')).toBe(true);
      });
    });
  });
  
  describe('requirePermission() middleware', () => {
    let mockReq, mockRes, mockNext;
    
    beforeEach(() => {
      mockReq = {
        user: null
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });
    
    test('should return 401 if user is not authenticated', () => {
      const middleware = requirePermission('products:view');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
          statusCode: 401
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    test('should return 403 if user lacks required permission', () => {
      mockReq.user = { id: 1, username: 'viewer', role: 'viewer' };
      const middleware = requirePermission('products:delete');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: 'products:delete',
          userRole: 'viewer',
          statusCode: 403
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    test('should call next() if user has required permission', () => {
      mockReq.user = { id: 1, username: 'manager', role: 'manager' };
      const middleware = requirePermission('products:delete');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
    
    test('should work with owner role', () => {
      mockReq.user = { id: 1, username: 'owner', role: 'owner' };
      const middleware = requirePermission('users:create');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    test('should work with staff role', () => {
      mockReq.user = { id: 2, username: 'staff', role: 'staff' };
      const middleware = requirePermission('products:create');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    test('should deny staff from deleting', () => {
      mockReq.user = { id: 2, username: 'staff', role: 'staff' };
      const middleware = requirePermission('products:delete');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
  
  describe('requireAllPermissions() middleware', () => {
    let mockReq, mockRes, mockNext;
    
    beforeEach(() => {
      mockReq = {
        user: { id: 1, username: 'staff', role: 'staff' }
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });
    
    test('should call next() if user has all required permissions', () => {
      const middleware = requireAllPermissions('products:view', 'products:create');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
    
    test('should return 403 if user lacks any required permission', () => {
      const middleware = requireAllPermissions('products:view', 'products:delete');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: ['products:view', 'products:delete'],
          missing: ['products:delete'],
          userRole: 'staff',
          statusCode: 403
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    test('should return 401 if user not authenticated', () => {
      mockReq.user = null;
      const middleware = requireAllPermissions('products:view');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
  
  describe('requireAnyPermission() middleware', () => {
    let mockReq, mockRes, mockNext;
    
    beforeEach(() => {
      mockReq = {
        user: { id: 1, username: 'staff', role: 'staff' }
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });
    
    test('should call next() if user has at least one required permission', () => {
      const middleware = requireAnyPermission('products:delete', 'products:create');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
    
    test('should return 403 if user has none of the required permissions', () => {
      const middleware = requireAnyPermission('users:create', 'settings:update');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: 'At least one of: users:create, settings:update',
          userRole: 'staff',
          statusCode: 403
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    test('should return 401 if user not authenticated', () => {
      mockReq.user = null;
      const middleware = requireAnyPermission('products:view');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
  
  describe('getRolePermissions()', () => {
    test('should return all permissions for owner role', () => {
      const ownerPerms = getRolePermissions('owner');
      
      expect(ownerPerms).toContain('products:view');
      expect(ownerPerms).toContain('products:delete');
      expect(ownerPerms).toContain('users:create');
      expect(ownerPerms).toContain('settings:update');
      expect(ownerPerms).toContain('reports:export');
      expect(ownerPerms.length).toBeGreaterThan(15);
    });
    
    test('should return limited permissions for viewer role', () => {
      const viewerPerms = getRolePermissions('viewer');
      
      expect(viewerPerms).toContain('products:view');
      expect(viewerPerms).toContain('batches:view');
      expect(viewerPerms).toContain('reports:view');
      expect(viewerPerms).toContain('profile:view');
      expect(viewerPerms).not.toContain('products:delete');
      expect(viewerPerms).not.toContain('users:create');
      expect(viewerPerms.length).toBeLessThan(10);
    });
    
    test('should return manager permissions', () => {
      const managerPerms = getRolePermissions('manager');
      
      expect(managerPerms).toContain('products:delete');
      expect(managerPerms).toContain('reports:export');
      expect(managerPerms).not.toContain('users:create');
      expect(managerPerms).not.toContain('settings:update');
    });
    
    test('should return staff permissions', () => {
      const staffPerms = getRolePermissions('staff');
      
      expect(staffPerms).toContain('products:create');
      expect(staffPerms).toContain('batches:update');
      expect(staffPerms).not.toContain('products:delete');
      expect(staffPerms).not.toContain('reports:export');
    });
    
    test('should return empty array for invalid role', () => {
      const invalidPerms = getRolePermissions('invalid');
      expect(invalidPerms).toEqual([]);
    });
    
    test('should return owner permissions for admin role (backward compatibility)', () => {
      const adminPerms = getRolePermissions('admin');
      const ownerPerms = getRolePermissions('owner');
      
      // Admin should have same permissions as owner
      expect(adminPerms).toEqual(ownerPerms);
      expect(adminPerms).toContain('users:create');
      expect(adminPerms).toContain('settings:update');
    });
  });
});
