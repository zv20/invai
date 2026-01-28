/**
 * Integration Tests for RBAC Role Enforcement
 * Tests permission enforcement on actual API endpoints
 * 
 * NOTE: These tests require the server to be running on localhost:3000
 * and the test user (admin/admin123) to exist in the database
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('RBAC Role Enforcement - Integration Tests', () => {
  let adminToken;
  let tokens = {};
  let testProductId;

  // Generate JWT tokens for each role for testing
  beforeAll(async () => {
    // Get admin token first
    const loginRes = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    if (loginRes.status === 200) {
      adminToken = loginRes.body.token;
    } else {
      console.warn('Could not login as admin - some tests may fail');
    }

    // Generate test tokens for each role
    // Using JWT_SECRET from environment (should match server)
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
    
    tokens.owner = jwt.sign(
      { id: 100, username: 'test_owner', role: 'owner' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    tokens.manager = jwt.sign(
      { id: 101, username: 'test_manager', role: 'manager' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    tokens.staff = jwt.sign(
      { id: 102, username: 'test_staff', role: 'staff' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    tokens.viewer = jwt.sign(
      { id: 103, username: 'test_viewer', role: 'viewer' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a test product using admin token
    const productRes = await request(BASE_URL)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken || tokens.owner}`)
      .send({
        name: 'RBAC Test Product',
        inhouse_number: 'RBAC-TEST-001',
        items_per_case: 12
      });
    
    if (productRes.status === 201) {
      testProductId = productRes.body.id;
    }
  });

  describe('Product Permissions', () => {
    describe('View Products (all roles)', () => {
      test('owner can view products', async () => {
        const res = await request(BASE_URL)
          .get('/api/products')
          .set('Authorization', `Bearer ${tokens.owner}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      test('manager can view products', async () => {
        const res = await request(BASE_URL)
          .get('/api/products')
          .set('Authorization', `Bearer ${tokens.manager}`);
        expect(res.statusCode).toBe(200);
      });

      test('staff can view products', async () => {
        const res = await request(BASE_URL)
          .get('/api/products')
          .set('Authorization', `Bearer ${tokens.staff}`);
        expect(res.statusCode).toBe(200);
      });

      test('viewer can view products', async () => {
        const res = await request(BASE_URL)
          .get('/api/products')
          .set('Authorization', `Bearer ${tokens.viewer}`);
        expect(res.statusCode).toBe(200);
      });

      test('unauthenticated request is rejected', async () => {
        const res = await request(BASE_URL).get('/api/products');
        expect(res.statusCode).toBe(401);
        expect(res.body.error.code).toBe('AUTH_REQUIRED');
      });
    });

    describe('Create Products (owner, manager, staff)', () => {
      test('owner can create products', async () => {
        const res = await request(BASE_URL)
          .post('/api/products')
          .set('Authorization', `Bearer ${tokens.owner}`)
          .send({ name: 'Owner Test Product', items_per_case: 6 });
        expect(res.statusCode).toBe(201);
        expect(res.body.name).toBe('Owner Test Product');
      });

      test('manager can create products', async () => {
        const res = await request(BASE_URL)
          .post('/api/products')
          .set('Authorization', `Bearer ${tokens.manager}`)
          .send({ name: 'Manager Test Product', items_per_case: 12 });
        expect(res.statusCode).toBe(201);
      });

      test('staff can create products', async () => {
        const res = await request(BASE_URL)
          .post('/api/products')
          .set('Authorization', `Bearer ${tokens.staff}`)
          .send({ name: 'Staff Test Product', items_per_case: 24 });
        expect(res.statusCode).toBe(201);
      });

      test('viewer CANNOT create products', async () => {
        const res = await request(BASE_URL)
          .post('/api/products')
          .set('Authorization', `Bearer ${tokens.viewer}`)
          .send({ name: 'Viewer Test Product', items_per_case: 6 });
        expect(res.statusCode).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });
    });

    describe('Delete Products (owner, manager only)', () => {
      test('staff CANNOT delete products', async () => {
        if (!testProductId) {
          console.warn('Skipping test - no test product created');
          return;
        }
        
        const res = await request(BASE_URL)
          .delete(`/api/products/${testProductId}`)
          .set('Authorization', `Bearer ${tokens.staff}`);
        expect(res.statusCode).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });

      test('viewer CANNOT delete products', async () => {
        if (!testProductId) {
          console.warn('Skipping test - no test product created');
          return;
        }
        
        const res = await request(BASE_URL)
          .delete(`/api/products/${testProductId}`)
          .set('Authorization', `Bearer ${tokens.viewer}`);
        expect(res.statusCode).toBe(403);
      });

      test('manager CAN delete products', async () => {
        // Create a product to delete
        const createRes = await request(BASE_URL)
          .post('/api/products')
          .set('Authorization', `Bearer ${tokens.owner}`)
          .send({ name: 'Delete Test Product', items_per_case: 1 });
        
        if (createRes.status === 201) {
          const res = await request(BASE_URL)
            .delete(`/api/products/${createRes.body.id}`)
            .set('Authorization', `Bearer ${tokens.manager}`);
          expect(res.statusCode).toBe(200);
        }
      });
    });
  });

  describe('Batch Permissions', () => {
    let testBatchId;

    beforeAll(async () => {
      if (testProductId) {
        // Create a test batch
        const batchRes = await request(BASE_URL)
          .post('/api/batches')
          .set('Authorization', `Bearer ${adminToken || tokens.owner}`)
          .send({
            product_id: testProductId,
            case_quantity: 10,
            location: 'TEST-A1'
          });
        
        if (batchRes.status === 201) {
          testBatchId = batchRes.body.id;
        }
      }
    });

    describe('View Batches (all roles)', () => {
      test('all roles can view batches', async () => {
        if (!testBatchId) {
          console.warn('Skipping test - no test batch created');
          return;
        }

        for (const role of ['owner', 'manager', 'staff', 'viewer']) {
          const res = await request(BASE_URL)
            .get(`/api/batches/${testBatchId}`)
            .set('Authorization', `Bearer ${tokens[role]}`);
          expect(res.statusCode).toBe(200);
        }
      });
    });

    describe('Create Batches (owner, manager, staff)', () => {
      test('viewer CANNOT create batches', async () => {
        if (!testProductId) {
          console.warn('Skipping test - no test product');
          return;
        }

        const res = await request(BASE_URL)
          .post('/api/batches')
          .set('Authorization', `Bearer ${tokens.viewer}`)
          .send({
            product_id: testProductId,
            case_quantity: 5,
            location: 'B1'
          });
        expect(res.statusCode).toBe(403);
      });

      test('staff CAN create batches', async () => {
        if (!testProductId) {
          console.warn('Skipping test - no test product');
          return;
        }

        const res = await request(BASE_URL)
          .post('/api/batches')
          .set('Authorization', `Bearer ${tokens.staff}`)
          .send({
            product_id: testProductId,
            case_quantity: 5,
            location: 'STAFF-C1'
          });
        expect(res.statusCode).toBe(201);
      });
    });

    describe('Delete Batches (owner, manager only)', () => {
      test('staff CANNOT delete batches', async () => {
        if (!testBatchId) {
          console.warn('Skipping test - no test batch');
          return;
        }

        const res = await request(BASE_URL)
          .delete(`/api/batches/${testBatchId}`)
          .set('Authorization', `Bearer ${tokens.staff}`);
        expect(res.statusCode).toBe(403);
      });
    });
  });

  describe('Report Permissions', () => {
    describe('Basic Reports (all roles)', () => {
      test('all roles can view expiration report', async () => {
        for (const role of ['owner', 'manager', 'staff', 'viewer']) {
          const res = await request(BASE_URL)
            .get('/api/reports/expiration')
            .set('Authorization', `Bearer ${tokens[role]}`);
          expect(res.statusCode).toBe(200);
        }
      });

      test('all roles can view low-stock report', async () => {
        const res = await request(BASE_URL)
          .get('/api/reports/low-stock')
          .set('Authorization', `Bearer ${tokens.viewer}`);
        expect(res.statusCode).toBe(200);
      });
    });

    describe('Cost Reports (owner, manager only)', () => {
      test('owner can view stock-value report', async () => {
        const res = await request(BASE_URL)
          .get('/api/reports/stock-value')
          .set('Authorization', `Bearer ${tokens.owner}`);
        expect(res.statusCode).toBe(200);
      });

      test('manager can view stock-value report', async () => {
        const res = await request(BASE_URL)
          .get('/api/reports/stock-value')
          .set('Authorization', `Bearer ${tokens.manager}`);
        expect(res.statusCode).toBe(200);
      });

      test('staff CANNOT view stock-value report', async () => {
        const res = await request(BASE_URL)
          .get('/api/reports/stock-value')
          .set('Authorization', `Bearer ${tokens.staff}`);
        expect(res.statusCode).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });

      test('viewer CANNOT view stock-value report', async () => {
        const res = await request(BASE_URL)
          .get('/api/reports/stock-value')
          .set('Authorization', `Bearer ${tokens.viewer}`);
        expect(res.statusCode).toBe(403);
      });
    });

    describe('Export Reports (owner, manager only)', () => {
      test('owner can export reports', async () => {
        const res = await request(BASE_URL)
          .get('/api/reports/export/products')
          .set('Authorization', `Bearer ${tokens.owner}`);
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
      });

      test('manager can export reports', async () => {
        const res = await request(BASE_URL)
          .get('/api/reports/export/products')
          .set('Authorization', `Bearer ${tokens.manager}`);
        expect(res.statusCode).toBe(200);
      });

      test('staff CANNOT export reports', async () => {
        const res = await request(BASE_URL)
          .get('/api/reports/export/products')
          .set('Authorization', `Bearer ${tokens.staff}`);
        expect(res.statusCode).toBe(403);
      });

      test('viewer CANNOT export reports', async () => {
        const res = await request(BASE_URL)
          .get('/api/reports/export/products')
          .set('Authorization', `Bearer ${tokens.viewer}`);
        expect(res.statusCode).toBe(403);
      });
    });
  });
});
